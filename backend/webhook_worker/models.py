"""
Database models for webhook delivery worker.

This module defines SQLAlchemy models for:
- partner_webhooks: Partner webhook endpoint configurations
- webhook_delivery_queue: Queue for pending webhook deliveries
- webhook_delivery_log: Audit log of delivery attempts
"""

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, JSON, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional, Dict, Any

Base = declarative_base()


class PartnerWebhook(Base):
    """Partner webhook endpoint configuration."""

    __tablename__ = 'partner_webhooks'

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Tenant Scoping
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Partner Identity
    partner_name = Column(String(255), nullable=False)
    partner_slug = Column(String(100), nullable=False)

    # Webhook Configuration
    url = Column(Text, nullable=False)
    secret = Column(Text, nullable=False)  # Encrypted at application layer

    # Event Filters
    enabled_events = Column(JSON, nullable=False, default=[])

    # White-Label Settings
    custom_payload_fields = Column(JSON, nullable=True)

    # Status
    enabled = Column(Boolean, nullable=False, default=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    updatedAt = Column('updatedAt', DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_pw_user_enabled', 'userId', 'enabled'),
        Index('idx_pw_slug', 'partner_slug'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'id': self.id,
            'userId': self.userId,
            'partner_name': self.partner_name,
            'partner_slug': self.partner_slug,
            'url': self.url,
            'enabled_events': self.enabled_events,
            'custom_payload_fields': self.custom_payload_fields,
            'enabled': self.enabled,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'updatedAt': self.updatedAt.isoformat() if self.updatedAt else None,
        }


class WebhookDeliveryQueue(Base):
    """Queue for pending webhook deliveries with retry management."""

    __tablename__ = 'webhook_delivery_queue'

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Tenant Scoping
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    partnerId = Column('partnerId', String(36), ForeignKey('partner_webhooks.id', ondelete='CASCADE'), nullable=True)

    # Webhook Configuration
    url = Column(Text, nullable=False)
    secret = Column(Text, nullable=False)  # Encrypted at application layer

    # Event Data
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=False)

    # Delivery Status
    status = Column(String(50), nullable=False, default='pending', index=True)

    # Retry Management
    attempt_count = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=5)
    next_retry_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Delivery Tracking
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    last_response_status = Column(Integer, nullable=True)
    last_response_body = Column(Text, nullable=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    scheduledAt = Column('scheduledAt', DateTime(timezone=True), nullable=False, server_default=func.now())
    deliveredAt = Column('deliveredAt', DateTime(timezone=True), nullable=True)
    updatedAt = Column('updatedAt', DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # Critical index for worker polling query
        Index('idx_wdq_status_next_retry', 'userId', 'status', 'next_retry_at'),
        Index('idx_wdq_partner_status', 'partnerId', 'status'),
        Index('idx_wdq_created', 'createdAt'),
        Index('idx_wdq_dead_letter', 'status', 'createdAt'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'id': self.id,
            'userId': self.userId,
            'partnerId': self.partnerId,
            'url': self.url,
            'event_type': self.event_type,
            'payload': self.payload,
            'status': self.status,
            'attempt_count': self.attempt_count,
            'max_attempts': self.max_attempts,
            'next_retry_at': self.next_retry_at.isoformat() if self.next_retry_at else None,
            'last_attempt_at': self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            'last_error': self.last_error,
            'last_response_status': self.last_response_status,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'scheduledAt': self.scheduledAt.isoformat() if self.scheduledAt else None,
            'deliveredAt': self.deliveredAt.isoformat() if self.deliveredAt else None,
            'updatedAt': self.updatedAt.isoformat() if self.updatedAt else None,
        }


class WebhookDeliveryLog(Base):
    """Immutable audit log of webhook delivery attempts."""

    __tablename__ = 'webhook_delivery_log'

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Foreign Keys
    webhookQueueId = Column('webhookQueueId', String(36), ForeignKey('webhook_delivery_queue.id', ondelete='CASCADE'), nullable=True, index=True)
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Delivery Attempt
    attempt_number = Column(Integer, nullable=False)
    attempt_timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Request Details
    url = Column(Text, nullable=False)
    request_headers = Column(JSON, nullable=True)
    request_payload = Column(JSON, nullable=True)

    # Response Details
    response_status = Column(Integer, nullable=True)
    response_headers = Column(JSON, nullable=True)
    response_body = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)

    # Error Details
    error_message = Column(Text, nullable=True)
    network_error = Column(Boolean, default=False)

    # Result
    success = Column(Boolean, nullable=False)

    # Timestamps
    createdAt = Column('createdAt', DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index('idx_wdl_user_timestamp', 'userId', 'attempt_timestamp'),
        Index('idx_wdl_success', 'success', 'attempt_timestamp'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'id': self.id,
            'webhookQueueId': self.webhookQueueId,
            'userId': self.userId,
            'attempt_number': self.attempt_number,
            'attempt_timestamp': self.attempt_timestamp.isoformat() if self.attempt_timestamp else None,
            'url': self.url,
            'response_status': self.response_status,
            'response_time_ms': self.response_time_ms,
            'error_message': self.error_message,
            'network_error': self.network_error,
            'success': self.success,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
        }
