"""
Email Follow-up Tool - Send emails after AI agent calls
Supports both n8n webhook delivery and direct SMTP
"""

import requests
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Optional
import os

logger = logging.getLogger(__name__)


class EmailFollowupService:
    """Service for sending follow-up emails via n8n webhook or direct SMTP"""

    def __init__(self, webhook_url: str = None, smtp_config: Dict = None):
        """
        Initialize email follow-up service

        Args:
            webhook_url: n8n webhook URL for email workflow (optional)
            smtp_config: SMTP configuration dict with keys: host, port, username, password (optional)
        """
        self.webhook_url = webhook_url
        self.smtp_config = smtp_config or self._get_default_smtp_config()

    def _get_default_smtp_config(self) -> Dict:
        """Get default SMTP configuration from environment variables"""
        return {
            'host': os.getenv('SMTP_HOST', 'live.smtp.mailtrap.io'),
            'port': int(os.getenv('SMTP_PORT', '587')),
            'username': os.getenv('SMTP_USERNAME', 'api'),
            'password': os.getenv('SMTP_PASSWORD', ''),
            'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        }

    def send_via_smtp(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None,
        html_body: Optional[str] = None,
        reply_to: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict:
        """
        Send email directly via SMTP (bypasses n8n)

        Args:
            to_email: Recipient email address
            subject: Email subject line
            body: Plain text email body
            from_email: Sender email (optional, defaults to noreply@epic.dm)
            html_body: HTML email body (optional)
            reply_to: Reply-To email address (optional, user receives replies)
            bcc: BCC email address (optional, user gets copy of email)

        Returns:
            dict with send status and details
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = from_email or 'noreply@epic.dm'
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Date'] = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S +0000')

            # Add Reply-To header if provided (user receives replies)
            if reply_to:
                msg['Reply-To'] = reply_to
                logger.info(f"📬 Reply-To set to: {reply_to}")

            # Add BCC if provided (user gets copy)
            if bcc:
                msg['Bcc'] = bcc
                logger.info(f"📋 BCC set to: {bcc}")

            # Attach plain text body
            msg.attach(MIMEText(body, 'plain'))

            # Attach HTML body if provided
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))

            logger.info(f"📧 Sending email via SMTP to {to_email}")
            logger.debug(f"SMTP config: {self.smtp_config['host']}:{self.smtp_config['port']}")

            # Connect to SMTP server
            smtp = smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port'], timeout=30)

            # Start TLS if required
            if self.smtp_config.get('use_tls', True):
                smtp.starttls()

            # Login
            smtp.login(self.smtp_config['username'], self.smtp_config['password'])

            # Send email
            smtp.send_message(msg)
            smtp.quit()

            logger.info(f"✅ Email sent successfully via SMTP to {to_email}")

            return {
                'success': True,
                'message_id': msg.get('Message-ID', 'N/A'),
                'to': to_email,
                'sent_at': datetime.utcnow().isoformat(),
                'method': 'smtp'
            }

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'method': 'smtp'
            }

        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'method': 'smtp'
            }

        except Exception as e:
            error_msg = f"Failed to send email via SMTP: {str(e)}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.debug(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg,
                'method': 'smtp'
            }

    def send_followup(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None,
        call_data: Optional[Dict] = None,
        reply_to: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict:
        """
        Send follow-up email via n8n workflow

        Args:
            to_email: Recipient email address
            subject: Email subject line
            body: Email body content
            from_email: Sender email (optional, uses default if not provided)
            call_data: Additional call context data (optional)
            reply_to: Reply-To email address (optional, user receives replies)
            bcc: BCC email address (optional, user gets copy of email)

        Returns:
            dict with send status and details

        Example:
            >>> service = EmailFollowupService("https://n8n.ai.epic.dm/webhook/email-followup")
            >>> result = service.send_followup(
            ...     to_email="customer@example.com",
            ...     subject="Thank you for calling!",
            ...     body="We appreciate your call today...",
            ...     reply_to="user@company.com",
            ...     bcc="user@company.com",
            ...     call_data={"duration": 180, "agent": "Sales Agent"}
            ... )
            >>> print(result)
            {'success': True, 'message_id': 'abc123', 'sent_at': '2025-11-20T00:30:00'}
        """
        try:
            # Build payload for n8n webhook
            payload = {
                'to': to_email,
                'subject': subject,
                'body': body,
                'from_email': from_email or 'noreply@epic.dm',
                'sent_at': datetime.utcnow().isoformat(),
            }

            # Add reply_to if provided (user receives replies)
            if reply_to:
                payload['reply_to'] = reply_to
                logger.info(f"📬 Reply-To will be set to: {reply_to}")

            # Add bcc if provided (user gets copy)
            if bcc:
                payload['bcc'] = bcc
                logger.info(f"📋 BCC will be set to: {bcc}")

            # Include call data if provided
            if call_data:
                payload['call_data'] = call_data

            logger.info(f"📧 Sending follow-up email to {to_email}")
            logger.debug(f"Email payload: {payload}")

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
                logger.info(f"✅ Email sent successfully to {to_email}")

                return {
                    'success': True,
                    'message_id': result.get('message_id'),
                    'to': to_email,
                    'sent_at': payload['sent_at']
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
            error_msg = "Email send timed out after 30 seconds"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to send email: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except Exception as e:
            error_msg = f"Unexpected error sending email: {str(e)}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.debug(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg
            }

    def send_template_email(
        self,
        to_email: str,
        template: str,
        template_data: Dict,
        from_email: Optional[str] = None
    ) -> Dict:
        """
        Send email using a predefined template

        Args:
            to_email: Recipient email
            template: Template name (e.g., 'call_summary', 'appointment_confirmation')
            template_data: Data to fill template variables
            from_email: Sender email (optional)

        Returns:
            dict with send status

        Example:
            >>> service.send_template_email(
            ...     to_email="customer@example.com",
            ...     template="call_summary",
            ...     template_data={
            ...         "customer_name": "John Doe",
            ...         "call_duration": "3 minutes",
            ...         "agent_name": "Sales Agent",
            ...         "summary": "Discussed pricing options..."
            ...     }
            ... )
        """
        # Template mapping
        templates = {
            'call_summary': {
                'subject': 'Thank you for your call',
                'body_template': '''
Hi {customer_name},

Thank you for speaking with {agent_name} today.

Call Summary:
Duration: {call_duration}
{summary}

If you have any questions, feel free to reach out!

Best regards,
{agent_name}
'''
            },
            'appointment_confirmation': {
                'subject': 'Appointment Confirmed',
                'body_template': '''
Hi {customer_name},

Your appointment has been confirmed for {appointment_time}.

{details}

Looking forward to speaking with you!

Best regards,
{company_name}
'''
            }
        }

        if template not in templates:
            return {
                'success': False,
                'error': f'Unknown template: {template}'
            }

        template_config = templates[template]
        subject = template_config['subject']
        body = template_config['body_template'].format(**template_data)

        return self.send_followup(
            to_email=to_email,
            subject=subject,
            body=body,
            from_email=from_email
        )


# Helper function for use in API routes
def send_email_followup(
    webhook_url: str,
    to_email: str,
    subject: str,
    body: str,
    **kwargs
) -> Dict:
    """
    Convenience function to send email follow-up

    Args:
        webhook_url: n8n webhook URL
        to_email: Recipient email
        subject: Email subject
        body: Email body
        **kwargs: Additional arguments passed to send_followup()

    Returns:
        dict with send status
    """
    service = EmailFollowupService(webhook_url)
    return service.send_followup(
        to_email=to_email,
        subject=subject,
        body=body,
        **kwargs
    )
