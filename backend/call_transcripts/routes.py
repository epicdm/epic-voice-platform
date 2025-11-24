"""
Call Transcript API Routes

REST endpoints for transcript retrieval and management.

Endpoints:
- GET /api/transcripts/call/<call_id> - Get transcript for a specific call
- GET /api/transcripts/<transcript_id> - Get transcript by ID
- GET /api/transcripts - List user's transcripts with pagination
- POST /api/transcripts - Create new transcript
- POST /api/transcripts/<transcript_id>/segments - Add segments to transcript
- PUT /api/transcripts/<transcript_id>/complete - Mark transcript as completed
- DELETE /api/transcripts/<transcript_id> - Delete transcript
"""

import logging
from flask import Blueprint, jsonify, request, g
from typing import Optional

from database import SessionLocal
from .service import CallTranscriptService

logger = logging.getLogger(__name__)

# Create blueprint
transcripts_bp = Blueprint('transcripts', __name__, url_prefix='/api/transcripts')

# Initialize service
transcript_service = CallTranscriptService()


def get_user_id() -> str:
    """
    Extract user ID from request context.

    Returns:
        User identifier
    """
    # Check Flask g context (set by auth middleware)
    if hasattr(g, 'user_id') and g.user_id:
        return str(g.user_id)

    # Check query parameter (for testing)
    user_id = request.args.get('user_id')
    if user_id:
        return str(user_id)

    # Check header
    user_id = request.headers.get('X-User-ID')
    if user_id:
        return str(user_id)

    # Return default for unauthenticated (should be handled by auth middleware)
    return 'anonymous'


