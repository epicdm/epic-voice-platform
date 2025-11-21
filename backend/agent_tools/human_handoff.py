"""
Human Handoff Tool - Transfer AI agent calls to human operators
Supports multiple handoff strategies: SIP transfer, LiveKit room invitation, and notification-based
"""

import requests
import logging
from datetime import datetime
from typing import Dict, Optional
from livekit import api
import os

logger = logging.getLogger(__name__)


class HumanHandoffService:
    """Service for transferring calls from AI agents to human operators"""

    def __init__(self, config: Dict):
        """
        Initialize human handoff service

        Args:
            config: Configuration dict with handoff settings
                {
                    "strategy": "sip_transfer" | "livekit_invite" | "notification",
                    "sip_number": "+1234567890",  # For SIP transfer
                    "support_team_webhook": "https://...",  # For notifications
                    "livekit_url": "wss://...",
                    "livekit_api_key": "...",
                    "livekit_api_secret": "..."
                }
        """
        self.config = config
        self.strategy = config.get('strategy', 'notification')

    def request_handoff(
        self,
        room_name: str,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        reason: Optional[str] = None,
        agent_summary: Optional[str] = None
    ) -> Dict:
        """
        Request handoff to human operator

        Args:
            room_name: LiveKit room name where call is happening
            customer_name: Customer's name
            customer_phone: Customer's phone number
            reason: Reason for handoff (e.g., "complex issue", "customer request")
            agent_summary: Summary of conversation so far

        Returns:
            dict with handoff status

        Example:
            >>> service = HumanHandoffService(config)
            >>> result = service.request_handoff(
            ...     room_name="sip-1234567890__abc123",
            ...     customer_name="John Doe",
            ...     reason="Customer requested to speak with human",
            ...     agent_summary="Customer asking about refund policy"
            ... )
            >>> print(result)
            {'success': True, 'handoff_id': 'ho_123', 'eta_seconds': 60}
        """
        try:
            logger.info(f"🔄 Initiating human handoff for room {room_name}")
            logger.info(f"Strategy: {self.strategy}, Reason: {reason}")

            # Execute handoff based on strategy
            if self.strategy == 'sip_transfer':
                return self._handoff_via_sip(room_name, customer_phone)
            elif self.strategy == 'livekit_invite':
                return self._handoff_via_livekit_invite(
                    room_name, customer_name, reason, agent_summary
                )
            elif self.strategy == 'notification':
                return self._handoff_via_notification(
                    room_name, customer_name, customer_phone, reason, agent_summary
                )
            else:
                return {
                    'success': False,
                    'error': f'Unknown handoff strategy: {self.strategy}'
                }

        except Exception as e:
            error_msg = f"Failed to request human handoff: {str(e)}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.debug(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg
            }

    def _handoff_via_sip(self, room_name: str, customer_phone: Optional[str]) -> Dict:
        """
        Handoff via SIP transfer to support phone number

        This will transfer the call to a human operator's phone
        """
        try:
            sip_number = self.config.get('sip_number')
            if not sip_number:
                return {
                    'success': False,
                    'error': 'SIP number not configured'
                }

            logger.info(f"📞 Transferring call to {sip_number}")

            # TODO: Implement SIP transfer via LiveKit SIP API
            # This would use LiveKit's SIP bridge to transfer the call

            return {
                'success': True,
                'handoff_id': f'ho_{datetime.utcnow().timestamp()}',
                'method': 'sip_transfer',
                'transfer_number': sip_number,
                'message': 'Transferring to human operator...'
            }

        except Exception as e:
            logger.error(f"SIP transfer error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _handoff_via_livekit_invite(
        self,
        room_name: str,
        customer_name: Optional[str],
        reason: Optional[str],
        agent_summary: Optional[str]
    ) -> Dict:
        """
        Handoff by inviting human operator to LiveKit room

        This sends a notification to available support agents to join the room
        """
        try:
            webhook_url = self.config.get('support_team_webhook')
            if not webhook_url:
                return {
                    'success': False,
                    'error': 'Support team webhook not configured'
                }

            # Create room token for human operator
            livekit_url = self.config.get('livekit_url', os.getenv('LIVEKIT_URL'))
            livekit_api_key = self.config.get('livekit_api_key', os.getenv('LIVEKIT_API_KEY'))
            livekit_api_secret = self.config.get('livekit_api_secret', os.getenv('LIVEKIT_API_SECRET'))

            # Generate access token for human operator
            token = api.AccessToken(livekit_api_key, livekit_api_secret)
            token.with_identity("support_agent")
            token.with_name("Support Agent")
            token.with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True
            ))
            join_token = token.to_jwt()

            # Send notification to support team
            payload = {
                'event': 'human_handoff_requested',
                'room_name': room_name,
                'customer_name': customer_name,
                'reason': reason,
                'agent_summary': agent_summary,
                'join_url': f"{livekit_url}?token={join_token}",
                'requested_at': datetime.utcnow().isoformat()
            }

            logger.info(f"📧 Notifying support team via webhook: {webhook_url}")

            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                logger.info(f"✅ Support team notified successfully")
                return {
                    'success': True,
                    'handoff_id': f'ho_{datetime.utcnow().timestamp()}',
                    'method': 'livekit_invite',
                    'eta_seconds': 60,
                    'message': 'Support team notified. Agent will join shortly.'
                }
            else:
                logger.error(f"Webhook returned {response.status_code}: {response.text}")
                return {
                    'success': False,
                    'error': f'Notification failed: HTTP {response.status_code}'
                }

        except Exception as e:
            logger.error(f"LiveKit invite error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }

    def _handoff_via_notification(
        self,
        room_name: str,
        customer_name: Optional[str],
        customer_phone: Optional[str],
        reason: Optional[str],
        agent_summary: Optional[str]
    ) -> Dict:
        """
        Handoff via notification system (Slack, email, SMS to support team)

        This notifies the support team but doesn't automatically connect them
        """
        try:
            webhook_url = self.config.get('support_team_webhook')
            if not webhook_url:
                return {
                    'success': False,
                    'error': 'Support team webhook not configured'
                }

            # Build notification payload
            payload = {
                'event': 'human_handoff_requested',
                'room_name': room_name,
                'customer_name': customer_name or 'Unknown',
                'customer_phone': customer_phone,
                'reason': reason or 'Customer requested human assistance',
                'agent_summary': agent_summary or 'No summary provided',
                'requested_at': datetime.utcnow().isoformat(),
                'dashboard_url': f'https://dashboard.epic.dm/calls/{room_name}'
            }

            logger.info(f"📣 Sending handoff notification")

            response = requests.post(
                webhook_url,
                json=payload,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                result = response.json() if response.content else {}
                logger.info(f"✅ Handoff notification sent successfully")

                return {
                    'success': True,
                    'handoff_id': result.get('handoff_id', f'ho_{datetime.utcnow().timestamp()}'),
                    'method': 'notification',
                    'estimated_wait_minutes': result.get('estimated_wait_minutes', 2),
                    'message': 'Support team has been notified. Someone will call you back shortly.'
                }
            else:
                logger.error(f"Webhook returned {response.status_code}: {response.text}")
                return {
                    'success': False,
                    'error': f'Notification failed: HTTP {response.status_code}'
                }

        except requests.exceptions.Timeout:
            error_msg = "Notification request timed out"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except Exception as e:
            logger.error(f"Notification error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }

    def get_handoff_status(self, handoff_id: str) -> Dict:
        """
        Check status of handoff request (placeholder for future implementation)

        Args:
            handoff_id: Handoff request identifier

        Returns:
            dict with status information
        """
        try:
            logger.info(f"📊 Checking handoff status: {handoff_id}")

            # This would query a handoff tracking system
            return {
                'success': True,
                'handoff_id': handoff_id,
                'status': 'pending',  # pending, connected, completed, cancelled
                'message': 'Status check not yet implemented'
            }

        except Exception as e:
            logger.error(f"Status check error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Helper function for use in API routes
def request_human_handoff(
    config: Dict,
    room_name: str,
    **kwargs
) -> Dict:
    """
    Convenience function to request human handoff

    Args:
        config: Handoff configuration
        room_name: LiveKit room name
        **kwargs: Additional arguments passed to request_handoff()

    Returns:
        dict with handoff status
    """
    service = HumanHandoffService(config)
    return service.request_handoff(room_name=room_name, **kwargs)
