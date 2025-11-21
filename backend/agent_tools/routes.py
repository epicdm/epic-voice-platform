"""
Agent Tools API Routes
Flask routes for knowledge base, FAQs, and tool configuration
"""

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import traceback

import sys
import os
# Add parent directory to path to import from root models.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from database import SessionLocal
from database import User
from .knowledge_base import KnowledgeBaseService
from .models import AgentTool, ToolTemplate

# Create blueprint
agent_tools_bp = Blueprint('agent_tools', __name__, url_prefix='/api/user/agents')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt', 'csv'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_id_from_email():
    """Get user ID from X-User-Email header"""
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return None, jsonify({
            'success': False,
            'error': {'message': 'Authentication required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return None, jsonify({
                'success': False,
                'error': {'message': 'User not found', 'code': 'USER_NOT_FOUND'}
            }), 404
        return str(user.id), None, None
    finally:
        db.close()


# =============================================================================
# KNOWLEDGE BASE - DOCUMENTS
# =============================================================================

@agent_tools_bp.route('/<agent_id>/knowledge-base/documents', methods=['POST'])
def upload_document(agent_id):
    """
    Upload a document to the knowledge base

    Request:
        Multipart form data with 'file' field

    Response:
        {
            "success": true,
            "data": {
                "id": "doc-uuid",
                "filename": "document.pdf",
                "status": "processing",
                ...
            }
        }
    """
    try:
        # Get user ID from email header
        user_id, error_response, status_code = get_user_id_from_email()
        if error_response:
            return error_response, status_code

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': {'message': 'No file provided', 'code': 'NO_FILE'}
            }), 400

        file = request.files['file']

        # Check if file was selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': {'message': 'No file selected', 'code': 'NO_FILE'}
            }), 400

        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': {
                    'message': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}',
                    'code': 'INVALID_FILE_TYPE'
                }
            }), 400

        # Read file content
        filename = secure_filename(file.filename)
        file_content = file.read()
        file_type = filename.rsplit('.', 1)[1].lower()

        # Upload and process document
        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            document = kb_service.upload_document(
                agent_config_id=agent_id,
                user_id=user_id,
                file_content=file_content,
                filename=filename,
                file_type=file_type
            )

            return jsonify({
                'success': True,
                'data': {
                    'id': document.id,
                    'filename': document.filename,
                    'filetype': document.filetype,
                    'filesize': document.filesize,
                    'status': document.status,
                    'chunkcount': document.chunkcount,
                    'createdat': document.createdat.isoformat() if document.createdat else None
                }
            }), 201
        finally:
            db.close()

    except Exception as e:
        print(f"Error uploading document: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'UPLOAD_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/documents', methods=['GET'])
def get_documents(agent_id):
    """
    Get all documents for an agent

    Response:
        {
            "success": true,
            "data": [
                {
                    "id": "doc-uuid",
                    "filename": "document.pdf",
                    "status": "completed",
                    ...
                }
            ]
        }
    """
    try:
        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            documents = kb_service.get_documents(agent_id)

            return jsonify({
                'success': True,
                'data': [{
                    'id': doc.id,
                    'filename': doc.filename,
                    'filetype': doc.filetype,
                    'filesize': doc.filesize,
                    'status': doc.status,
                    'chunkcount': doc.chunkcount,
                    'summary': doc.summary,
                    'isactive': doc.isactive,
                    'createdat': doc.createdat.isoformat() if doc.createdat else None
                } for doc in documents]
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error fetching documents: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'FETCH_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/documents/<document_id>', methods=['DELETE'])
def delete_document(agent_id, document_id):
    """
    Delete a document from the knowledge base

    Response:
        {
            "success": true,
            "message": "Document deleted successfully"
        }
    """
    try:
        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            success = kb_service.delete_document(document_id)

            if success:
                return jsonify({
                    'success': True,
                    'message': 'Document deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Document not found', 'code': 'NOT_FOUND'}
                }), 404
        finally:
            db.close()

    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'DELETE_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/statistics', methods=['GET'])
