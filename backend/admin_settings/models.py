"""
Admin Settings Models
System-wide configuration that can be managed through admin panel
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from database import Base
import uuid


class SystemSetting(Base):
    """
    System-wide settings that can be configured by admins.
    Settings are stored as key-value pairs with optional metadata.
    """
    __tablename__ = 'system_settings'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Setting identification
    category = Column(String, nullable=False, index=True)  # e.g., 'sip', 'email', 'sms'
    key = Column(String, nullable=False, unique=True, index=True)  # e.g., 'sip_domain', 'smtp_host'

    # Setting value
    value = Column(Text, nullable=True)  # The actual setting value

    # Metadata
    description = Column(Text, nullable=True)  # Human-readable description
    is_secret = Column(Boolean, default=False)  # Whether to hide value in UI
    is_required = Column(Boolean, default=False)  # Whether setting is required
    data_type = Column(String, default='string')  # string, number, boolean, json

    # Validation
    validation_regex = Column(String, nullable=True)  # Optional regex validation
    allowed_values = Column(JSON, nullable=True)  # Optional list of allowed values

    # Audit
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(String, nullable=True)  # Admin user ID who last updated

    def to_dict(self, include_secret=False):
        """Convert to dictionary."""
        value = self.value

        # Hide secret values unless explicitly requested
        if self.is_secret and not include_secret:
            if value:
                value = '***' + value[-4:] if len(value) > 4 else '***'

        return {
            'id': self.id,
            'category': self.category,
            'key': self.key,
            'value': value,
            'description': self.description,
            'is_secret': self.is_secret,
            'is_required': self.is_required,
            'data_type': self.data_type,
            'validation_regex': self.validation_regex,
            'allowed_values': self.allowed_values,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'updated_by': self.updated_by
        }


# Default system settings to initialize
DEFAULT_SETTINGS = [
    # SIP Trunk Settings
    {
        'category': 'sip',
        'key': 'sip_domain',
        'value': 'voice.epic.dm',
        'description': 'Primary SIP domain for inbound/outbound calls',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'sip',
        'key': 'sip_transport',
        'value': 'tcp',
        'description': 'SIP transport protocol',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string',
        'allowed_values': ['tcp', 'udp', 'tls']
    },
    {
        'category': 'sip',
        'key': 'sip_port',
        'value': '5060',
        'description': 'SIP port number',
        'is_secret': False,
        'is_required': True,
        'data_type': 'number'
    },
    {
        'category': 'sip',
        'key': 'livekit_sip_domain',
        'value': '3m4yki5jezn.sip.livekit.cloud',
        'description': 'LiveKit SIP domain',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'sip',
        'key': 'sip_outbound_trunk_id',
        'value': 'ST_sTo8gGpNbXzY',
        'description': 'Default LiveKit outbound SIP trunk ID',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },

    # Email Settings
    {
        'category': 'email',
        'key': 'smtp_host',
        'value': 'live.smtp.mailtrap.io',
        'description': 'SMTP server hostname',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'email',
        'key': 'smtp_port',
        'value': '587',
        'description': 'SMTP server port',
        'is_secret': False,
        'is_required': True,
        'data_type': 'number'
    },
    {
        'category': 'email',
        'key': 'smtp_user',
        'value': 'api',
        'description': 'SMTP username',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'email',
        'key': 'smtp_password',
        'value': '',
        'description': 'SMTP password',
        'is_secret': True,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'email',
        'key': 'smtp_from_email',
        'value': 'noreply@epic.dm',
        'description': 'Default "From" email address',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'email',
        'key': 'smtp_from_name',
        'value': 'Epic Voice Suite',
        'description': 'Default "From" name',
        'is_secret': False,
        'is_required': False,
        'data_type': 'string'
    },

    # SMS Settings
    {
        'category': 'sms',
        'key': 'sms_provider',
        'value': 'twilio',
        'description': 'SMS provider (twilio, vonage, etc.)',
        'is_secret': False,
        'is_required': False,
        'data_type': 'string',
        'allowed_values': ['twilio', 'vonage', 'telnyx', 'bandwidth']
    },
    {
        'category': 'sms',
        'key': 'sms_api_key',
        'value': '',
        'description': 'SMS provider API key',
        'is_secret': True,
        'is_required': False,
        'data_type': 'string'
    },
    {
        'category': 'sms',
        'key': 'sms_api_secret',
        'value': '',
        'description': 'SMS provider API secret',
        'is_secret': True,
        'is_required': False,
        'data_type': 'string'
    },
    {
        'category': 'sms',
        'key': 'sms_from_number',
        'value': '',
        'description': 'Default SMS sender number',
        'is_secret': False,
        'is_required': False,
        'data_type': 'string'
    },

    # LiveKit Settings
    {
        'category': 'livekit',
        'key': 'livekit_url',
        'value': 'wss://ai-agent-dl6ldsi8.livekit.cloud',
        'description': 'LiveKit server URL',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'livekit',
        'key': 'livekit_api_key',
        'value': 'APIfFhqC7dRApB2',
        'description': 'LiveKit API key',
        'is_secret': True,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'livekit',
        'key': 'livekit_api_secret',
        'value': '',  # Will be populated from .env
        'description': 'LiveKit API secret',
        'is_secret': True,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'livekit',
        'key': 'livekit_webhook_secret',
        'value': '',
        'description': 'LiveKit webhook secret for call outcome recording',
        'is_secret': True,
        'is_required': False,
        'data_type': 'string'
    },

    # System Settings
    {
        'category': 'system',
        'key': 'app_name',
        'value': 'Epic Voice Suite',
        'description': 'Application name',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'system',
        'key': 'app_url',
        'value': 'https://ai.epic.dm',
        'description': 'Application URL',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
    {
        'category': 'system',
        'key': 'support_email',
        'value': 'support@epic.dm',
        'description': 'Support email address',
        'is_secret': False,
        'is_required': True,
        'data_type': 'string'
    },
]