@transcripts_bp.route('/call/<call_id>', methods=['GET'])
def get_transcript_by_call(call_id: str):
    """
    GET /api/transcripts/call/<call_id>

    Get transcript for a specific call with all segments.

    Response:
    {
      "success": true,
      "transcript": {
        "id": "transcript-123",
        "callLogId": "call-123",
        "language": "en",
        "duration": 125.5,
        "segmentCount": 42,
        "status": "completed",
        "summary": "...",
        "sentiment": "positive",
        "segments": [
          {
            "id": "seg-1",
            "sequenceNumber": 1,
            "speaker": "agent",
            "text": "Hello, how can I help you?",
            "startTime": 0.5,
            "endTime": 2.3,
            "confidence": 0.95
          },
          ...
        ]
      }
    }
    """
    try:
        user_id = get_user_id()

        db = SessionLocal()
        transcript = transcript_service.get_transcript_by_call(
            db=db,
            call_log_id=call_id,
            user_id=user_id
        )

        if not transcript:
            db.close()
            return jsonify({
                'success': False,
                'error': 'Transcript not found',
                'message': f'No transcript found for call {call_id}'
            }), 404

        # Serialize before closing session (to avoid lazy load errors)
        transcript_dict = transcript.to_dict()
        db.close()

        return jsonify({
            'success': True,
            'transcript': transcript_dict,
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error getting transcript for call {call_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('/<transcript_id>', methods=['GET'])
def get_transcript_by_id(transcript_id: str):
    """
    GET /api/transcripts/<transcript_id>

    Get transcript by ID with all segments.

    Response: Same as get_transcript_by_call
    """
    try:
        user_id = get_user_id()

        db = SessionLocal()
        transcript = transcript_service.get_transcript_by_id(
            db=db,
            transcript_id=transcript_id,
            user_id=user_id
        )

        if not transcript:
            db.close()
            return jsonify({
                'success': False,
                'error': 'Transcript not found',
                'message': f'No transcript found with ID {transcript_id}'
            }), 404

        # Serialize before closing session (to avoid lazy load errors)
        transcript_dict = transcript.to_dict()
        db.close()

        return jsonify({
            'success': True,
            'transcript': transcript_dict,
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error getting transcript {transcript_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('', methods=['GET'])
def list_transcripts():
    """
    GET /api/transcripts

    List user's transcripts with pagination.

    Query Parameters:
    - limit (int, optional): Number of transcripts to return (default: 50, max: 100)
    - offset (int, optional): Number of transcripts to skip (default: 0)
    - status (string, optional): Filter by status (processing, completed, failed)

    Response:
    {
      "success": true,
      "transcripts": [...],
      "total": 150,
      "limit": 50,
      "offset": 0
    }
    """
    try:
        user_id = get_user_id()

        # Parse query parameters
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        status = request.args.get('status')

        # Validate parameters
        if limit < 1 or limit > 100:
            return jsonify({
                'success': False,
                'error': 'Invalid limit parameter',
                'message': 'Limit must be between 1 and 100'
            }), 400

        if offset < 0:
            return jsonify({
                'success': False,
                'error': 'Invalid offset parameter',
                'message': 'Offset must be >= 0'
            }), 400

        if status and status not in ['processing', 'completed', 'failed']:
            return jsonify({
                'success': False,
                'error': 'Invalid status parameter',
                'message': 'Status must be processing, completed, or failed'
            }), 400

        # Get transcripts
        db = SessionLocal()
        transcripts, total = transcript_service.get_transcripts_by_user(
            db=db,
            user_id=user_id,
            limit=limit,
            offset=offset,
            status=status
        )
        db.close()

        return jsonify({
            'success': True,
            'transcripts': [t.to_dict() for t in transcripts],
            'total': total,
            'limit': limit,
            'offset': offset,
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error listing transcripts: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('', methods=['POST'])
def create_transcript():
    """
    POST /api/transcripts

    Create a new transcript for a call.

    Request Body:
    {
      "callLogId": "call-123",
      "language": "en"
    }

    Response:
    {
      "success": true,
      "transcript": {...}
    }
    """
    try:
        user_id = get_user_id()
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request',
                'message': 'Request body is required'
            }), 400

        call_log_id = data.get('callLogId')
        if not call_log_id:
            return jsonify({
                'success': False,
                'error': 'Invalid request',
                'message': 'callLogId is required'
            }), 400

        language = data.get('language')

        # Create transcript
        db = SessionLocal()
        transcript = transcript_service.create_transcript(
            db=db,
            user_id=user_id,
            call_log_id=call_log_id,
            language=language
        )

        # Serialize before closing session (to avoid lazy load errors)
        transcript_dict = transcript.to_dict()
        db.close()

        return jsonify({
            'success': True,
            'transcript': transcript_dict,
            'user_id': user_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating transcript: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('/<transcript_id>/segments', methods=['POST'])
def add_segments(transcript_id: str):
    """
    POST /api/transcripts/<transcript_id>/segments

    Add segments to a transcript (batch or single).

    Request Body:
    {
      "segments": [
        {
          "speaker": "agent",
          "text": "Hello, how can I help you?",
          "startTime": 0.5,
          "endTime": 2.3,
          "confidence": 0.95,
          "speakerId": "speaker-1",
          "language": "en",
          "isFinal": true,
          "metadata": {}
        },
        ...
      ]
    }

    Response:
    {
      "success": true,
      "segments": [...],
      "count": 2
    }
    """
    try:
        user_id = get_user_id()
        data = request.get_json()

        if not data or 'segments' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request',
                'message': 'segments array is required'
            }), 400

        segments = data['segments']
        if not isinstance(segments, list) or len(segments) == 0:
            return jsonify({
                'success': False,
                'error': 'Invalid request',
                'message': 'segments must be a non-empty array'
            }), 400

        # Validate required fields in segments
        required_fields = ['speaker', 'text', 'startTime', 'endTime']
        for i, seg in enumerate(segments):
            for field in required_fields:
                if field not in seg:
                    return jsonify({
                        'success': False,
                        'error': 'Invalid request',
                        'message': f'Segment {i}: {field} is required'
                    }), 400

        # Add segments
        db = SessionLocal()

        # Verify transcript belongs to user
        transcript = transcript_service.get_transcript_by_id(
            db=db,
            transcript_id=transcript_id,
            user_id=user_id
        )

        if not transcript:
            db.close()
            return jsonify({
                'success': False,
                'error': 'Transcript not found',
                'message': f'No transcript found with ID {transcript_id}'
            }), 404

        created_segments = transcript_service.add_segments_batch(
            db=db,
            transcript_id=transcript_id,
            segments=segments
        )

        # Serialize before closing session (to avoid lazy load errors)
        segments_dict = [seg.to_dict() for seg in created_segments]
        db.close()

        return jsonify({
            'success': True,
            'segments': segments_dict,
            'count': len(segments_dict),
            'user_id': user_id
        }), 201

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': 'Invalid request',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error adding segments to transcript {transcript_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('/<transcript_id>/complete', methods=['PUT'])
def complete_transcript(transcript_id: str):
    """
    PUT /api/transcripts/<transcript_id>/complete

    Mark transcript as completed with optional analysis.

    Request Body:
    {
      "summary": "AI-generated summary",
      "sentiment": "positive",
      "keywords": {"entities": [...], "topics": [...]}
    }

    Response:
    {
      "success": true,
      "transcript": {...}
    }
    """
    try:
        user_id = get_user_id()
        data = request.get_json() or {}

        db = SessionLocal()

        # Verify transcript belongs to user
        transcript = transcript_service.get_transcript_by_id(
            db=db,
            transcript_id=transcript_id,
            user_id=user_id
        )

        if not transcript:
            db.close()
            return jsonify({
                'success': False,
                'error': 'Transcript not found',
                'message': f'No transcript found with ID {transcript_id}'
            }), 404

        # Complete transcript
        completed_transcript = transcript_service.complete_transcript(
            db=db,
            transcript_id=transcript_id,
            summary=data.get('summary'),
            sentiment=data.get('sentiment'),
            keywords=data.get('keywords')
        )

        # Serialize before closing session (to avoid lazy load errors)
        transcript_dict = completed_transcript.to_dict()
        db.close()

        return jsonify({
            'success': True,
            'transcript': transcript_dict,
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': 'Invalid request',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error completing transcript {transcript_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('/<transcript_id>', methods=['DELETE'])
def delete_transcript(transcript_id: str):
    """
    DELETE /api/transcripts/<transcript_id>

    Delete a transcript and all its segments.

    Response:
    {
      "success": true,
      "message": "Transcript deleted"
    }
    """
    try:
        user_id = get_user_id()

        db = SessionLocal()
        deleted = transcript_service.delete_transcript(
            db=db,
            transcript_id=transcript_id,
            user_id=user_id
        )
        db.close()

        if not deleted:
            return jsonify({
                'success': False,
                'error': 'Transcript not found',
                'message': f'No transcript found with ID {transcript_id}'
            }), 404

        return jsonify({
            'success': True,
            'message': 'Transcript deleted',
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error deleting transcript {transcript_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@transcripts_bp.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/transcripts/health

    Health check for transcript API.

    Response:
    {
      "status": "healthy",
      "service": "call_transcripts"
    }
    """
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'call_transcripts'
        }), 200

    except Exception as e:
        logger.error(f"Error in health check: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