def get_kb_statistics(agent_id):
    """
    Get knowledge base statistics

    Response:
        {
            "success": true,
            "data": {
                "documents_count": 12,
                "faqs_count": 45,
                "total_chunks": 237
            }
        }
    """
    try:
        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            stats = kb_service.get_statistics(agent_id)

            return jsonify({
                'success': True,
                'data': stats
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error fetching statistics: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'FETCH_FAILED'}
        }), 500


# =============================================================================
# KNOWLEDGE BASE - FAQs
# =============================================================================

@agent_tools_bp.route('/<agent_id>/knowledge-base/faqs', methods=['POST'])
def create_faq(agent_id):
    """
    Create a new FAQ entry

    Request:
        {
            "question": "What are your business hours?",
            "answer": "We're open 9 AM - 5 PM EST, Monday-Friday",
            "category": "General"
        }

    Response:
        {
            "success": true,
            "data": {
                "id": "faq-uuid",
                "question": "...",
                "answer": "...",
                ...
            }
        }
    """
    try:
        data = request.get_json()

        # Get user ID from email header
        user_id, error_response, status_code = get_user_id_from_email()
        if error_response:
            return error_response, status_code

        # Validate required fields
        if not data.get('question') or not data.get('answer'):
            return jsonify({
                'success': False,
                'error': {'message': 'Question and answer are required', 'code': 'MISSING_FIELDS'}
            }), 400

        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            faq = kb_service.create_faq(
                agent_config_id=agent_id,
                user_id=user_id,
                question=data['question'],
                answer=data['answer'],
                category=data.get('category')
            )

            return jsonify({
                'success': True,
                'data': {
                    'id': faq.id,
                    'question': faq.question,
                    'answer': faq.answer,
                    'category': faq.category,
                    'isactive': faq.isactive,
                    'createdat': faq.createdat.isoformat() if faq.createdat else None
                }
            }), 201
        finally:
            db.close()

    except Exception as e:
        print(f"Error creating FAQ: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'CREATE_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/faqs', methods=['GET'])
def get_faqs(agent_id):
    """
    Get all FAQs for an agent

    Query params:
        ?category=General (optional)

    Response:
        {
            "success": true,
            "data": [
                {
                    "id": "faq-uuid",
                    "question": "...",
                    "answer": "...",
                    ...
                }
            ]
        }
    """
    try:
        category = request.args.get('category')

        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            faqs = kb_service.get_faqs(agent_id, category=category)

            return jsonify({
                'success': True,
                'data': [{
                    'id': faq.id,
                    'question': faq.question,
                    'answer': faq.answer,
                    'category': faq.category,
                    'isactive': faq.isactive,
                    'priority': faq.priority,
                    'timesused': faq.timesused,
                    'createdat': faq.createdat.isoformat() if faq.createdat else None
                } for faq in faqs]
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error fetching FAQs: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'FETCH_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/faqs/<faq_id>', methods=['PUT'])
def update_faq(agent_id, faq_id):
    """
    Update an existing FAQ entry

    Request:
        {
            "question": "Updated question?",
            "answer": "Updated answer",
            "category": "Updated category",
            "is_active": true
        }

    Response:
        {
            "success": true,
            "data": { ... }
        }
    """
    try:
        data = request.get_json()

        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            faq = kb_service.update_faq(
                faq_id=faq_id,
                question=data.get('question'),
                answer=data.get('answer'),
                category=data.get('category'),
                is_active=data.get('is_active')
            )

            if faq:
                return jsonify({
                    'success': True,
                    'data': {
                        'id': faq.id,
                        'question': faq.question,
                        'answer': faq.answer,
                        'category': faq.category,
                        'isactive': faq.isactive,
                        'updatedat': faq.updatedat.isoformat() if faq.updatedat else None
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': 'FAQ not found', 'code': 'NOT_FOUND'}
                }), 404
        finally:
            db.close()

    except Exception as e:
        print(f"Error updating FAQ: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'UPDATE_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/faqs/<faq_id>', methods=['DELETE'])
def delete_faq(agent_id, faq_id):
    """
    Delete an FAQ entry

    Response:
        {
            "success": true,
            "message": "FAQ deleted successfully"
        }
    """
    try:
        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            success = kb_service.delete_faq(faq_id)

            if success:
                return jsonify({
                    'success': True,
                    'message': 'FAQ deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': 'FAQ not found', 'code': 'NOT_FOUND'}
                }), 404
        finally:
            db.close()

    except Exception as e:
        print(f"Error deleting FAQ: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'DELETE_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/knowledge-base/faqs/bulk-import', methods=['POST'])
def bulk_import_faqs(agent_id):
    """
    Bulk import FAQs

    Request:
        {
            "faqs": [
                {
                    "question": "...",
                    "answer": "...",
                    "category": "..."
                },
                ...
            ]
        }

    Response:
        {
            "success": true,
            "data": {
                "imported_count": 25,
                "faqs": [...]
            }
        }
    """
    try:
        data = request.get_json()

        # Get user ID from email header
        user_id, error_response, status_code = get_user_id_from_email()
        if error_response:
            return error_response, status_code

        if not data.get('faqs') or not isinstance(data['faqs'], list):
            return jsonify({
                'success': False,
                'error': {'message': 'Invalid FAQs data', 'code': 'INVALID_DATA'}
            }), 400

        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            created_faqs = kb_service.bulk_import_faqs(
                agent_config_id=agent_id,
                user_id=user_id,
                faqs_data=data['faqs']
            )

            return jsonify({
                'success': True,
                'data': {
                    'imported_count': len(created_faqs),
                    'faqs': [{
                        'id': faq.id,
                        'question': faq.question,
                        'answer': faq.answer,
                        'category': faq.category
                    } for faq in created_faqs]
                }
            }), 201
        finally:
            db.close()

    except Exception as e:
        print(f"Error bulk importing FAQs: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'IMPORT_FAILED'}
        }), 500


# =============================================================================
# KNOWLEDGE BASE - SEARCH (used by agent at runtime)
# =============================================================================

@agent_tools_bp.route('/<agent_id>/knowledge-base/search', methods=['POST'])
def search_knowledge_base(agent_id):
    """
    Search knowledge base for relevant information

    Request:
        {
            "query": "What are your business hours?",
            "max_results": 5,
            "call_log_id": "call-uuid" (optional)
        }

    Response:
        {
            "success": true,
            "data": {
                "results": [
                    {
                        "source_type": "faq",
                        "source_name": "FAQ: Business Hours",
                        "content": "We're open 9 AM - 5 PM EST...",
                        "relevance_score": 0.9
                    },
                    ...
                ]
            }
        }
    """
    try:
        data = request.get_json()

        if not data.get('query'):
            return jsonify({
                'success': False,
                'error': {'message': 'Query is required', 'code': 'MISSING_QUERY'}
            }), 400

        db = SessionLocal()
        try:
            kb_service = KnowledgeBaseService(db)
            results = kb_service.search_knowledge_base(
                agent_config_id=agent_id,
                query=data['query'],
                max_results=data.get('max_results', 5),
                call_log_id=data.get('call_log_id')
            )

            return jsonify({
                'success': True,
                'data': {
                    'results': results,
                    'count': len(results)
                }
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error searching knowledge base: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'SEARCH_FAILED'}
        }), 500


# =============================================================================
# EMAIL FOLLOW-UP
# =============================================================================

@agent_tools_bp.route('/<agent_id>/email-followup', methods=['POST'])
def send_email_followup(agent_id):
    """
    Send follow-up email after call

    Request:
        {
            "to": "customer@example.com",
            "subject": "Thank you for your call",
            "body": "We appreciate...",
            "from_email": "agent@epic.dm" (optional),
            "reply_to": "user@company.com" (optional, user receives replies),
            "bcc": "user@company.com" (optional, user gets copy of email),
            "call_data": {...} (optional)
        }

        OR for template-based emails:
        {
            "to": "customer@example.com",
            "template": "call_summary",
            "template_data": {
                "customer_name": "John Doe",
                "call_duration": "3 minutes",
                "agent_name": "Sales Agent",
                "summary": "Discussed pricing..."
            },
            "reply_to": "user@company.com" (optional),
            "bcc": "user@company.com" (optional)
        }

    Response:
        {
            "success": true,
            "data": {
                "message_id": "abc123",
                "to": "customer@example.com",
                "sent_at": "2025-11-20T00:30:00"
            }
        }
    """
    try:
        # Get user ID from email header
        user_id, error_response, status_code = get_user_id_from_email()
        if error_response:
            return error_response, status_code

        data = request.get_json()

        # Validate required fields
        if not data.get('to'):
            return jsonify({
                'success': False,
                'error': {'message': 'Recipient email (to) is required', 'code': 'MISSING_RECIPIENT'}
            }), 400

        # Check if using template or direct email
        is_template = 'template' in data

        if is_template:
            if not data.get('template_data'):
                return jsonify({
                    'success': False,
                    'error': {'message': 'template_data is required when using templates', 'code': 'MISSING_TEMPLATE_DATA'}
                }), 400
        else:
            if not data.get('subject') or not data.get('body'):
                return jsonify({
                    'success': False,
                    'error': {'message': 'subject and body are required', 'code': 'MISSING_FIELDS'}
                }), 400

        # Get agent's email tool configuration
        db = SessionLocal()
        try:
            email_tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == 'email'
            ).first()

            if not email_tool or not email_tool.isenabled:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Email tool not enabled for this agent', 'code': 'TOOL_NOT_ENABLED'}
                }), 400

            # Get webhook URL from tool config
            config = email_tool.config or {}
            webhook_url = config.get('n8n_webhook_url')

            if not webhook_url:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Email workflow not configured. Please set up n8n webhook URL.', 'code': 'NO_WEBHOOK_URL'}
                }), 400

            # Import email service
            from .email_followup import EmailFollowupService

            # Initialize service (will use SMTP from environment variables)
            service = EmailFollowupService()

            # Send email via SMTP (direct send, no n8n required)
            if is_template:
                # For templates, render them first then send
                template_data = data['template_data']
                templates = {
                    'call_summary': {
                        'subject': 'Thank you for your call',
                        'body': f'''Hi {template_data.get("customer_name", "there")},

Thank you for speaking with {template_data.get("agent_name", "us")} today.

Call Summary:
Duration: {template_data.get("call_duration", "N/A")}
{template_data.get("summary", "")}

If you have any questions, feel free to reach out!

Best regards,
{template_data.get("agent_name", "The Team")}'''
                    },
                    'appointment_confirmation': {
                        'subject': 'Appointment Confirmed',
                        'body': f'''Hi {template_data.get("customer_name", "there")},

Your appointment has been confirmed for {template_data.get("appointment_time", "N/A")}.

{template_data.get("details", "")}

Looking forward to speaking with you!

Best regards,
{template_data.get("company_name", "The Team")}'''
                    }
                }

                template_name = data['template']
                if template_name in templates:
                    template_config = templates[template_name]
                    result = service.send_via_smtp(
                        to_email=data['to'],
                        subject=template_config['subject'],
                        body=template_config['body'],
                        from_email=data.get('from_email'),
                        reply_to=data.get('reply_to'),
                        bcc=data.get('bcc')
                    )
                else:
                    result = {
                        'success': False,
                        'error': f'Unknown template: {template_name}'
                    }
            else:
                result = service.send_via_smtp(
                    to_email=data['to'],
                    subject=data['subject'],
                    body=data['body'],
                    from_email=data.get('from_email'),
                    reply_to=data.get('reply_to'),
                    bcc=data.get('bcc')
                )

            if result['success']:
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': result.get('error', 'Email send failed'), 'code': 'EMAIL_SEND_FAILED'}
                }), 500

        finally:
            db.close()

    except Exception as e:
        print(f"Error sending email follow-up: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'EMAIL_FOLLOWUP_ERROR'}
        }), 500


