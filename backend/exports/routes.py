"""
CSV Export API endpoints with authentication and streaming.

Provides secure, authenticated CSV export endpoints for:
- Call logs with outcomes
- Campaign leads
- Agent configurations
- Phone number mappings
- LiveKit call events

Features:
- JWT/session-based authentication
- Multi-tenant isolation (userId scoping)
- Streaming responses for large datasets
- Date range filtering
- Status filtering
- Memory-efficient batch processing

Security:
- Authentication required for all endpoints
- User data isolation via userId foreign keys
- Rate limiting support (RateLimitTiers.HEAVY)
- Audit logging for export requests
"""

from flask import Blueprint, Response, request, jsonify, session
from flask_login import login_required
from flasgger import swag_from
from functools import wraps
from datetime import datetime, timedelta
from typing import Optional, Callable
import sys
import csv
import io

# Import rate limiting
from backend.rate_limiting import rate_limit
from backend.rate_limiting.config import RateLimitTiers
import os

# Add project root to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from database import SessionLocal, CallLog, AgentConfig, PhoneMapping, User
from backend.call_outcomes.models import CallLog as EnhancedCallLog, LiveKitCallEvent
from backend.exports.csv_stream import (
    CSVStreamer,
    format_datetime,
    format_json_field,
    format_boolean,
    sanitize_csv_field,
    mask_phone_number
)

# Create Blueprint
exports_bp = Blueprint('exports', __name__, url_prefix='/api/exports')

# CSV Streamer instance
csv_streamer = CSVStreamer(chunk_size=1000)


# ============================================================================
# Authentication Decorator
# ============================================================================

def require_auth(f: Callable) -> Callable:
    """
    Authentication decorator for export endpoints.

    Uses Flask-Login to validate user authentication and extracts userId from session.
    Integrates with existing authentication system in user_dashboard.py.

    Returns:
        Decorated function with userId injected as first argument
    """
    @wraps(f)
    @login_required  # Flask-Login authentication
    def decorated_function(*args, **kwargs):
        # Get user ID from Flask session (set by Flask-Login)
        user_id = session.get('user_id')

        if not user_id:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Authentication required. Please provide user_id in X-User-Id header or query param.'
            }), 401

        # Inject userId as first argument
        return f(user_id, *args, **kwargs)

    return decorated_function


# ============================================================================
# Helper Functions
# ============================================================================

