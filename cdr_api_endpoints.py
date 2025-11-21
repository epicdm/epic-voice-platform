"""
Asterisk CDR Integration API Endpoints
Provides endpoints for syncing and querying Call Detail Records from Magnus Billing
"""
from flask import jsonify, request
import logging
from typing import Optional
from datetime import datetime, timedelta
from integrations.cdr_sync import CDRSyncService
from database import SessionLocal
from sqlalchemy import text
import threading
import os

logger = logging.getLogger(__name__)

# Track ongoing sync operations per user
cdr_sync_status = {}
cdr_sync_lock = threading.Lock()


def setup_cdr_endpoints(app):
    """
    Register CDR integration endpoints with Flask app

    Endpoints:
    - POST /api/cdr/sync - Trigger CDR sync
    - GET /api/cdr/sync/status - Get sync status
    - GET /api/cdr - Query CDR records
    - GET /api/cdr/:id - Get single CDR
    - GET /api/cdr/stats - Get CDR statistics
    """

    @app.route('/api/cdr/sync', methods=['POST'])
    def trigger_cdr_sync():
        """
        Trigger Magnus Billing CDR sync

        Request Body:
        {
            "start_date": "2025-10-20T00:00:00Z",  // Optional
            "end_date": "2025-10-30T23:59:59Z",    // Optional
            "batch_size": 100,                      // Optional, default 100
            "max_records": null                     // Optional, null = all
        }

        Response:
        {
            "success": true,
            "sync_id": "cdr_sync_123abc",
            "message": "CDR sync started"
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Check if sync already in progress
        with cdr_sync_lock:
            if user_id in cdr_sync_status and cdr_sync_status[user_id].get('status') == 'in_progress':
                return jsonify({
                    'success': False,
                    'error': 'CDR sync already in progress'
                }), 409

        # Get sync parameters
        data = request.json or {}

        # Parse dates
        start_date = None
        end_date = None

        if data.get('start_date'):
            try:
                start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid start_date format. Use ISO 8601 format.'
                }), 400

        if data.get('end_date'):
            try:
                end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid end_date format. Use ISO 8601 format.'
                }), 400

        batch_size = data.get('batch_size', 100)
        max_records = data.get('max_records')

        # Get Magnus credentials from environment
        magnus_api_key = os.getenv('MAGNUS_API_KEY')
        magnus_secret_key = os.getenv('MAGNUS_SECRET_KEY')
        magnus_base_url = os.getenv('MAGNUS_BASE_URL')

        if not all([magnus_api_key, magnus_secret_key, magnus_base_url]):
            return jsonify({
                'success': False,
                'error': 'Magnus Billing credentials not configured on server'
            }), 500

        # Start sync in background thread
        sync_id = f"cdr_sync_{user_id}_{int(__import__('time').time())}"

        def run_sync():
            """Background CDR sync task"""
            with cdr_sync_lock:
                cdr_sync_status[user_id] = {
                    'sync_id': sync_id,
                    'status': 'in_progress',
                    'started_at': datetime.now().isoformat()
                }

            try:
                # Create sync service
                sync_service = CDRSyncService(
                    user_id=user_id,
                    magnus_api_key=magnus_api_key,
                    magnus_secret_key=magnus_secret_key,
                    magnus_base_url=magnus_base_url
                )

                # Run sync
                results = sync_service.sync_cdrs(
                    start_date=start_date,
                    end_date=end_date,
                    batch_size=batch_size,
                    max_records=max_records
                )

                # Update status
                with cdr_sync_lock:
                    cdr_sync_status[user_id] = {
                        'sync_id': sync_id,
                        'status': 'completed',
                        'started_at': cdr_sync_status[user_id]['started_at'],
                        'completed_at': datetime.now().isoformat(),
                        'results': results
                    }

            except Exception as e:
                logger.error(f"CDR sync failed for user {user_id}: {e}")
                with cdr_sync_lock:
                    cdr_sync_status[user_id] = {
                        'sync_id': sync_id,
                        'status': 'failed',
                        'started_at': cdr_sync_status[user_id]['started_at'],
                        'error': str(e)
                    }

        # Start background thread
        thread = threading.Thread(target=run_sync, daemon=True)
        thread.start()

        return jsonify({
            'success': True,
            'sync_id': sync_id,
            'message': 'CDR sync started in background'
        })

    @app.route('/api/cdr/sync/status', methods=['GET'])
    def get_cdr_sync_status():
        """
        Get current CDR sync status

        Response:
        {
            "sync_id": "cdr_sync_123abc",
            "status": "in_progress",  // in_progress, completed, failed
            "started_at": "2025-10-30T12:00:00",
            "results": {...}  // Only present when completed
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        with cdr_sync_lock:
            status = cdr_sync_status.get(user_id)

        if not status:
            return jsonify({
                'status': 'idle',
                'message': 'No CDR sync has been run yet'
            })

        return jsonify(status)

    @app.route('/api/cdr', methods=['GET'])
    def query_cdrs():
        """
        Query CDR records with filters

        Query Parameters:
        - limit: Maximum records (default: 50, max: 500)
        - offset: Records to skip (default: 0)
        - start_date: Filter by calldate >= start_date
        - end_date: Filter by calldate <= end_date
        - outcome: Filter by outcome (completed, no_answer, busy, failed)
        - src: Filter by source number
        - dst: Filter by destination number

        Response:
        {
            "total": 150,
            "limit": 50,
            "offset": 0,
            "cdrs": [...]
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Parse query parameters
        limit = min(int(request.args.get('limit', 50)), 500)
        offset = int(request.args.get('offset', 0))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        outcome = request.args.get('outcome')
        src = request.args.get('src')
        dst = request.args.get('dst')

        db = SessionLocal()

        try:
            # Build query
            conditions = ['user_id = :user_id']
            params = {'user_id': user_id}

            if start_date:
                conditions.append('calldate >= :start_date')
                params['start_date'] = start_date

            if end_date:
                conditions.append('calldate <= :end_date')
                params['end_date'] = end_date

            if outcome:
                conditions.append('outcome = :outcome')
                params['outcome'] = outcome

            if src:
                conditions.append('src = :src')
                params['src'] = src

            if dst:
                conditions.append('dst = :dst')
                params['dst'] = dst

            where_clause = ' AND '.join(conditions)

            # Count total
            count_result = db.execute(
                text(f"""
                    SELECT COUNT(*) FROM asterisk_cdrs
                    WHERE {where_clause}
                """),
                params
            ).fetchone()

            total = count_result[0] if count_result else 0

            # Fetch CDRs
            cdrs_result = db.execute(
                text(f"""
                    SELECT
                        id, uniqueid, calldate, src, dst,
                        duration, billsec, disposition, outcome,
                        cost, accountcode, created_at
                    FROM asterisk_cdrs
                    WHERE {where_clause}
                    ORDER BY calldate DESC
                    LIMIT :limit OFFSET :offset
                """),
                {**params, 'limit': limit, 'offset': offset}
            ).fetchall()

            cdrs = [
                {
                    'id': row[0],
                    'uniqueid': row[1],
                    'calldate': row[2].isoformat() if row[2] else None,
                    'src': row[3],
                    'dst': row[4],
                    'duration': row[5],
                    'billsec': row[6],
                    'disposition': row[7],
                    'outcome': row[8],
                    'cost': float(row[9]) if row[9] else 0.0,
                    'accountcode': row[10],
                    'created_at': row[11].isoformat() if row[11] else None
                }
                for row in cdrs_result
            ]

            return jsonify({
                'total': total,
                'limit': limit,
                'offset': offset,
                'cdrs': cdrs
            })

        finally:
            db.close()

    @app.route('/api/cdr/<cdr_id>', methods=['GET'])
    def get_cdr(cdr_id):
        """
        Get single CDR by ID

        Response:
        {
            "id": "...",
            "uniqueid": "...",
            "calldate": "...",
            ...
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()

        try:
            result = db.execute(
                text("""
                    SELECT
                        id, uniqueid, accountcode, calldate,
                        src, dst, dcontext, clid, channel, dstchannel,
                        duration, billsec, disposition, outcome,
                        cost, description, magnus_cdr_id,
                        synced_at, created_at, updated_at
                    FROM asterisk_cdrs
                    WHERE id = :id AND user_id = :user_id
                    LIMIT 1
                """),
                {'id': cdr_id, 'user_id': user_id}
            ).fetchone()

            if not result:
                return jsonify({'error': 'CDR not found'}), 404

            cdr = {
                'id': result[0],
                'uniqueid': result[1],
                'accountcode': result[2],
                'calldate': result[3].isoformat() if result[3] else None,
                'src': result[4],
                'dst': result[5],
                'dcontext': result[6],
                'clid': result[7],
                'channel': result[8],
                'dstchannel': result[9],
                'duration': result[10],
                'billsec': result[11],
                'disposition': result[12],
                'outcome': result[13],
                'cost': float(result[14]) if result[14] else 0.0,
                'description': result[15],
                'magnus_cdr_id': result[16],
                'synced_at': result[17].isoformat() if result[17] else None,
                'created_at': result[18].isoformat() if result[18] else None,
                'updated_at': result[19].isoformat() if result[19] else None
            }

            return jsonify(cdr)

        finally:
            db.close()

    @app.route('/api/cdr/stats', methods=['GET'])
    def get_cdr_stats():
        """
        Get CDR statistics

        Query Parameters:
        - start_date: Filter start date
        - end_date: Filter end date

        Response:
        {
            "total_calls": 150,
            "total_duration": 45000,
            "total_cost": 12.50,
            "by_outcome": {
                "completed": 120,
                "no_answer": 20,
                "busy": 5,
                "failed": 5
            }
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        db = SessionLocal()

        try:
            # Build query
            conditions = ['user_id = :user_id']
            params = {'user_id': user_id}

            if start_date:
                conditions.append('calldate >= :start_date')
                params['start_date'] = start_date

            if end_date:
                conditions.append('calldate <= :end_date')
                params['end_date'] = end_date

            where_clause = ' AND '.join(conditions)

            # Get aggregate stats
            stats_result = db.execute(
                text(f"""
                    SELECT
                        COUNT(*) as total_calls,
                        COALESCE(SUM(duration), 0) as total_duration,
                        COALESCE(SUM(cost), 0) as total_cost
                    FROM asterisk_cdrs
                    WHERE {where_clause}
                """),
                params
            ).fetchone()

            # Get outcome breakdown
            outcome_result = db.execute(
                text(f"""
                    SELECT outcome, COUNT(*) as count
                    FROM asterisk_cdrs
                    WHERE {where_clause}
                    GROUP BY outcome
                """),
                params
            ).fetchall()

            by_outcome = {row[0]: row[1] for row in outcome_result}

            stats = {
                'total_calls': stats_result[0] if stats_result else 0,
                'total_duration': int(stats_result[1]) if stats_result else 0,
                'total_cost': float(stats_result[2]) if stats_result else 0.0,
                'by_outcome': by_outcome
            }

            return jsonify(stats)

        finally:
            db.close()

    logger.info("✅ CDR integration endpoints registered")
    return app