@agent_tools_bp.route('/<agent_id>/calendar-booking', methods=['POST'])
def book_appointment(agent_id):
    """
    Book an appointment via n8n calendar workflow

    Request body:
        {
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "appointment_date": "2025-11-25",
            "appointment_time": "14:00",
            "duration_minutes": 30,
            "notes": "Initial consultation",
            "phone_number": "+1234567890"
        }

    Response:
        {
            "success": true,
            "data": {
                "booking_id": "abc123",
                "confirmation_sent": true,
                "calendar_link": "https://..."
            }
        }
    """
    try:
        from .calendar_booking import CalendarBookingService

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': {'message': 'Request body is required', 'code': 'MISSING_BODY'}
            }), 400

        # Validate required fields
        required_fields = ['customer_name', 'customer_email', 'appointment_date', 'appointment_time']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': {
                    'message': f'Missing required fields: {", ".join(missing_fields)}',
                    'code': 'MISSING_FIELDS'
                }
            }), 400

        db = SessionLocal()
        try:
            # Get calendar tool configuration
            calendar_tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == 'calendar',
                AgentTool.isenabled == True
            ).first()

            if not calendar_tool:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Calendar booking tool not enabled for this agent', 'code': 'TOOL_NOT_ENABLED'}
                }), 404

            # Get n8n webhook URL from tool config
            webhook_url = calendar_tool.config.get('n8n_webhook_url')
            if not webhook_url:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Calendar webhook URL not configured', 'code': 'WEBHOOK_NOT_CONFIGURED'}
                }), 400

            # Initialize calendar service
            service = CalendarBookingService(webhook_url)

            # Book appointment
            result = service.book_appointment(
                customer_name=data['customer_name'],
                customer_email=data['customer_email'],
                appointment_date=data['appointment_date'],
                appointment_time=data['appointment_time'],
                duration_minutes=data.get('duration_minutes', 30),
                notes=data.get('notes'),
                phone_number=data.get('phone_number')
            )

            if result.get('success'):
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': result.get('error', 'Booking failed'), 'code': 'BOOKING_FAILED'}
                }), 500

        finally:
            db.close()

    except Exception as e:
        print(f"Error booking appointment: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'CALENDAR_BOOKING_ERROR'}
        }), 500


