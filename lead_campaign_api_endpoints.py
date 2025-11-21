"""
Lead Upload & Campaign Management API Endpoints
Provides functionality for lead uploads, campaign creation, and call scheduling
"""

from flask import request, jsonify
from database import SessionLocal
from sqlalchemy import text
import csv
import io
import json
from datetime import datetime, timedelta
import re
import openpyxl  # For Excel file handling
import asyncio
from webhook_events import trigger_webhook_event
import logging
import uuid
import sys
import os

logger = logging.getLogger(__name__)

# Import funnel engine modules at module level to avoid duplicate imports
try:
    # Add project root to path
    project_root = os.path.dirname(__file__)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from backend.funnel_engine.models import Funnel, FunnelExecution, FunnelStatus, ExecutionStatus
    from backend.funnel_engine.enqueue import enqueue_for_execution

    FUNNEL_ENGINE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Funnel engine not available: {e}")
    FUNNEL_ENGINE_AVAILABLE = False


def trigger_funnels_for_lead(lead_id: str, lead_data: dict, user_id: str, db_session=None):
    """
    Trigger all active funnels configured for lead_created events

    This function looks up all active funnels with trigger_type = "lead_created"
    in their settings and starts a funnel execution for the newly created lead.

    Args:
        lead_id: UUID of the created lead
        lead_data: Dictionary with lead information (phone_number, email, name, etc.)
        user_id: User ID (multi-tenant isolation)
        db_session: Optional database session (creates new one if not provided)

    Returns:
        List of started execution IDs
    """
    # Check if funnel engine is available
    if not FUNNEL_ENGINE_AVAILABLE:
        logger.warning("Funnel engine not available, skipping funnel triggering")
        return []

    # Use provided session or create new one
    db = db_session if db_session else SessionLocal()
    close_db = db_session is None  # Only close if we created it

    try:
        # Look up all active funnels with lead_created trigger
        # Using raw SQL for JSONB query to find funnels with settings.trigger_type = "lead_created"
        result = db.execute(text("""
            SELECT id, name, settings
            FROM funnels
            WHERE user_id = :user_id
            AND status = 'active'
            AND (
                settings->>'trigger_type' = 'lead_created'
                OR settings->>'trigger_type' = 'landing_page'
            )
        """), {'user_id': user_id})

        matching_funnels = result.fetchall()

        if not matching_funnels:
            logger.debug(f"No active funnels with lead_created trigger for user {user_id}")
            return []

        logger.info(f"Found {len(matching_funnels)} funnels to trigger for lead {lead_id}")

        execution_ids = []

        for funnel_row in matching_funnels:
            funnel_id = funnel_row[0]
            funnel_name = funnel_row[1]

            try:
                # Create execution
                execution = FunnelExecution(
                    id=str(uuid.uuid4()),
                    funnel_id=funnel_id,
                    user_id=user_id,
                    lead_id=lead_id,  # Link to the lead
                    contact_data=lead_data,
                    context={'trigger': 'lead_created', 'source': lead_data.get('source', 'unknown')},
                    status=ExecutionStatus.ACTIVE,
                )

                db.add(execution)
                db.commit()
                db.refresh(execution)

                # Enqueue first stage
                queue_entry = enqueue_for_execution(db, execution.id)

                logger.info(f"✅ Funnel '{funnel_name}' triggered for lead {lead_id}: execution {execution.id}")
                execution_ids.append(execution.id)

            except Exception as e:
                logger.error(f"Failed to trigger funnel {funnel_id} for lead {lead_id}: {e}", exc_info=True)
                db.rollback()
                continue

        return execution_ids

    except Exception as e:
        logger.error(f"Error in trigger_funnels_for_lead: {e}", exc_info=True)
        return []
    finally:
        if close_db:
            db.close()