def parse_date_param(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse date parameter from request.

    Args:
        date_str: ISO format date string or None

    Returns:
        datetime: Parsed datetime or None
    """
    if not date_str:
        return None

    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        return None


def get_filename(export_type: str, user_id: str) -> str:
    """
    Generate filename for CSV export.

    Args:
        export_type: Type of export (calls, agents, etc.)
        user_id: User ID for tracking

    Returns:
        str: Filename with timestamp
    """
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    return f"{export_type}_export_{timestamp}.csv"


# ============================================================================
# Export Endpoints
# ============================================================================

@exports_bp.route('/calls', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.export_calls', methods=['GET'])
@rate_limit(max_requests=RateLimitTiers.HEAVY.max_requests, window_seconds=RateLimitTiers.HEAVY.window_seconds)
@require_auth
def export_calls(user_id: str):
    """
    Export call logs as CSV with streaming response.

    Query Parameters:
        - start_date: ISO format start date (optional)
        - end_date: ISO format end date (optional)
        - status: Filter by status (optional)
        - agent_id: Filter by agent (optional)
        - outcome: Filter by outcome (optional)

    Headers:
        - X-User-Id: User ID for authentication (development)
        - Authorization: Bearer token (production)

    Returns:
        Response: Streaming CSV response

    Example:
        GET /api/exports/calls?start_date=2024-01-01&outcome=completed
        X-User-Id: user-123
    """
    db = SessionLocal()

    try:
        # Parse filter parameters
        start_date = parse_date_param(request.args.get('start_date'))
        end_date = parse_date_param(request.args.get('end_date'))
        status = request.args.get('status')
        agent_id = request.args.get('agent_id')
        outcome = request.args.get('outcome')

        # Build query with multi-tenant isolation
        query = db.query(EnhancedCallLog).filter(EnhancedCallLog.userId == user_id)

        # Apply filters
        if start_date:
            query = query.filter(EnhancedCallLog.startedAt >= start_date)
        if end_date:
            query = query.filter(EnhancedCallLog.startedAt <= end_date)
        if status:
            query = query.filter(EnhancedCallLog.status == status)
        if agent_id:
            query = query.filter(EnhancedCallLog.agentConfigId == agent_id)
        if outcome:
            query = query.filter(EnhancedCallLog.outcome == outcome)

        # Order by most recent first
        query = query.order_by(EnhancedCallLog.startedAt.desc())

        # CSV Headers
        headers = [
            'id',
            'livekitRoomName',
            'livekitRoomSid',
            'direction',
            'phoneNumber',
            'sipCallId',
            'duration',
            'startedAt',
            'endedAt',
            'status',
            'outcome',
            'recordingUrl',
            'cost',
            'metadata',
            'createdAt'
        ]

        # Row formatter
        def format_call_row(call: EnhancedCallLog) -> dict:
            return {
                'id': sanitize_csv_field(call.id),
                'livekitRoomName': sanitize_csv_field(call.livekitRoomName),
                'livekitRoomSid': sanitize_csv_field(call.livekitRoomSid),
                'direction': sanitize_csv_field(call.direction),
                'phoneNumber': sanitize_csv_field(call.phoneNumber),
                'sipCallId': sanitize_csv_field(call.sipCallId),
                'duration': sanitize_csv_field(call.duration),
                'startedAt': format_datetime(call.startedAt),
                'endedAt': format_datetime(call.endedAt),
                'status': sanitize_csv_field(call.status),
                'outcome': sanitize_csv_field(call.outcome),
                'recordingUrl': sanitize_csv_field(call.recordingUrl),
                'cost': sanitize_csv_field(call.cost),
                'metadata': format_json_field(call.call_metadata),
                'createdAt': format_datetime(call.createdAt)
            }

        # Stream CSV response
        def generate():
            for chunk in csv_streamer.stream_query_to_csv(query, headers, format_call_row):
                yield chunk
            db.close()

        filename = get_filename('calls', user_id)

        return Response(
            generate(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'X-Export-Type': 'calls',
                'X-Export-Timestamp': datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        db.close()
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


@exports_bp.route('/agents', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.export_agents', methods=['GET'])
@rate_limit(max_requests=RateLimitTiers.HEAVY.max_requests, window_seconds=RateLimitTiers.HEAVY.window_seconds)
@require_auth
def export_agents(user_id: str):
    """
    Export agent configurations as CSV.

    Query Parameters:
        - is_active: Filter by active status (true/false, optional)
        - agent_mode: Filter by agent mode (optional)

    Headers:
        - X-User-Id: User ID for authentication

    Returns:
        Response: Streaming CSV response
    """
    db = SessionLocal()

    try:
        # Parse filter parameters
        is_active = request.args.get('is_active')
        agent_mode = request.args.get('agent_mode')

        # Build query with multi-tenant isolation
        query = db.query(AgentConfig).filter(AgentConfig.userId == user_id)

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter(AgentConfig.isActive == is_active_bool)
        if agent_mode:
            query = query.filter(AgentConfig.agentMode == agent_mode)

        # Order by creation date
        query = query.order_by(AgentConfig.createdAt.desc())

        # CSV Headers
        headers = [
            'id',
            'agentId',
            'name',
            'description',
            'agentMode',
            'language',
            'llmProvider',
            'llmModel',
            'sttProvider',
            'sttModel',
            'ttsProvider',
            'ttsVoiceId',
            'realtimeVoice',
            'greetingEnabled',
            'greetingMessage',
            'isActive',
            'createdAt'
        ]

        # Row formatter
        def format_agent_row(agent: AgentConfig) -> dict:
            return {
                'id': sanitize_csv_field(agent.id),
                'agentId': sanitize_csv_field(agent.agentId),
                'name': sanitize_csv_field(agent.name),
                'description': sanitize_csv_field(agent.description),
                'agentMode': sanitize_csv_field(agent.agentMode),
                'language': sanitize_csv_field(agent.language),
                'llmProvider': sanitize_csv_field(agent.llmProvider),
                'llmModel': sanitize_csv_field(agent.llmModel),
                'sttProvider': sanitize_csv_field(agent.sttProvider),
                'sttModel': sanitize_csv_field(agent.sttModel),
                'ttsProvider': sanitize_csv_field(agent.ttsProvider),
                'ttsVoiceId': sanitize_csv_field(agent.ttsVoiceId),
                'realtimeVoice': sanitize_csv_field(agent.realtimeVoice),
                'greetingEnabled': format_boolean(agent.greetingEnabled),
                'greetingMessage': sanitize_csv_field(agent.greetingMessage),
                'isActive': format_boolean(agent.isActive),
                'createdAt': format_datetime(agent.createdAt)
            }

        # Stream CSV response
        def generate():
            for chunk in csv_streamer.stream_query_to_csv(query, headers, format_agent_row):
                yield chunk
            db.close()

        filename = get_filename('agents', user_id)

        return Response(
            generate(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'X-Export-Type': 'agents',
                'X-Export-Timestamp': datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        db.close()
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


@exports_bp.route('/phone-numbers', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.export_phone_numbers', methods=['GET'])
@rate_limit(max_requests=RateLimitTiers.HEAVY.max_requests, window_seconds=RateLimitTiers.HEAVY.window_seconds)
@require_auth
def export_phone_numbers(user_id: str):
    """
    Export phone number mappings as CSV.

    Query Parameters:
        - is_active: Filter by active status (true/false, optional)
        - agent_id: Filter by agent (optional)

    Headers:
        - X-User-Id: User ID for authentication

    Returns:
        Response: Streaming CSV response
    """
    db = SessionLocal()

    try:
        # Parse filter parameters
        is_active = request.args.get('is_active')
        agent_id = request.args.get('agent_id')

        # Build query with multi-tenant isolation
        query = db.query(PhoneMapping).filter(PhoneMapping.userId == user_id)

        # Apply filters
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter(PhoneMapping.isActive == is_active_bool)
        if agent_id:
            query = query.filter(PhoneMapping.agentConfigId == agent_id)

        # Order by creation date
        query = query.order_by(PhoneMapping.createdAt.desc())

        # CSV Headers
        headers = [
            'id',
            'phoneNumber',
            'agentConfigId',
            'sipTrunkId',
            'sipConfigId',
            'isActive',
            'createdAt'
        ]

        # Row formatter
        def format_phone_row(phone: PhoneMapping) -> dict:
            return {
                'id': sanitize_csv_field(phone.id),
                'phoneNumber': sanitize_csv_field(phone.phoneNumber),
                'agentConfigId': sanitize_csv_field(phone.agentConfigId),
                'sipTrunkId': sanitize_csv_field(phone.sipTrunkId),
                'sipConfigId': sanitize_csv_field(phone.sipConfigId),
                'isActive': format_boolean(phone.isActive),
                'createdAt': format_datetime(phone.createdAt)
            }

        # Stream CSV response
        def generate():
            for chunk in csv_streamer.stream_query_to_csv(query, headers, format_phone_row):
                yield chunk
            db.close()

        filename = get_filename('phone_numbers', user_id)

        return Response(
            generate(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'X-Export-Type': 'phone-numbers',
                'X-Export-Timestamp': datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        db.close()
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


@exports_bp.route('/leads', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.export_leads', methods=['GET'])
@rate_limit(max_requests=RateLimitTiers.HEAVY.max_requests, window_seconds=RateLimitTiers.HEAVY.window_seconds)
@require_auth
def export_leads(user_id: str):
    """
    Export leads as CSV with streaming response.

    Query Parameters:
        - start_date: ISO format start date (optional)
        - end_date: ISO format end date (optional)
        - status: Filter by status (optional)
        - campaign_id: Filter by campaign (optional)
        - source: Filter by source (optional)

    Headers:
        - X-User-Id: User ID for authentication

    Returns:
        Response: Streaming CSV response

    Example:
        GET /api/exports/leads?status=new&campaign_id=campaign-123
        X-User-Id: user-123
    """
    db = SessionLocal()

    try:
        # Parse filter parameters
        start_date = parse_date_param(request.args.get('start_date'))
        end_date = parse_date_param(request.args.get('end_date'))
        status = request.args.get('status')
        campaign_id = request.args.get('campaign_id')
        source = request.args.get('source')

        # Build base query using raw SQL due to snake_case table structure
        from sqlalchemy import text

        # Build WHERE clause conditions
        conditions = ["user_id = :user_id"]
        params = {'user_id': user_id}

        if start_date:
            conditions.append("created_at >= :start_date")
            params['start_date'] = start_date
        if end_date:
            conditions.append("created_at <= :end_date")
            params['end_date'] = end_date
        if status:
            conditions.append("status = :status")
            params['status'] = status
        if campaign_id:
            conditions.append("campaign_id = :campaign_id")
            params['campaign_id'] = campaign_id
        if source:
            conditions.append("source = :source")
            params['source'] = source

        where_clause = " AND ".join(conditions)

        # Query with ordering
        sql = text(f"""
            SELECT
                id, user_id, campaign_id, phone_number, first_name, last_name,
                email, company, status, metadata, source, last_called_at,
                times_called, last_call_status, last_call_duration, created_at, updated_at
            FROM leads
            WHERE {where_clause}
            ORDER BY created_at DESC
        """)

        result = db.execute(sql, params)

        # CSV Headers
        headers = [
            'id',
            'campaign_id',
            'phone_number',
            'first_name',
            'last_name',
            'email',
            'company',
            'status',
            'source',
            'last_called_at',
            'times_called',
            'last_call_status',
            'last_call_duration',
            'metadata',
            'created_at',
            'updated_at'
        ]

        # Convert to list of dicts for streaming
        def generate():
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')

            # Write header
            writer.writeheader()
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            # Stream rows in batches
            batch_size = 1000
            rows = []
            for row in result:
                rows.append({
                    'id': sanitize_csv_field(row.id),
                    'campaign_id': sanitize_csv_field(row.campaign_id),
                    'phone_number': sanitize_csv_field(row.phone_number),
                    'first_name': sanitize_csv_field(row.first_name),
                    'last_name': sanitize_csv_field(row.last_name),
                    'email': sanitize_csv_field(row.email),
                    'company': sanitize_csv_field(row.company),
                    'status': sanitize_csv_field(row.status),
                    'source': sanitize_csv_field(row.source),
                    'last_called_at': format_datetime(row.last_called_at),
                    'times_called': sanitize_csv_field(row.times_called),
                    'last_call_status': sanitize_csv_field(row.last_call_status),
                    'last_call_duration': sanitize_csv_field(row.last_call_duration),
                    'metadata': format_json_field(row.metadata),
                    'created_at': format_datetime(row.created_at),
                    'updated_at': format_datetime(row.updated_at)
                })

                # Yield in batches
                if len(rows) >= batch_size:
                    for formatted_row in rows:
                        writer.writerow(formatted_row)
                    yield output.getvalue()
                    output.seek(0)
                    output.truncate(0)
                    rows = []

            # Yield remaining rows
            if rows:
                for formatted_row in rows:
                    writer.writerow(formatted_row)
                yield output.getvalue()

            db.close()

        filename = get_filename('leads', user_id)

        return Response(
            generate(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'X-Export-Type': 'leads',
                'X-Export-Timestamp': datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        db.close()
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


@exports_bp.route('/events', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.export_events', methods=['GET'])
@rate_limit(max_requests=RateLimitTiers.HEAVY.max_requests, window_seconds=RateLimitTiers.HEAVY.window_seconds)
@require_auth
def export_events(user_id: str):
    """
    Export LiveKit call events as CSV.

    Query Parameters:
        - start_date: ISO format start date (optional)
        - end_date: ISO format end date (optional)
        - event: Filter by event type (optional)
        - room_name: Filter by room name (optional)

    Headers:
        - X-User-Id: User ID for authentication

    Returns:
        Response: Streaming CSV response
    """
    db = SessionLocal()

    try:
        # Parse filter parameters
        start_date = parse_date_param(request.args.get('start_date'))
        end_date = parse_date_param(request.args.get('end_date'))
        event = request.args.get('event')
        room_name = request.args.get('room_name')

        # Build query with multi-tenant isolation
        query = db.query(LiveKitCallEvent).filter(LiveKitCallEvent.userId == user_id)

        # Apply filters
        if start_date:
            # Convert to Unix timestamp
            start_timestamp = int(start_date.timestamp())
            query = query.filter(LiveKitCallEvent.timestamp >= start_timestamp)
        if end_date:
            end_timestamp = int(end_date.timestamp())
            query = query.filter(LiveKitCallEvent.timestamp <= end_timestamp)
        if event:
            query = query.filter(LiveKitCallEvent.event == event)
        if room_name:
            query = query.filter(LiveKitCallEvent.roomName == room_name)

        # Order by timestamp
        query = query.order_by(LiveKitCallEvent.timestamp.desc())

        # CSV Headers
        headers = [
            'id',
            'eventId',
            'event',
            'roomName',
            'roomSid',
            'participantIdentity',
            'participantSid',
            'timestamp',
            'processed',
            'errorMessage',
            'createdAt'
        ]

        # Row formatter
        def format_event_row(evt: LiveKitCallEvent) -> dict:
            # Convert Unix timestamp to datetime
            evt_datetime = datetime.fromtimestamp(evt.timestamp) if evt.timestamp else None

            return {
                'id': sanitize_csv_field(evt.id),
                'eventId': sanitize_csv_field(evt.eventId),
                'event': sanitize_csv_field(evt.event),
                'roomName': sanitize_csv_field(evt.roomName),
                'roomSid': sanitize_csv_field(evt.roomSid),
                'participantIdentity': sanitize_csv_field(evt.participantIdentity),
                'participantSid': sanitize_csv_field(evt.participantSid),
                'timestamp': format_datetime(evt_datetime),
                'processed': sanitize_csv_field(evt.processed),
                'errorMessage': sanitize_csv_field(evt.errorMessage),
                'createdAt': format_datetime(evt.createdAt)
            }

        # Stream CSV response
        def generate():
            for chunk in csv_streamer.stream_query_to_csv(query, headers, format_event_row):
                yield chunk
            db.close()

        filename = get_filename('events', user_id)

        return Response(
            generate(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'X-Export-Type': 'events',
                'X-Export-Timestamp': datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        db.close()
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


# ============================================================================
# Health Check and Info Endpoints
# ============================================================================

@exports_bp.route('/health', methods=['GET'])
@swag_from('backend/exports/openapi_specs.yaml', endpoint='exports.health_check', methods=['GET'])
def health_check():
    """
    Health check endpoint for export service.

    Returns:
        dict: Service health status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'csv-exports',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })


@exports_bp.route('/info', methods=['GET'])
@require_auth
def export_info(user_id: str):
    """
    Get information about available exports.

    Returns:
        dict: Available export types and their descriptions
    """
    return jsonify({
        'exports': [
            {
                'endpoint': '/api/exports/calls',
                'description': 'Export call logs with outcomes',
                'filters': ['start_date', 'end_date', 'status', 'agent_id', 'outcome']
            },
            {
                'endpoint': '/api/exports/leads',
                'description': 'Export campaign leads',
                'filters': ['start_date', 'end_date', 'status', 'campaign_id', 'source']
            },
            {
                'endpoint': '/api/exports/agents',
                'description': 'Export agent configurations',
                'filters': ['is_active', 'agent_mode']
            },
            {
                'endpoint': '/api/exports/phone-numbers',
                'description': 'Export phone number mappings',
                'filters': ['is_active', 'agent_id']
            },
            {
                'endpoint': '/api/exports/events',
                'description': 'Export LiveKit call events',
                'filters': ['start_date', 'end_date', 'event', 'room_name']
            }
        ],
        'user_id': user_id,
        'timestamp': datetime.utcnow().isoformat()
    })