@agent_tools_bp.route('/<agent_id>/sms-followup', methods=['POST'])
def send_sms_followup(agent_id):
    """
    Send SMS follow-up via n8n workflow

    Request body:
        {
            "to_number": "+1234567890",
            "message": "Thanks for calling! Your appointment is confirmed.",
            "from_number": "+0987654321"  // optional
        }

    Or use a template:
        {
            "to_number": "+1234567890",
            "template": "appointment_reminder",
            "template_data": {
                "customer_name": "John",
                "appointment_time": "2PM tomorrow",
                "company_name": "Epic Voice"
            }
        }

    Response:
        {
            "success": true,
            "data": {
                "message_id": "SM123abc",
                "to": "+1234567890",
                "status": "sent"
            }
        }
    """
    try:
        from .sms_followup import SMSFollowupService

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': {'message': 'Request body is required', 'code': 'MISSING_BODY'}
            }), 400

        # Validate required fields
        if not data.get('to_number'):
            return jsonify({
                'success': False,
                'error': {'message': 'Missing required field: to_number', 'code': 'MISSING_FIELD'}
            }), 400

        # Check if using template or direct message
        is_template = 'template' in data
        if not is_template and not data.get('message'):
            return jsonify({
                'success': False,
                'error': {'message': 'Either message or template is required', 'code': 'MISSING_CONTENT'}
            }), 400

        db = SessionLocal()
        try:
            # Get SMS tool configuration
            sms_tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == 'sms',
                AgentTool.isenabled == True
            ).first()

            if not sms_tool:
                return jsonify({
                    'success': False,
                    'error': {'message': 'SMS tool not enabled for this agent', 'code': 'TOOL_NOT_ENABLED'}
                }), 404

            # Get n8n webhook URL from tool config
            webhook_url = sms_tool.config.get('n8n_webhook_url')
            if not webhook_url:
                return jsonify({
                    'success': False,
                    'error': {'message': 'SMS webhook URL not configured', 'code': 'WEBHOOK_NOT_CONFIGURED'}
                }), 400

            # Initialize SMS service
            service = SMSFollowupService(webhook_url)

            # Send SMS
            if is_template:
                result = service.send_template_sms(
                    to_number=data['to_number'],
                    template=data['template'],
                    template_data=data.get('template_data', {}),
                    from_number=data.get('from_number')
                )
            else:
                result = service.send_sms(
                    to_number=data['to_number'],
                    message=data['message'],
                    from_number=data.get('from_number')
                )

            if result.get('success'):
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': result.get('error', 'SMS send failed'), 'code': 'SMS_SEND_FAILED'}
                }), 500

        finally:
            db.close()

    except Exception as e:
        print(f"Error sending SMS follow-up: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'SMS_FOLLOWUP_ERROR'}
        }), 500