def setup_lead_campaign_endpoints(app):
    """
    Set up lead upload and campaign management API endpoints
    """

    # ============================================
    # Lead Upload API
    # ============================================

    @app.route('/api/user/leads/upload', methods=['POST'])
    def upload_leads():
        """
        Upload leads from CSV or Excel file
        Accepts: multipart/form-data with 'file' and optional 'campaign_id'
        Returns: Summary of uploaded leads, validation errors
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Check if file was uploaded
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided'}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            # Get optional campaign_id
            campaign_id = request.form.get('campaign_id', None)

            # Verify campaign belongs to user if provided
            if campaign_id:
                result = db.execute(text("""
                    SELECT id FROM campaigns
                    WHERE id = :campaign_id AND user_id = :user_id
                """), {'campaign_id': campaign_id, 'user_id': user_id})
                if not result.fetchone():
                    return jsonify({'error': 'Campaign not found'}), 404

            # Determine file type and parse
            file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

            leads_data = []
            errors = []

            if file_ext == 'csv':
                # Parse CSV
                stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
                csv_reader = csv.DictReader(stream)

                for row_num, row in enumerate(csv_reader, start=2):
                    try:
                        lead = validate_and_parse_lead(row, row_num)
                        leads_data.append(lead)
                    except ValueError as e:
                        errors.append({'row': row_num, 'error': str(e)})

            elif file_ext in ['xlsx', 'xls']:
                # Parse Excel
                workbook = openpyxl.load_workbook(file)
                sheet = workbook.active

                # Get headers from first row
                headers = [cell.value for cell in sheet[1]]

                for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                    try:
                        row_dict = dict(zip(headers, row))
                        lead = validate_and_parse_lead(row_dict, row_num)
                        leads_data.append(lead)
                    except ValueError as e:
                        errors.append({'row': row_num, 'error': str(e)})
            else:
                return jsonify({'error': 'Unsupported file format. Use CSV or Excel (.xlsx, .xls)'}), 400

            # Insert leads into database
            successful_imports = 0
            duplicate_skipped = 0
            created_lead_ids = []  # Track newly created leads for funnel triggering

            for lead in leads_data:
                try:
                    # Insert lead with RETURNING to get the ID
                    result = db.execute(text("""
                        INSERT INTO leads (
                            user_id, campaign_id, phone_number,
                            first_name, last_name, email, company,
                            metadata, source, status
                        ) VALUES (
                            :user_id, :campaign_id, :phone_number,
                            :first_name, :last_name, :email, :company,
                            CAST(:metadata AS jsonb), :source, :status
                        )
                        ON CONFLICT (user_id, phone_number, campaign_id) DO NOTHING
                        RETURNING id
                    """), {
                        'user_id': user_id,
                        'campaign_id': campaign_id,
                        'phone_number': lead['phone_number'],
                        'first_name': lead.get('first_name'),
                        'last_name': lead.get('last_name'),
                        'email': lead.get('email'),
                        'company': lead.get('company'),
                        'metadata': json.dumps(lead.get('metadata', {})),
                        'source': 'csv_upload',
                        'status': 'new'
                    })

                    lead_row = result.fetchone()
                    if lead_row:
                        lead_id = lead_row[0]
                        successful_imports += 1
                        created_lead_ids.append((lead_id, lead))
                        logger.info(f"Lead {lead_id} created: {lead['phone_number']}")
                    else:
                        duplicate_skipped += 1

                except Exception as e:
                    errors.append({
                        'phone': lead.get('phone_number'),
                        'error': f'Database error: {str(e)}'
                    })

            db.commit()

            # Trigger funnels for newly created leads (non-blocking, async)
            total_funnels_triggered = 0
            for lead_id, lead_data in created_lead_ids:
                try:
                    # Prepare contact data for funnel
                    contact_data = {
                        'phone_number': lead_data['phone_number'],
                        'first_name': lead_data.get('first_name'),
                        'last_name': lead_data.get('last_name'),
                        'email': lead_data.get('email'),
                        'company': lead_data.get('company'),
                        'source': 'csv_upload',
                        'metadata': lead_data.get('metadata', {})
                    }

                    # Trigger funnels (this is fast - just enqueues, doesn't wait)
                    execution_ids = trigger_funnels_for_lead(lead_id, contact_data, user_id, db)

                    if execution_ids:
                        total_funnels_triggered += len(execution_ids)
                        logger.info(f"Triggered {len(execution_ids)} funnels for lead {lead_id}")

                except Exception as e:
                    # Log but don't fail the upload if funnel triggering fails
                    logger.error(f"Failed to trigger funnels for lead {lead_id}: {e}", exc_info=True)

            if total_funnels_triggered > 0:
                logger.info(f"✅ Total funnels triggered: {total_funnels_triggered} across {len(created_lead_ids)} leads")

            # Update campaign lead count if campaign_id provided
            if campaign_id:
                db.execute(text("""
                    UPDATE campaigns
                    SET leads_total = (
                        SELECT COUNT(*) FROM leads WHERE campaign_id = :campaign_id
                    )
                    WHERE id = :campaign_id
                """), {'campaign_id': campaign_id})
                db.commit()

            return jsonify({
                'success': True,
                'summary': {
                    'total_rows': len(leads_data) + len(errors),
                    'successful_imports': successful_imports,
                    'duplicates_skipped': duplicate_skipped,
                    'validation_errors': len(errors)
                },
                'errors': errors[:50]  # Return first 50 errors
            })

        except Exception as e:
            db.rollback()
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
        finally:
            db.close()


    def validate_and_parse_lead(row, row_num):
        """
        Validate and parse a single lead row
        Returns: dict with validated lead data
        Raises: ValueError if validation fails
        """
        # Required field: phone_number
        phone = str(row.get('phone_number') or row.get('phone') or row.get('Phone') or row.get('Phone Number') or '').strip()
        if not phone:
            raise ValueError('Missing phone number')

        # Normalize phone number (remove non-digits except +)
        phone = re.sub(r'[^\d+]', '', phone)
        if not phone.startswith('+'):
            phone = '+1' + phone  # Default to US if no country code

        # Validate phone format
        if not re.match(r'^\+\d{10,15}$', phone):
            raise ValueError(f'Invalid phone number format: {phone}')

        # Optional fields
        first_name = str(row.get('first_name') or row.get('First Name') or '').strip()
        last_name = str(row.get('last_name') or row.get('Last Name') or '').strip()
        email = str(row.get('email') or row.get('Email') or '').strip()
        company = str(row.get('company') or row.get('Company') or '').strip()

        # Validate email if provided
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError(f'Invalid email format: {email}')

        # Collect all other fields as metadata
        metadata = {}
        known_fields = {'phone_number', 'phone', 'Phone', 'Phone Number',
                        'first_name', 'First Name', 'last_name', 'Last Name',
                        'email', 'Email', 'company', 'Company'}

        for key, value in row.items():
            if key not in known_fields and value:
                metadata[key] = str(value)

        return {
            'phone_number': phone,
            'first_name': first_name or None,
            'last_name': last_name or None,
            'email': email or None,
            'company': company or None,
            'metadata': metadata
        }


    # ============================================
    # Lead Management API
    # ============================================

    @app.route('/api/user/leads', methods=['GET', 'POST'])
    def manage_leads():
        """
        List leads (GET) or create a single lead (POST)
        POST is used for landing page/web form submissions
        """
        if request.method == 'GET':
            return list_leads()
        elif request.method == 'POST':
            return create_single_lead()

    def create_single_lead():
        """
        Create a single lead (for landing page/web form submissions)

        POST /api/user/leads
        Body: {
            phone_number: required,
            first_name?: optional,
            last_name?: optional,
            email?: optional,
            company?: optional,
            campaign_id?: optional,
            source?: optional (defaults to 'web_form'),
            metadata?: optional
        }
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            data = request.get_json()

            # Validate required field
            phone_number = data.get('phone_number', '').strip()
            if not phone_number:
                return jsonify({'error': 'phone_number is required'}), 400

            # Normalize phone number
            phone_number = re.sub(r'[^\d+]', '', phone_number)
            if not phone_number.startswith('+'):
                phone_number = '+1' + phone_number

            # Validate phone format
            if not re.match(r'^\+\d{10,15}$', phone_number):
                return jsonify({'error': f'Invalid phone number format: {phone_number}'}), 400

            # Optional fields
            first_name = data.get('first_name', '').strip() or None
            last_name = data.get('last_name', '').strip() or None
            email = data.get('email', '').strip() or None
            company = data.get('company', '').strip() or None
            campaign_id = data.get('campaign_id') or None
            source = data.get('source', 'web_form').strip()
            metadata = data.get('metadata', {})

            # Validate email if provided
            if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                return jsonify({'error': f'Invalid email format: {email}'}), 400

            # Verify campaign belongs to user if provided
            if campaign_id:
                result = db.execute(text("""
                    SELECT id FROM campaigns
                    WHERE id = :campaign_id AND user_id = :user_id
                """), {'campaign_id': campaign_id, 'user_id': user_id})
                if not result.fetchone():
                    return jsonify({'error': 'Campaign not found'}), 404

            # Insert lead
            result = db.execute(text("""
                INSERT INTO leads (
                    user_id, campaign_id, phone_number,
                    first_name, last_name, email, company,
                    metadata, source, status
                ) VALUES (
                    :user_id, :campaign_id, :phone_number,
                    :first_name, :last_name, :email, :company,
                    CAST(:metadata AS jsonb), :source, :status
                )
                ON CONFLICT (user_id, phone_number, campaign_id) DO UPDATE
                SET first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    email = EXCLUDED.email,
                    company = EXCLUDED.company,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, created_at = updated_at as is_new
            """), {
                'user_id': user_id,
                'campaign_id': campaign_id,
                'phone_number': phone_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'company': company,
                'metadata': json.dumps(metadata),
                'source': source,
                'status': 'new'
            })

            row = result.fetchone()
            lead_id = row[0]
            is_new_lead = row[1]

            db.commit()

            logger.info(f"Lead {lead_id} {'created' if is_new_lead else 'updated'}: {phone_number}")

            # Trigger funnels only for new leads
            funnels_triggered = 0
            if is_new_lead:
                try:
                    contact_data = {
                        'phone_number': phone_number,
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'company': company,
                        'source': source,
                        'metadata': metadata
                    }

                    execution_ids = trigger_funnels_for_lead(lead_id, contact_data, user_id, db)
                    funnels_triggered = len(execution_ids)

                    if funnels_triggered > 0:
                        logger.info(f"✅ Triggered {funnels_triggered} funnels for lead {lead_id}")

                except Exception as e:
                    logger.error(f"Failed to trigger funnels for lead {lead_id}: {e}", exc_info=True)

            return jsonify({
                'success': True,
                'lead_id': lead_id,
                'is_new': is_new_lead,
                'funnels_triggered': funnels_triggered,
                'message': 'Lead created successfully' if is_new_lead else 'Lead updated'
            }), 201 if is_new_lead else 200

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating lead: {e}", exc_info=True)
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    def list_leads():
        """
        List all leads with optional filtering
        Query params: campaign_id, status, search, page, limit
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Get query parameters
            campaign_id = request.args.get('campaign_id')
            status = request.args.get('status')
            search = request.args.get('search', '').strip()
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 50))
            offset = (page - 1) * limit

            # Build query
            where_clauses = ['user_id = :user_id']
            params = {'user_id': user_id, 'limit': limit, 'offset': offset}

            if campaign_id:
                where_clauses.append('campaign_id = :campaign_id')
                params['campaign_id'] = campaign_id

            if status:
                where_clauses.append('status = :status')
                params['status'] = status

            if search:
                where_clauses.append("""(
                    phone_number ILIKE :search OR
                    first_name ILIKE :search OR
                    last_name ILIKE :search OR
                    email ILIKE :search OR
                    company ILIKE :search
                )""")
                params['search'] = f'%{search}%'

            where_sql = ' AND '.join(where_clauses)

            # Get total count
            count_result = db.execute(text(f"""
                SELECT COUNT(*) FROM leads WHERE {where_sql}
            """), params)
            total = count_result.fetchone()[0]

            # Get leads
            result = db.execute(text(f"""
                SELECT
                    id, campaign_id, phone_number, first_name, last_name,
                    email, company, status, source, metadata,
                    last_called_at, times_called, last_call_status,
                    created_at, updated_at
                FROM leads
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """), params)

            leads = result.fetchall()

            return jsonify({
                'leads': [
                    {
                        'id': row[0],
                        'campaign_id': row[1],
                        'phone_number': row[2],
                        'first_name': row[3],
                        'last_name': row[4],
                        'email': row[5],
                        'company': row[6],
                        'status': row[7],
                        'source': row[8],
                        'metadata': row[9],
                        'last_called_at': row[10].isoformat() if row[10] else None,
                        'times_called': row[11],
                        'last_call_status': row[12],
                        'created_at': row[13].isoformat() if row[13] else None,
                        'updated_at': row[14].isoformat() if row[14] else None
                    }
                    for row in leads
                ],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()


    @app.route('/api/user/leads/<lead_id>', methods=['GET', 'PUT', 'DELETE'])
    def manage_lead(lead_id):
        """
        Get, update, or delete a specific lead
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Verify lead belongs to user
            result = db.execute(text("""
                SELECT id FROM leads WHERE id = :lead_id AND user_id = :user_id
            """), {'lead_id': lead_id, 'user_id': user_id})

            if not result.fetchone():
                return jsonify({'error': 'Lead not found'}), 404

            if request.method == 'GET':
                # Get lead details
                result = db.execute(text("""
                    SELECT
                        id, campaign_id, phone_number, first_name, last_name,
                        email, company, status, source, metadata,
                        last_called_at, times_called, last_call_status,
                        last_call_duration, created_at, updated_at
                    FROM leads
                    WHERE id = :lead_id AND user_id = :user_id
                """), {'lead_id': lead_id, 'user_id': user_id})

                row = result.fetchone()
                return jsonify({
                    'id': row[0],
                    'campaign_id': row[1],
                    'phone_number': row[2],
                    'first_name': row[3],
                    'last_name': row[4],
                    'email': row[5],
                    'company': row[6],
                    'status': row[7],
                    'source': row[8],
                    'metadata': row[9],
                    'last_called_at': row[10].isoformat() if row[10] else None,
                    'times_called': row[11],
                    'last_call_status': row[12],
                    'last_call_duration': row[13],
                    'created_at': row[14].isoformat() if row[14] else None,
                    'updated_at': row[15].isoformat() if row[15] else None
                })

            elif request.method == 'PUT':
                # Update lead
                data = request.get_json()

                update_fields = []
                params = {'lead_id': lead_id, 'user_id': user_id}

                allowed_updates = ['first_name', 'last_name', 'email', 'company', 'status', 'metadata']
                for field in allowed_updates:
                    if field in data:
                        update_fields.append(f"{field} = :{field}")
                        params[field] = json.dumps(data[field]) if field == 'metadata' else data[field]

                if not update_fields:
                    return jsonify({'error': 'No valid fields to update'}), 400

                db.execute(text(f"""
                    UPDATE leads
                    SET {', '.join(update_fields)}
                    WHERE id = :lead_id AND user_id = :user_id
                """), params)
                db.commit()

                # Trigger webhook event for lead update
                try:
                    asyncio.run(trigger_webhook_event('lead.updated', {
                        'lead_id': lead_id,
                        'updated_fields': list(data.keys()),
                        'status': data.get('status'),
                        'timestamp': datetime.utcnow().isoformat()
                    }, user_id))
                except Exception as e:
                    print(f"Warning: Failed to trigger lead.updated webhook: {e}")

                return jsonify({'success': True, 'message': 'Lead updated'})

            elif request.method == 'DELETE':
                # Delete lead
                db.execute(text("""
                    DELETE FROM leads
                    WHERE id = :lead_id AND user_id = :user_id
                """), {'lead_id': lead_id, 'user_id': user_id})
                db.commit()

                return jsonify({'success': True, 'message': 'Lead deleted'})

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()


    # ============================================
    # Campaign Management API
    # ============================================

    @app.route('/api/user/campaigns', methods=['GET', 'POST'])
    def manage_campaigns():
        """
        List all campaigns or create a new campaign
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            if request.method == 'GET':
                # List campaigns
                status = request.args.get('status')
                page = int(request.args.get('page', 1))
                limit = int(request.args.get('limit', 20))
                offset = (page - 1) * limit

                where_clause = 'user_id = :user_id'
                params = {'user_id': user_id, 'limit': limit, 'offset': offset}

                if status:
                    where_clause += ' AND status = :status'
                    params['status'] = status

                # Get total count
                count_result = db.execute(text(f"""
                    SELECT COUNT(*) FROM campaigns WHERE {where_clause}
                """), params)
                total = count_result.fetchone()[0]

                # Get campaigns
                result = db.execute(text(f"""
                    SELECT
                        id, name, description, status, agent_id,
                        scheduled_start, scheduled_end, actual_start, actual_end,
                        leads_total, leads_completed, leads_failed, leads_in_progress,
                        total_calls, successful_calls, failed_calls,
                        created_at, updated_at
                    FROM campaigns
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                """), params)

                campaigns = result.fetchall()

                return jsonify({
                    'campaigns': [
                        {
                            'id': row[0],
                            'name': row[1],
                            'description': row[2],
                            'status': row[3],
                            'agent_id': row[4],
                            'scheduled_start': row[5].isoformat() if row[5] else None,
                            'scheduled_end': row[6].isoformat() if row[6] else None,
                            'actual_start': row[7].isoformat() if row[7] else None,
                            'actual_end': row[8].isoformat() if row[8] else None,
                            'leads_total': row[9],
                            'leads_completed': row[10],
                            'leads_failed': row[11],
                            'leads_in_progress': row[12],
                            'total_calls': row[13],
                            'successful_calls': row[14],
                            'failed_calls': row[15],
                            'created_at': row[16].isoformat() if row[16] else None,
                            'updated_at': row[17].isoformat() if row[17] else None
                        }
                        for row in campaigns
                    ],
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total,
                        'pages': (total + limit - 1) // limit
                    }
                })

            elif request.method == 'POST':
                # Create new campaign
                data = request.get_json()

                # Validate required fields
                name = data.get('name', '').strip()
                if not name:
                    return jsonify({'error': 'Campaign name is required'}), 400

                agent_id = data.get('agent_id')

                # Verify agent belongs to user if provided
                if agent_id:
                    result = db.execute(text("""
                        SELECT id FROM agent_configs
                        WHERE id = :agent_id AND "userId" = :user_id
                    """), {'agent_id': agent_id, 'user_id': user_id})
                    if not result.fetchone():
                        return jsonify({'error': 'Agent not found'}), 404

                # Create campaign
                result = db.execute(text("""
                    INSERT INTO campaigns (
                        user_id, agent_id, name, description,
                        call_config, status
                    ) VALUES (
                        :user_id, :agent_id, :name, :description,
                        :call_config::jsonb, :status
                    )
                    RETURNING id
                """), {
                    'user_id': user_id,
                    'agent_id': agent_id,
                    'name': name,
                    'description': data.get('description', ''),
                    'call_config': json.dumps(data.get('call_config', {})),
                    'status': 'draft'
                })

                campaign_id = result.fetchone()[0]
                db.commit()

                return jsonify({
                    'success': True,
                    'campaign_id': campaign_id,
                    'message': 'Campaign created'
                }), 201

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()


    @app.route('/api/user/campaigns/<campaign_id>', methods=['GET', 'PUT', 'DELETE'])
    def manage_campaign(campaign_id):
        """
        Get, update, or delete a specific campaign
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Verify campaign belongs to user
            result = db.execute(text("""
                SELECT id FROM campaigns WHERE id = :campaign_id AND user_id = :user_id
            """), {'campaign_id': campaign_id, 'user_id': user_id})

            if not result.fetchone():
                return jsonify({'error': 'Campaign not found'}), 404

            if request.method == 'GET':
                # Get campaign details
                result = db.execute(text("""
                    SELECT
                        id, name, description, status, agent_id, call_config,
                        scheduled_start, scheduled_end, actual_start, actual_end,
                        leads_total, leads_completed, leads_failed, leads_in_progress,
                        total_calls, successful_calls, failed_calls,
                        total_duration_seconds, average_duration_seconds,
                        created_at, updated_at
                    FROM campaigns
                    WHERE id = :campaign_id AND user_id = :user_id
                """), {'campaign_id': campaign_id, 'user_id': user_id})

                row = result.fetchone()
                return jsonify({
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'status': row[3],
                    'agent_id': row[4],
                    'call_config': row[5],
                    'scheduled_start': row[6].isoformat() if row[6] else None,
                    'scheduled_end': row[7].isoformat() if row[7] else None,
                    'actual_start': row[8].isoformat() if row[8] else None,
                    'actual_end': row[9].isoformat() if row[9] else None,
                    'leads_total': row[10],
                    'leads_completed': row[11],
                    'leads_failed': row[12],
                    'leads_in_progress': row[13],
                    'total_calls': row[14],
                    'successful_calls': row[15],
                    'failed_calls': row[16],
                    'total_duration_seconds': row[17],
                    'average_duration_seconds': float(row[18]) if row[18] else 0,
                    'created_at': row[19].isoformat() if row[19] else None,
                    'updated_at': row[20].isoformat() if row[20] else None
                })

            elif request.method == 'PUT':
                # Update campaign
                data = request.get_json()

                update_fields = []
                params = {'campaign_id': campaign_id, 'user_id': user_id}

                allowed_updates = ['name', 'description', 'agent_id', 'status', 'call_config',
                                   'scheduled_start', 'scheduled_end']
                for field in allowed_updates:
                    if field in data:
                        if field == 'call_config':
                            update_fields.append(f"{field} = :{field}::jsonb")
                            params[field] = json.dumps(data[field])
                        else:
                            update_fields.append(f"{field} = :{field}")
                            params[field] = data[field]

                if not update_fields:
                    return jsonify({'error': 'No valid fields to update'}), 400

                db.execute(text(f"""
                    UPDATE campaigns
                    SET {', '.join(update_fields)}
                    WHERE id = :campaign_id AND user_id = :user_id
                """), params)
                db.commit()

                return jsonify({'success': True, 'message': 'Campaign updated'})

            elif request.method == 'DELETE':
                # Delete campaign (will cascade to campaign_calls and update leads)
                db.execute(text("""
                    DELETE FROM campaigns
                    WHERE id = :campaign_id AND user_id = :user_id
                """), {'campaign_id': campaign_id, 'user_id': user_id})
                db.commit()

                return jsonify({'success': True, 'message': 'Campaign deleted'})

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()


    @app.route('/api/user/campaigns/<campaign_id>/schedule', methods=['POST'])
    def schedule_campaign(campaign_id):
        """
        Schedule outbound calls for all leads in a campaign
        Creates campaign_calls records with scheduled times
        """
        user_id = app.get_current_user_id()
        db = SessionLocal()

        try:
            # Verify campaign belongs to user
            result = db.execute(text("""
                SELECT id, agent_id, status, call_config
                FROM campaigns
                WHERE id = :campaign_id AND user_id = :user_id
            """), {'campaign_id': campaign_id, 'user_id': user_id})

            campaign = result.fetchone()
            if not campaign:
                return jsonify({'error': 'Campaign not found'}), 404

            campaign_status = campaign[2]
            if campaign_status not in ['draft', 'paused']:
                return jsonify({'error': f'Cannot schedule campaign in {campaign_status} status'}), 400

            # Get schedule configuration from request
            data = request.get_json()
            scheduled_start = data.get('scheduled_start')  # ISO format datetime
            call_interval_minutes = int(data.get('call_interval_minutes', 2))  # Time between calls

            if not scheduled_start:
                return jsonify({'error': 'scheduled_start is required'}), 400

            start_time = datetime.fromisoformat(scheduled_start.replace('Z', '+00:00'))

            # Get all leads for this campaign that haven't been called yet
            result = db.execute(text("""
                SELECT id, phone_number
                FROM leads
                WHERE campaign_id = :campaign_id
                  AND status IN ('new', 'failed')
                ORDER BY created_at
            """), {'campaign_id': campaign_id})

            leads = result.fetchall()

            if not leads:
                return jsonify({'error': 'No leads found for this campaign'}), 400

            # Create campaign_calls for each lead
            scheduled_calls = []
            current_time = start_time

            for lead_id, phone_number in leads:
                # Check if call already scheduled
                existing = db.execute(text("""
                    SELECT id FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND lead_id = :lead_id
                """), {'campaign_id': campaign_id, 'lead_id': lead_id}).fetchone()

                if existing:
                    # Update existing
                    db.execute(text("""
                        UPDATE campaign_calls
                        SET scheduled_for = :scheduled_for, status = 'scheduled'
                        WHERE campaign_id = :campaign_id AND lead_id = :lead_id
                    """), {
                        'campaign_id': campaign_id,
                        'lead_id': lead_id,
                        'scheduled_for': current_time
                    })
                else:
                    # Create new
                    db.execute(text("""
                        INSERT INTO campaign_calls (
                            campaign_id, lead_id, scheduled_for, status
                        ) VALUES (
                            :campaign_id, :lead_id, :scheduled_for, 'scheduled'
                        )
                    """), {
                        'campaign_id': campaign_id,
                        'lead_id': lead_id,
                        'scheduled_for': current_time
                    })

                scheduled_calls.append({
                    'lead_id': lead_id,
                    'phone_number': phone_number,
                    'scheduled_for': current_time.isoformat()
                })

                # Increment time for next call
                current_time += timedelta(minutes=call_interval_minutes)

            # Update campaign status and timestamps
            db.execute(text("""
                UPDATE campaigns
                SET status = 'scheduled',
                    scheduled_start = :start_time,
                    scheduled_end = :end_time
                WHERE id = :campaign_id
            """), {
                'campaign_id': campaign_id,
                'start_time': start_time,
                'end_time': current_time
            })

            db.commit()

            return jsonify({
                'success': True,
                'message': f'Scheduled {len(scheduled_calls)} calls',
                'summary': {
                    'total_calls': len(scheduled_calls),
                    'start_time': start_time.isoformat(),
                    'end_time': current_time.isoformat(),
                    'duration_hours': round((current_time - start_time).total_seconds() / 3600, 2)
                },
                'scheduled_calls': scheduled_calls[:10]  # Return first 10 for preview
            })

        except Exception as e:
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()


    print("✅ Lead & Campaign API endpoints initialized")
    return app
