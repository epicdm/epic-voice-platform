"""
SMS Follow-up Tool - Send text messages after AI agent calls
Integrates with n8n workflow for SMS delivery via Twilio or other providers
"""

import requests
import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class SMSFollowupService:
    """Service for sending follow-up SMS messages via n8n workflow"""

    def __init__(self, webhook_url: str):
        """
        Initialize SMS follow-up service

        Args:
            webhook_url: n8n webhook URL for SMS delivery workflow
        """
        self.webhook_url = webhook_url

    def send_sms(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict:
        """
        Send SMS message via n8n workflow

        Args:
            to_number: Recipient phone number (E.164 format: +1234567890)
            message: SMS message content (max 160 chars recommended)
            from_number: Sender phone number (optional, uses default if not provided)

        Returns:
            dict with send status and details

        Example:
            >>> service = SMSFollowupService("https://n8n.ai.epic.dm/webhook/sms")
            >>> result = service.send_sms(
            ...     to_number="+1234567890",
            ...     message="Thanks for calling! Your appointment is confirmed for 2PM tomorrow."
            ... )
            >>> print(result)
            {'success': True, 'message_id': 'SM123abc', 'to': '+1234567890'}
        """
        try:
            # Validate phone number format
            if not to_number.startswith('+'):
                logger.warning(f"Phone number {to_number} missing + prefix, adding it")
                to_number = '+' + to_number.lstrip('+')

            # Build payload for n8n webhook
            payload = {
                'to': to_number,
                'message': message,
                'from_number': from_number or '',
                'sent_at': datetime.utcnow().isoformat(),
            }

            logger.info(f"📱 Sending SMS to {to_number}")
            logger.debug(f"SMS payload: {payload}")

            # Call n8n webhook
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )

            # Check response
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ SMS sent successfully to {to_number}")

                return {
                    'success': True,
                    'message_id': result.get('message_id') or result.get('sid'),
                    'to': to_number,
                    'sent_at': payload['sent_at'],
                    'status': result.get('status', 'sent')
                }
            else:
                error_msg = f"n8n webhook returned status {response.status_code}"
                logger.error(f"❌ {error_msg}: {response.text}")

                return {
                    'success': False,
                    'error': error_msg,
                    'details': response.text
                }

        except requests.exceptions.Timeout:
            error_msg = "SMS send timed out after 30 seconds"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to send SMS: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except Exception as e:
            error_msg = f"Unexpected error sending SMS: {str(e)}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.debug(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg
            }

    def send_template_sms(
        self,
        to_number: str,
        template: str,
        template_data: Dict,
        from_number: Optional[str] = None
    ) -> Dict:
        """
        Send SMS using a predefined template

        Args:
            to_number: Recipient phone number
            template: Template name (e.g., 'appointment_reminder', 'call_summary')
            template_data: Data to fill template variables
            from_number: Sender phone number (optional)

        Returns:
            dict with send status

        Example:
            >>> service.send_template_sms(
            ...     to_number="+1234567890",
            ...     template="appointment_reminder",
            ...     template_data={
            ...         "customer_name": "John",
            ...         "appointment_time": "2PM tomorrow",
            ...         "company_name": "Epic Voice"
            ...     }
            ... )
        """
        # Template mapping
        templates = {
            'appointment_reminder': '''{customer_name}, this is {company_name}. Reminder: Your appointment is scheduled for {appointment_time}. Reply CONFIRM to confirm.''',

            'call_summary': '''Hi {customer_name}, thanks for calling {company_name}! {summary} Questions? Call us back anytime.''',

            'appointment_confirmation': '''Hi {customer_name}, your appointment with {company_name} is confirmed for {appointment_time}. See you then!''',

            'follow_up': '''Hi {customer_name}, following up on our call. {message} - {company_name}''',

            'link_share': '''Hi {customer_name}, here's the link we discussed: {link} - {company_name}'''
        }

        if template not in templates:
            return {
                'success': False,
                'error': f'Unknown template: {template}'
            }

        # Fill template
        message = templates[template].format(**template_data)

        # Send SMS
        return self.send_sms(
            to_number=to_number,
            message=message,
            from_number=from_number
        )

    def get_delivery_status(
        self,
        message_id: str
    ) -> Dict:
        """
        Check delivery status of a sent SMS (placeholder for future implementation)

        Args:
            message_id: SMS message identifier

        Returns:
            dict with delivery status
        """
        try:
            logger.info(f"📱 Checking SMS status for {message_id}")

            # This would call n8n workflow to check Twilio status
            return {
                'success': True,
                'message_id': message_id,
                'status': 'delivered',
                'message': 'Status check not yet implemented'
            }

        except Exception as e:
            error_msg = f"Failed to check SMS status: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }


# Helper function for use in API routes
def send_sms_via_webhook(
    webhook_url: str,
    to_number: str,
    message: str,
    **kwargs
) -> Dict:
    """
    Convenience function to send SMS

    Args:
        webhook_url: n8n webhook URL
        to_number: Recipient phone number
        message: SMS message content
        **kwargs: Additional arguments passed to send_sms()

    Returns:
        dict with send status
    """
    service = SMSFollowupService(webhook_url)
    return service.send_sms(
        to_number=to_number,
        message=message,
        **kwargs
    )
