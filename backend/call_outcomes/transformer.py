"""
LiveKit Webhook Transformer

Transforms LiveKit webhook payloads into normalized event structures
for call outcome processing.

Responsibilities:
- Parse LiveKit webhook JSON payloads
- Extract relevant fields (event_id, room_name, participant, timestamps)
- Normalize event types for consistent processing
- Validate required fields are present
- Handle edge cases (missing fields, malformed data)

Multi-Tenant: Does not handle tenant isolation (handled by service layer)
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class LiveKitWebhookTransformer:
    """
    Transform LiveKit webhook payloads into normalized events.

    Supports event types:
    - participant_joined: Participant connected to room
    - participant_left: Participant disconnected from room
    - room_finished: Room closed
    - egress_ended: Recording completed
    """

    # Event types we process for call outcomes
    PROCESSABLE_EVENTS = [
        'participant_left',      # Most common - user or agent hung up
        'room_finished',         # Room closed (backup signal)
        'egress_ended'          # Recording finished (for recorded calls)
    ]

    def transform(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform LiveKit webhook payload into normalized event.

        Args:
            payload: Raw webhook payload from LiveKit

        Returns:
            Normalized event dict or None if not processable

        Normalized Event Structure:
        {
            'event_id': str,              # Unique event ID from LiveKit
            'event_type': str,            # 'participant_left', 'room_finished', etc.
            'room_name': str,             # LiveKit room name
            'room_sid': str,              # LiveKit room SID
            'participant_sid': str,       # Participant SID (if applicable)
            'participant_identity': str,  # Participant identity (if applicable)
            'disconnect_reason': str,     # Reason for disconnect (if applicable)
            'recording_url': str,         # Recording URL (if applicable)
            'created_at': str,            # ISO 8601 timestamp from LiveKit
            'raw_payload': dict          # Full original payload for debugging
        }
        """
        try:
            # 1. Extract event type
            event_type = payload.get('event')

            if not event_type:
                logger.warning("Missing 'event' field in webhook payload")
                return None

            # 2. Filter non-processable events early
            if event_type not in self.PROCESSABLE_EVENTS:
                logger.debug(f"Ignoring non-processable event: {event_type}")
                return None

            # 3. Extract core event data
            event_id = payload.get('id')
            created_at = payload.get('createdAt')  # ISO 8601 timestamp

            if not event_id:
                logger.error("Missing 'id' field in webhook payload")
                return None

            # 4. Extract room information
            room = payload.get('room', {})
            room_name = room.get('name')
            room_sid = room.get('sid')
            room_creation_time = room.get('creationTime')

            if not room_name:
                logger.error("Missing 'room.name' field in webhook payload")
                return None

            # 5. Extract participant information (if present)
            participant = payload.get('participant', {})
            participant_sid = participant.get('sid')
            participant_identity = participant.get('identity')
            disconnect_reason = participant.get('disconnectReason', '')

            # 6. Extract egress information (if present)
            egress_info = payload.get('egressInfo', {})
            recording_url = self._extract_recording_url(egress_info)

            # 7. Build normalized event
            normalized = {
                'event_id': event_id,
                'event_type': event_type,
                'room_name': room_name,
                'room_sid': room_sid,
                'room_creation_time': room_creation_time,
                'participant_sid': participant_sid,
                'participant_identity': participant_identity,
                'disconnect_reason': disconnect_reason,
                'recording_url': recording_url,
                'created_at': created_at,
                'raw_payload': payload  # Store full payload for debugging
            }

            logger.info(f"Transformed event {event_id} ({event_type}) for room {room_name}")
            return normalized

        except Exception as e:
            logger.error(f"Error transforming webhook payload: {e}", exc_info=True)
            return None

    def _extract_recording_url(self, egress_info: Dict[str, Any]) -> Optional[str]:
        """
        Extract recording download URL from egress info.

        Args:
            egress_info: Egress information from webhook payload

        Returns:
            Recording URL or None
        """
        try:
            file_results = egress_info.get('fileResults', [])

            if not file_results:
                return None

            # Get first file result (primary recording)
            first_result = file_results[0]
            download_url = first_result.get('download_url') or first_result.get('downloadUrl')

            return download_url

        except Exception as e:
            logger.warning(f"Could not extract recording URL: {e}")
            return None

    def validate_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """
        Validate HMAC-SHA256 signature from LiveKit.

        Args:
            payload: Raw request body bytes
            signature: Signature from X-LiveKit-Signature header
            secret: HMAC secret from environment

        Returns:
            True if signature is valid, False otherwise
        """
        import hmac
        import hashlib

        if not signature or not secret:
            logger.warning("Missing signature or secret for validation")
            return False

        try:
            # Compute expected signature
            expected = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()

            # Constant-time comparison to prevent timing attacks
            is_valid = hmac.compare_digest(expected, signature)

            if not is_valid:
                logger.warning("Invalid webhook signature")

            return is_valid

        except Exception as e:
            logger.error(f"Error validating signature: {e}", exc_info=True)
            return False

    def extract_user_id_from_room_name(self, room_name: str) -> Optional[str]:
        """
        Extract user ID from room name pattern.

        Room Name Patterns:
        - Inbound: "sip-{did_digits}__{timestamp}__{random}"
        - Outbound: "campaign-{campaign_id}__lead-{lead_id}__{timestamp}"
        - Custom: User-defined patterns

        Note: This method CANNOT determine userId from room name alone.
        UserId must be looked up via:
        - Inbound: phone_number_pool table (DID → userId)
        - Outbound: campaigns table (campaign_id → userId)

        Args:
            room_name: LiveKit room name

        Returns:
            None (userId lookup requires database queries in service layer)
        """
        # Room name alone is insufficient to determine userId
        # Service layer must handle userId lookup via database
        logger.debug(f"Room name parsing delegated to service layer: {room_name}")
        return None

    def extract_phone_number_from_room_name(self, room_name: str) -> Optional[str]:
        """
        Extract phone number (DID) from inbound call room names.

        Inbound Pattern: "sip-{did_digits}__{timestamp}__{random}"
        Example: "sip-7678189426__1730000000__abc123"
        Extracted: +17678189426

        Args:
            room_name: LiveKit room name

        Returns:
            Formatted phone number (+1XXXXXXXXXX) or None
        """
        if not room_name or not room_name.startswith('sip-'):
            return None

        try:
            # Parse: "sip-7678189426__..." → "7678189426"
            parts = room_name.split('__')
            if len(parts) < 2:
                return None

            did_part = parts[0].replace('sip-', '')

            # Format as E.164 (+1XXXXXXXXXX)
            if len(did_part) == 10:
                return f"+1{did_part}"
            elif len(did_part) == 11 and did_part.startswith('1'):
                return f"+{did_part}"
            else:
                # Return as-is if format unclear
                return f"+{did_part}"

        except Exception as e:
            logger.warning(f"Could not extract phone number from room name: {e}")
            return None

    def extract_campaign_id_from_room_name(self, room_name: str) -> Optional[str]:
        """
        Extract campaign ID from outbound call room names.

        Outbound Pattern: "campaign-{campaign_id}__lead-{lead_id}__{timestamp}"
        Example: "campaign-C123__lead-L456__1730000000"
        Extracted: "C123"

        Args:
            room_name: LiveKit room name

        Returns:
            Campaign ID or None
        """
        if not room_name or not room_name.startswith('campaign-'):
            return None

        try:
            # Parse: "campaign-C123__..." → "C123"
            parts = room_name.split('__')
            if len(parts) < 2:
                return None

            campaign_part = parts[0].replace('campaign-', '')
            return campaign_part

        except Exception as e:
            logger.warning(f"Could not extract campaign ID from room name: {e}")
            return None

    def calculate_duration(self, started_at, ended_at) -> int:
        """
        Calculate call duration in seconds.
        Handles both ISO 8601 strings and Unix timestamps (integers).

        Args:
            started_at: ISO 8601 timestamp string OR Unix timestamp integer
            ended_at: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            Duration in seconds (0 if calculation fails)
        """
        if not started_at or not ended_at:
            return 0

        try:
            # Parse timestamps (handles both integers and ISO strings)
            start = self._parse_timestamp_to_datetime(started_at)
            end = self._parse_timestamp_to_datetime(ended_at)

            duration = int((end - start).total_seconds())
            return max(0, duration)  # Ensure non-negative

        except Exception as e:
            logger.error(f"Error calculating duration: {e}")
            return 0

    def _parse_timestamp_to_datetime(self, timestamp):
        """
        Parse timestamp to datetime object.
        Handles both ISO 8601 strings and Unix timestamps (integers).

        Args:
            timestamp: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            datetime object

        Raises:
            ValueError if parsing fails
        """
        # DEBUG: Log what we're receiving
        logger.debug(f"🔍 _parse_timestamp_to_datetime called with: type={type(timestamp)}, value={repr(timestamp)}")

        # If already an integer (Unix timestamp), convert to datetime
        if isinstance(timestamp, int):
            logger.debug(f"✅ Detected integer timestamp, converting...")
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)

        # If string that looks like integer, convert it
        if isinstance(timestamp, str) and timestamp.isdigit():
            logger.debug(f"✅ Detected numeric string, converting...")
            return datetime.fromtimestamp(int(timestamp), tz=timezone.utc)

        # Otherwise parse as ISO 8601
        logger.debug(f"⚠️  Attempting ISO 8601 parse...")
        return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))


# Example usage for testing
if __name__ == '__main__':
    import json

    transformer = LiveKitWebhookTransformer()

    # Test payload: participant_left event
    test_payload = {
        'id': 'evt_123abc',
        'event': 'participant_left',
        'createdAt': '2025-10-29T12:34:56Z',
        'room': {
            'name': 'sip-7678189426__1730000000__abc123',
            'sid': 'RM_test123',
            'creationTime': '2025-10-29T12:34:10Z'
        },
        'participant': {
            'sid': 'PA_agent123',
            'identity': 'agent',
            'disconnectReason': 'CLIENT_INITIATED'
        }
    }

    # Transform
    normalized = transformer.transform(test_payload)

    if normalized:
        print("✅ Transformation successful")
        print(json.dumps(normalized, indent=2, default=str))

        # Test phone number extraction
        phone = transformer.extract_phone_number_from_room_name(normalized['room_name'])
        print(f"\nExtracted phone number: {phone}")

        # Test duration calculation
        duration = transformer.calculate_duration(
            normalized['raw_payload']['room']['creationTime'],
            normalized['created_at']
        )
        print(f"Calculated duration: {duration} seconds")
    else:
        print("❌ Transformation failed")