@agent_tools_bp.route('/<agent_id>/human-handoff', methods=['POST'])
def request_handoff(agent_id):
    """
    Request human handoff during AI agent call

    Request body:
        {
            "room_name": "sip-1234567890__abc123",
            "customer_name": "John Doe",
            "customer_phone": "+1234567890",
            "reason": "Customer requested human assistance",
            "agent_summary": "Customer asking about refund policy"
        }

    Response:
        {
            "success": true,
            "data": {
                "handoff_id": "ho_123456789",
                "method": "notification",
                "estimated_wait_minutes": 2,
                "message": "Support team has been notified..."
            }
        }
    """
    try:
        from .human_handoff import HumanHandoffService

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': {'message': 'Request body is required', 'code': 'MISSING_BODY'}
            }), 400

        # Validate required fields
        if not data.get('room_name'):
            return jsonify({
                'success': False,
                'error': {'message': 'Missing required field: room_name', 'code': 'MISSING_FIELD'}
            }), 400

        db = SessionLocal()
        try:
            # Get human handoff tool configuration
            handoff_tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == 'human_handoff',
                AgentTool.isenabled == True
            ).first()

            if not handoff_tool:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Human handoff tool not enabled for this agent', 'code': 'TOOL_NOT_ENABLED'}
                }), 404

            # Get configuration
            config = handoff_tool.config
            if not config:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Human handoff not configured', 'code': 'NOT_CONFIGURED'}
                }), 400

            # Initialize handoff service
            service = HumanHandoffService(config)

            # Request handoff
            result = service.request_handoff(
                room_name=data['room_name'],
                customer_name=data.get('customer_name'),
                customer_phone=data.get('customer_phone'),
                reason=data.get('reason'),
                agent_summary=data.get('agent_summary')
            )

            if result.get('success'):
                return jsonify({
                    'success': True,
                    'data': result
                })
            else:
                return jsonify({
                    'success': False,
                    'error': {'message': result.get('error', 'Handoff failed'), 'code': 'HANDOFF_FAILED'}
                }), 500

        finally:
            db.close()

    except Exception as e:
        print(f"Error requesting human handoff: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'HANDOFF_ERROR'}
        }), 500


