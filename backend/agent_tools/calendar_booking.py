"""
Calendar Booking Tool - Schedule appointments during AI agent calls
Integrates with n8n workflow for calendar management
"""

import requests
import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class CalendarBookingService:
    """Service for booking appointments via n8n workflow"""

    def __init__(self, webhook_url: str):
        """
        Initialize calendar booking service

        Args:
            webhook_url: n8n webhook URL for calendar booking workflow
        """
        self.webhook_url = webhook_url

    def book_appointment(
        self,
        customer_name: str,
        customer_email: str,
        appointment_date: str,
        appointment_time: str,
        duration_minutes: int = 30,
        notes: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> Dict:
        """
        Book an appointment via n8n workflow

        Args:
            customer_name: Customer's full name
            customer_email: Customer's email address
            appointment_date: Date in YYYY-MM-DD format
            appointment_time: Time in HH:MM format (24-hour)
            duration_minutes: Appointment duration (default: 30)
            notes: Additional notes or context
            phone_number: Customer's phone number (optional)

        Returns:
            dict with booking status and details

        Example:
            >>> service = CalendarBookingService("https://n8n.ai.epic.dm/webhook/calendar")
            >>> result = service.book_appointment(
            ...     customer_name="John Doe",
            ...     customer_email="john@example.com",
            ...     appointment_date="2025-11-25",
            ...     appointment_time="14:00",
            ...     duration_minutes=30,
            ...     notes="Initial consultation"
            ... )
            >>> print(result)
            {'success': True, 'booking_id': 'abc123', 'confirmation_sent': True}
        """
        try:
            # Build payload for n8n webhook
            payload = {
                'customer_name': customer_name,
                'customer_email': customer_email,
                'appointment_date': appointment_date,
                'appointment_time': appointment_time,
                'duration_minutes': duration_minutes,
                'notes': notes or '',
                'phone_number': phone_number or '',
                'booked_at': datetime.utcnow().isoformat(),
            }

            logger.info(f"📅 Booking appointment for {customer_name} on {appointment_date} at {appointment_time}")
            logger.debug(f"Booking payload: {payload}")

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
                logger.info(f"✅ Appointment booked successfully for {customer_name}")

                return {
                    'success': True,
                    'booking_id': result.get('booking_id'),
                    'confirmation_sent': result.get('confirmation_sent', False),
                    'calendar_link': result.get('calendar_link'),
                    'customer_email': customer_email,
                    'appointment_date': appointment_date,
                    'appointment_time': appointment_time
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
            error_msg = "Booking request timed out after 30 seconds"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to book appointment: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

        except Exception as e:
            error_msg = f"Unexpected error booking appointment: {str(e)}"
            logger.error(f"❌ {error_msg}")
            import traceback
            logger.debug(traceback.format_exc())
            return {
                'success': False,
                'error': error_msg
            }

    def check_availability(
        self,
        date: str,
        preferred_times: list = None
    ) -> Dict:
        """
        Check calendar availability for a specific date

        Args:
            date: Date in YYYY-MM-DD format
            preferred_times: List of preferred times in HH:MM format

        Returns:
            dict with available time slots

        Example:
            >>> service.check_availability("2025-11-25", ["14:00", "15:00", "16:00"])
            {'available_slots': ['14:00', '16:00'], 'date': '2025-11-25'}
        """
        try:
            # This would call a separate n8n workflow to check availability
            # For now, return a placeholder response
            logger.info(f"📅 Checking availability for {date}")

            return {
                'success': True,
                'date': date,
                'available_slots': preferred_times or [],
                'message': 'Availability check not yet implemented'
            }

        except Exception as e:
            error_msg = f"Failed to check availability: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }

    def cancel_appointment(
        self,
        booking_id: str,
        reason: Optional[str] = None
    ) -> Dict:
        """
        Cancel a previously booked appointment

        Args:
            booking_id: Unique booking identifier
            reason: Cancellation reason (optional)

        Returns:
            dict with cancellation status
        """
        try:
            logger.info(f"📅 Cancelling appointment {booking_id}")

            # This would call n8n workflow to cancel appointment
            return {
                'success': True,
                'booking_id': booking_id,
                'cancelled_at': datetime.utcnow().isoformat(),
                'message': 'Cancellation not yet implemented'
            }

        except Exception as e:
            error_msg = f"Failed to cancel appointment: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }


# Helper function for use in API routes
def book_appointment_via_webhook(
    webhook_url: str,
    customer_name: str,
    customer_email: str,
    appointment_date: str,
    appointment_time: str,
    **kwargs
) -> Dict:
    """
    Convenience function to book appointment

    Args:
        webhook_url: n8n webhook URL
        customer_name: Customer's name
        customer_email: Customer's email
        appointment_date: Date in YYYY-MM-DD format
        appointment_time: Time in HH:MM format
        **kwargs: Additional arguments passed to book_appointment()

    Returns:
        dict with booking status
    """
    service = CalendarBookingService(webhook_url)
    return service.book_appointment(
        customer_name=customer_name,
        customer_email=customer_email,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        **kwargs
    )