# =============================================================================
# TOOL CONFIGURATION
# =============================================================================

@agent_tools_bp.route('/<agent_id>/tools', methods=['GET'])
def get_agent_tools(agent_id):
    """
    Get all tools configured for an agent

    Response:
        {
            "success": true,
            "data": [
                {
                    "id": "tool-uuid",
                    "tooltype": "knowledge_base",
                    "toolname": "Knowledge Base",
                    "isenabled": true,
                    "config": {...}
                },
                ...
            ]
        }
    """
    try:
        db = SessionLocal()
        try:
            tools = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id
            ).all()

            return jsonify({
                'success': True,
                'data': [{
                    'id': tool.id,
                    'tooltype': tool.tooltype,
                    'toolname': tool.toolname,
                    'isenabled': tool.isenabled,
                    'config': tool.config or {}
                } for tool in tools]
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error fetching tools: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'FETCH_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/tools/<tool_type>/toggle', methods=['PUT'])
def toggle_tool(agent_id, tool_type):
    """
    Enable or disable a tool

    Request:
        {
            "enabled": true
        }

    Response:
        {
            "success": true,
            "data": {...}
        }
    """
    try:
        data = request.get_json()
        user_id = request.headers.get('X-User-Id', 'test-user-id')

        db = SessionLocal()
        try:
            # Find or create tool
            tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == tool_type
            ).first()

            if not tool:
                # Create new tool entry
                tool = AgentTool(
                    agentconfigid=agent_id,
                    userid=user_id,
                    tooltype=tool_type,
                    toolname=tool_type.replace('_', ' ').title(),
                    isenabled=data.get('enabled', True)
                )
                db.add(tool)
            else:
                # Update existing tool
                tool.isenabled = data.get('enabled', True)

            db.commit()

            return jsonify({
                'success': True,
                'data': {
                    'id': tool.id,
                    'tooltype': tool.tooltype,
                    'isenabled': tool.isenabled
                }
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error toggling tool: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'TOGGLE_FAILED'}
        }), 500


@agent_tools_bp.route('/<agent_id>/tools/<tool_type>/config', methods=['PUT'])
def update_tool_config(agent_id, tool_type):
    """
    Update tool configuration

    Request:
        {
            "config": {
                "some_setting": "value",
                ...
            }
        }

    Response:
        {
            "success": true,
            "data": {...}
        }
    """
    try:
        data = request.get_json()

        db = SessionLocal()
        try:
            tool = db.query(AgentTool).filter(
                AgentTool.agentconfigid == agent_id,
                AgentTool.tooltype == tool_type
            ).first()

            if not tool:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Tool not found', 'code': 'NOT_FOUND'}
                }), 404

            tool.config = data.get('config', {})
            db.commit()

            return jsonify({
                'success': True,
                'data': {
                    'id': tool.id,
                    'tooltype': tool.tooltype,
                    'config': tool.config
                }
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error updating tool config: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'UPDATE_FAILED'}
        }), 500


# =============================================================================
# TOOL TEMPLATES
# =============================================================================

# Create separate blueprint for public tool templates
tool_templates_bp = Blueprint('tool_templates', __name__, url_prefix='/api/tool-templates')

@tool_templates_bp.route('', methods=['GET'])
def get_tool_templates():
    """
    Get all available tool templates

    Response:
        {
            "success": true,
            "data": [
                {
                    "id": "template-uuid",
                    "name": "Appointment Scheduler",
                    "description": "...",
                    "category": "scheduling",
                    "icon": "📅",
                    "tools": [...]
                },
                ...
            ]
        }
    """
    try:
        db = SessionLocal()
        try:
            templates = db.query(ToolTemplate).filter(
                ToolTemplate.ispublic == True
            ).all()

            return jsonify({
                'success': True,
                'data': [{
                    'id': template.id,
                    'name': template.name,
                    'description': template.description,
                    'category': template.category,
                    'icon': template.icon,
                    'tools': template.tools,
                    'usagecount': template.usagecount
                } for template in templates]
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error fetching templates: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'FETCH_FAILED'}
        }), 500


@tool_templates_bp.route('/<template_id>/apply/<agent_id>', methods=['POST'])
def apply_template(template_id, agent_id):
    """
    Apply a tool template to an agent

    Response:
        {
            "success": true,
            "data": {
                "applied_tools": [...]
            }
        }
    """
    try:
        user_id = request.headers.get('X-User-Id', 'test-user-id')

        db = SessionLocal()
        try:
            # Get template
            template = db.query(ToolTemplate).filter_by(id=template_id).first()
            if not template:
                return jsonify({
                    'success': False,
                    'error': {'message': 'Template not found', 'code': 'NOT_FOUND'}
                }), 404

            # Apply tools from template
            applied_tools = []
            for tool_config in template.tools:
                tool = AgentTool(
                    agentconfigid=agent_id,
                    userid=user_id,
                    tooltype=tool_config['toolType'],
                    toolname=tool_config.get('toolName', tool_config['toolType'].replace('_', ' ').title()),
                    isenabled=True,
                    config=tool_config.get('config', {})
                )
                db.add(tool)
                applied_tools.append(tool_config['toolType'])

            # Update usage count
            template.usagecount += 1

            db.commit()

            return jsonify({
                'success': True,
                'data': {
                    'applied_tools': applied_tools,
                    'template_name': template.name
                }
            })
        finally:
            db.close()

    except Exception as e:
        print(f"Error applying template: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'APPLY_FAILED'}
        }), 500


def register_agent_tools_routes(app):
    """Register agent tools blueprints with Flask app"""
    app.register_blueprint(agent_tools_bp)
    app.register_blueprint(tool_templates_bp)
    print("✅ Agent Tools API registered")
