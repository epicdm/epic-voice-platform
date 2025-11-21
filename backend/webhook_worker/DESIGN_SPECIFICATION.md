# Webhook Delivery Worker - Design Specification

**Version**: 1.0.0
**Date**: 2025-10-29
**Status**: Design Complete

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Queue Schema Design](#queue-schema-design)
4. [Retry Strategy Design](#retry-strategy-design)
5. [HMAC Signing Design](#hmac-signing-design)
6. [Tenant Scoping Design](#tenant-scoping-design)
7. [Systemd Integration Design](#systemd-integration-design)
8. [Implementation Specifications](#implementation-specifications)
9. [Deployment Architecture](#deployment-architecture)
10. [Monitoring & Observability](#monitoring--observability)

---

## System Overview

### Purpose

The Webhook Delivery Worker is a queue-based background service that reliably delivers webhook events to partner endpoints with retry logic, HMAC signing, and multi-tenant isolation.

### Key Requirements

1. **Reliable Delivery**: Queue-based architecture with persistent storage
2. **Retry Strategy**: Exponential backoff with configurable max attempts
3. **Security**: HMAC-SHA256 signing for webhook authenticity
4. **Multi-Tenancy**: Tenant-scoped webhooks with isolation
5. **Observability**: Logging, metrics, and health monitoring
6. **White-Label Support**: Partner-specific webhook configurations
7. **System Integration**: Systemd service with graceful shutdown

### Design Principles

- **Reliability First**: At-least-once delivery guarantee
- **Idempotency**: Partners must handle duplicate deliveries
- **Fail Fast**: Dead letter queue for unrecoverable failures
- **Horizontal Scalability**: Multiple workers with queue distribution
- **Zero Downtime**: Graceful shutdown and restart

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Flask API     │  │ Agent System   │  │ Call Outcomes    │  │
│  │  (Enqueue)     │  │  (Enqueue)     │  │   (Enqueue)      │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬─────────┘  │
│           │                   │                    │             │
│           └───────────────────┼────────────────────┘             │
│                               ▼                                  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Queue Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Queue Table                       │   │
│  │  (webhook_delivery_queue with SKIP LOCKED)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Worker Layer (Systemd)                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   Worker 1     │  │   Worker 2     │  │   Worker N       │  │
│  │  (Poll Queue)  │  │  (Poll Queue)  │  │  (Poll Queue)    │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬─────────┘  │
│           │                   │                    │             │
│           └───────────────────┼────────────────────┘             │
│                               ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Webhook Delivery Service                        │   │
│  │  - HMAC Signing                                          │   │
│  │  - HTTP Client (requests)                                │   │
│  │  - Retry Logic                                           │   │
│  │  - Metrics Collection                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Partner Endpoints                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Partner A     │  │  Partner B     │  │  Partner N       │  │
│  │  webhook.com/a │  │  webhook.com/b │  │  webhook.com/n   │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Application Layer**:
- Enqueue webhook events with tenant context
- Validate payload structure
- Store event metadata

**Queue Layer**:
- Persistent storage of pending webhooks
- SKIP LOCKED for concurrent worker safety
- Priority ordering by scheduled delivery time

**Worker Layer**:
- Poll queue for pending webhooks
- Execute delivery with HMAC signing
- Handle retries with exponential backoff
- Update delivery status

**Partner Endpoints**:
- Receive webhook POST requests
- Validate HMAC signature
- Return 2xx for successful delivery

---

## Queue Schema Design

### Database Table: `webhook_delivery_queue`

```sql
CREATE TABLE webhook_delivery_queue (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Tenant Scoping
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "partnerId" VARCHAR(36) REFERENCES partner_webhooks(id) ON DELETE CASCADE,

    -- Webhook Configuration
    url TEXT NOT NULL,
    secret TEXT NOT NULL,  -- Encrypted at rest (application layer)

    -- Event Data
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: 'pending', 'processing', 'delivered', 'failed', 'dead_letter'

    -- Retry Management
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    -- Delivery Tracking
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    last_response_status INTEGER,
    last_response_body TEXT,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes for Performance
    INDEX idx_wdq_status_next_retry ("userId", status, next_retry_at),
    INDEX idx_wdq_partner_status ("partnerId", status),
    INDEX idx_wdq_event_type (event_type),
    INDEX idx_wdq_created ("createdAt"),

    -- Constraints
    CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')),
    CHECK (attempt_count >= 0),
    CHECK (max_attempts > 0)
);
```

### Queue States

```
pending ──────► processing ──────► delivered
   │                 │
   │                 │ (retry)
   │                 ▼
   │            failed ──────► dead_letter
   │                 │
   └─────────────────┘
```

**State Transitions**:
- `pending` → `processing`: Worker picks up webhook
- `processing` → `delivered`: Successful 2xx response
- `processing` → `failed`: Non-2xx response (attempt < max_attempts)
- `failed` → `processing`: Retry attempt
- `processing` → `dead_letter`: Max attempts exceeded

### Queue Operations

**Enqueue Webhook**:
```python
def enqueue_webhook(
    user_id: str,
    partner_id: str,
    event_type: str,
    payload: dict,
    url: str,
    secret: str,
    max_attempts: int = 5
) -> str:
    """Enqueue webhook for delivery."""
    webhook = WebhookDeliveryQueue(
        id=str(uuid.uuid4()),
        userId=user_id,
        partnerId=partner_id,
        url=url,
        secret=secret,
        event_type=event_type,
        payload=payload,
        status='pending',
        attempt_count=0,
        max_attempts=max_attempts,
        scheduledAt=datetime.utcnow(),
        next_retry_at=datetime.utcnow()
    )
    db.session.add(webhook)
    db.session.commit()
    return webhook.id
```

**Dequeue for Processing** (with SKIP LOCKED):
```python
def dequeue_webhook(worker_id: str, batch_size: int = 10) -> List[WebhookDeliveryQueue]:
    """Dequeue webhooks for processing (SKIP LOCKED)."""
    webhooks = db.session.query(WebhookDeliveryQueue).filter(
        WebhookDeliveryQueue.status.in_(['pending', 'failed']),
        WebhookDeliveryQueue.next_retry_at <= datetime.utcnow()
    ).order_by(
        WebhookDeliveryQueue.next_retry_at.asc()
    ).limit(batch_size).with_for_update(
        skip_locked=True  # ← PostgreSQL SKIP LOCKED for concurrency
    ).all()

    # Mark as processing
    for webhook in webhooks:
        webhook.status = 'processing'
        webhook.last_attempt_at = datetime.utcnow()

    db.session.commit()
    return webhooks
```

---

## Retry Strategy Design

### Exponential Backoff Algorithm

**Formula**: `next_retry = now + (base_delay * 2^attempt) + jitter`

**Configuration**:
- `base_delay`: 30 seconds
- `max_delay`: 1 hour
- `max_attempts`: 5
- `jitter`: ±10% randomization

**Retry Schedule**:
```
Attempt 1: 30s   (base)
Attempt 2: 60s   (30 * 2^1)
Attempt 3: 120s  (30 * 2^2)
Attempt 4: 240s  (30 * 2^3)
Attempt 5: 480s  (30 * 2^4, capped at 1 hour)
```

### Implementation

```python
import random
from datetime import datetime, timedelta

class RetryStrategy:
    """Exponential backoff retry strategy."""

    BASE_DELAY_SECONDS = 30
    MAX_DELAY_SECONDS = 3600  # 1 hour
    MAX_ATTEMPTS = 5
    JITTER_PERCENT = 0.1  # ±10%

    @classmethod
    def calculate_next_retry(cls, attempt_count: int) -> datetime:
        """Calculate next retry timestamp with exponential backoff."""
        if attempt_count >= cls.MAX_ATTEMPTS:
            return None  # No more retries

        # Exponential backoff: base * 2^attempt
        delay = cls.BASE_DELAY_SECONDS * (2 ** attempt_count)

        # Cap at max delay
        delay = min(delay, cls.MAX_DELAY_SECONDS)

        # Add jitter (±10%)
        jitter = delay * cls.JITTER_PERCENT
        delay += random.uniform(-jitter, jitter)

        return datetime.utcnow() + timedelta(seconds=delay)

    @classmethod
    def should_retry(cls, attempt_count: int, response_status: int) -> bool:
        """Determine if webhook should be retried."""
        # Max attempts exceeded
        if attempt_count >= cls.MAX_ATTEMPTS:
            return False

        # Retry on 5xx server errors
        if 500 <= response_status < 600:
            return True

        # Retry on 429 rate limit
        if response_status == 429:
            return True

        # Retry on network errors (status 0)
        if response_status == 0:
            return True

        # Do NOT retry on 4xx client errors (except 429)
        if 400 <= response_status < 500:
            return False

        # Retry on other non-2xx responses
        return response_status < 200 or response_status >= 300
```

### Retry Decision Matrix

| Status Code | Action | Reason |
|-------------|--------|--------|
| 200-299 | ✅ Delivered | Success |
| 400-499 (except 429) | ❌ Dead Letter | Client error, won't succeed on retry |
| 429 | 🔄 Retry | Rate limit, will succeed later |
| 500-599 | 🔄 Retry | Server error, transient issue |
| Network Error | 🔄 Retry | Timeout, DNS failure, connection refused |

---

## HMAC Signing Design

### Signature Generation

**Algorithm**: HMAC-SHA256
**Header**: `X-Webhook-Signature`
**Format**: Hex-encoded digest

### Implementation

```python
import hmac
import hashlib
import json
from typing import Tuple

class WebhookSigner:
    """HMAC-SHA256 webhook signature generator."""

    @staticmethod
    def generate_signature(payload: dict, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload."""
        # Serialize payload to JSON (canonical format)
        payload_bytes = json.dumps(
            payload,
            sort_keys=True,  # Deterministic ordering
            separators=(',', ':')  # No whitespace
        ).encode('utf-8')

        # Generate HMAC-SHA256
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        return signature

    @staticmethod
    def verify_signature(
        payload_bytes: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify HMAC-SHA256 signature (constant-time comparison)."""
        expected = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        # Timing-attack safe comparison
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def prepare_signed_request(
        url: str,
        payload: dict,
        secret: str
    ) -> Tuple[str, dict, dict]:
        """Prepare signed HTTP request."""
        signature = WebhookSigner.generate_signature(payload, secret)

        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'User-Agent': 'EpicVoiceSuite-Webhook/1.0'
        }

        return url, payload, headers
```

### Signature Verification (Partner Side)

Partners receiving webhooks should verify signatures:

```python
# Partner implementation example
import hmac
import hashlib

def verify_webhook_signature(request):
    """Verify incoming webhook signature."""
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.environ.get('WEBHOOK_SECRET')

    payload_bytes = request.data  # Raw request body

    expected = hmac.new(
        secret.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return False, "Invalid signature"

    return True, "Valid signature"
```

---

## Tenant Scoping Design

### Multi-Tenant Isolation

**Principles**:
1. **User-Level Isolation**: All webhooks scoped by `userId`
2. **Partner-Level Configuration**: Each partner has unique webhook URL and secret
3. **White-Label Support**: Partners can have custom branding in webhook payloads
4. **Data Separation**: Queue queries always filter by `userId`

### Database Design

**Partner Webhook Configuration Table**:
```sql
CREATE TABLE partner_webhooks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Partner Identity
    partner_name VARCHAR(255) NOT NULL,
    partner_slug VARCHAR(100) NOT NULL,

    -- Webhook Configuration
    url TEXT NOT NULL,
    secret TEXT NOT NULL,  -- Encrypted at rest

    -- Event Filters
    enabled_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: ["call.completed", "call.failed", "recording.ready"]

    -- White-Label Settings
    custom_payload_fields JSONB,
    -- Example: {"brand": "MyBrand", "environment": "production"}

    -- Status
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE ("userId", partner_slug),
    INDEX idx_pw_user_enabled ("userId", enabled)
);
```

### Tenant-Scoped Enqueue

```python
def enqueue_webhook_for_user(
    user_id: str,
    event_type: str,
    payload: dict
) -> List[str]:
    """Enqueue webhooks for all enabled partners of a user."""
    # Query enabled partner webhooks for this user
    partners = db.session.query(PartnerWebhook).filter(
        PartnerWebhook.userId == user_id,
        PartnerWebhook.enabled == True,
        PartnerWebhook.enabled_events.contains([event_type])
    ).all()

    webhook_ids = []
    for partner in partners:
        # Add white-label custom fields
        enriched_payload = {
            **payload,
            'partner': {
                'name': partner.partner_name,
                'slug': partner.partner_slug
            }
        }

        if partner.custom_payload_fields:
            enriched_payload.update(partner.custom_payload_fields)

        # Enqueue webhook
        webhook_id = enqueue_webhook(
            user_id=user_id,
            partner_id=partner.id,
            event_type=event_type,
            payload=enriched_payload,
            url=partner.url,
            secret=partner.secret
        )
        webhook_ids.append(webhook_id)

    return webhook_ids
```

### Security Considerations

**Secret Storage**:
- Store webhook secrets encrypted at rest (application-layer encryption)
- Use environment-specific encryption keys
- Rotate secrets periodically

**Access Control**:
- Users can only access their own webhooks
- Admin users can view all webhooks (audit)
- Partner secrets never exposed in API responses

---

## Systemd Integration Design

### Service Unit File

**File**: `/etc/systemd/system/webhook-worker@.service`

```ini
[Unit]
Description=Webhook Delivery Worker (Instance %i)
After=network.target postgresql.service
Wants=postgresql.service
PartOf=webhook-worker.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/livekit1

# Environment
EnvironmentFile=/etc/webhook-worker/webhook-worker.env

# Execution
ExecStart=/opt/livekit1/venv/bin/python3 /opt/livekit1/backend/webhook_worker/worker.py --instance %i
ExecReload=/bin/kill -HUP $MAINPID

# Restart Policy
Restart=always
RestartSec=10
StartLimitBurst=5
StartLimitInterval=60

# Resource Limits
MemoryLimit=512M
CPUQuota=50%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=webhook-worker-%i

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/livekit1/logs

[Install]
WantedBy=webhook-worker.target
```

### Target Unit (Multi-Instance)

**File**: `/etc/systemd/system/webhook-worker.target`

```ini
[Unit]
Description=Webhook Delivery Worker Target
Wants=webhook-worker@1.service webhook-worker@2.service webhook-worker@3.service

[Install]
WantedBy=multi-user.target
```

### Environment File

**File**: `/etc/webhook-worker/webhook-worker.env`

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/epic_voice_db

# Worker Configuration
WORKER_POLL_INTERVAL=5
WORKER_BATCH_SIZE=10
WORKER_TIMEOUT=30

# Retry Configuration
RETRY_BASE_DELAY=30
RETRY_MAX_DELAY=3600
RETRY_MAX_ATTEMPTS=5

# HTTP Configuration
HTTP_TIMEOUT=30
HTTP_MAX_RETRIES=3
HTTP_POOL_SIZE=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=/opt/livekit1/logs/webhook-worker.log

# Metrics (optional)
METRICS_ENABLED=true
METRICS_PORT=9090
```

### Systemd Commands

```bash
# Enable webhook worker target
sudo systemctl enable webhook-worker.target

# Start all workers
sudo systemctl start webhook-worker.target

# Start individual worker
sudo systemctl start webhook-worker@1.service

# Stop all workers
sudo systemctl stop webhook-worker.target

# Restart all workers
sudo systemctl restart webhook-worker.target

# Check status
sudo systemctl status webhook-worker.target
sudo systemctl status webhook-worker@1.service

# View logs
sudo journalctl -u webhook-worker@1.service -f

# Reload configuration
sudo systemctl daemon-reload
```

---

## Implementation Specifications

### Worker Main Loop

```python
#!/usr/bin/env python3
"""
Webhook Delivery Worker
Polls queue and delivers webhooks with retry logic.
"""

import os
import sys
import time
import signal
import logging
import argparse
from datetime import datetime
from typing import List, Optional

import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.webhook_worker.models import WebhookDeliveryQueue
from backend.webhook_worker.signer import WebhookSigner
from backend.webhook_worker.retry import RetryStrategy

# Configuration from environment
DATABASE_URL = os.environ.get('DATABASE_URL')
POLL_INTERVAL = int(os.environ.get('WORKER_POLL_INTERVAL', 5))
BATCH_SIZE = int(os.environ.get('WORKER_BATCH_SIZE', 10))
TIMEOUT = int(os.environ.get('HTTP_TIMEOUT', 30))

# Logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    format='%(asctime)s [%(levelname)s] [Worker-%(worker_id)s] %(message)s'
)

class WebhookWorker:
    """Webhook delivery worker with retry logic."""

    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.running = True
        self.logger = logging.getLogger(__name__)

        # Database
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        self.Session = sessionmaker(bind=engine)

        # HTTP client
        self.http = requests.Session()
        self.http.headers.update({
            'User-Agent': f'EpicVoiceSuite-Webhook/1.0 (Worker-{worker_id})'
        })

        # Signal handling for graceful shutdown
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)

    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False

    def run(self):
        """Main worker loop."""
        self.logger.info(f"Worker {self.worker_id} started")

        while self.running:
            try:
                # Dequeue webhooks
                webhooks = self.dequeue_webhooks()

                if webhooks:
                    self.logger.info(f"Processing {len(webhooks)} webhooks")

                    # Process each webhook
                    for webhook in webhooks:
                        if not self.running:
                            break
                        self.process_webhook(webhook)
                else:
                    # No webhooks, sleep
                    time.sleep(POLL_INTERVAL)

            except Exception as e:
                self.logger.error(f"Worker error: {e}", exc_info=True)
                time.sleep(POLL_INTERVAL)

        self.logger.info(f"Worker {self.worker_id} stopped")

    def dequeue_webhooks(self) -> List[WebhookDeliveryQueue]:
        """Dequeue webhooks for processing (SKIP LOCKED)."""
        db = self.Session()
        try:
            webhooks = db.query(WebhookDeliveryQueue).filter(
                WebhookDeliveryQueue.status.in_(['pending', 'failed']),
                WebhookDeliveryQueue.next_retry_at <= datetime.utcnow()
            ).order_by(
                WebhookDeliveryQueue.next_retry_at.asc()
            ).limit(BATCH_SIZE).with_for_update(
                skip_locked=True
            ).all()

            # Mark as processing
            for webhook in webhooks:
                webhook.status = 'processing'
                webhook.last_attempt_at = datetime.utcnow()
                webhook.attempt_count += 1

            db.commit()
            return webhooks

        except Exception as e:
            self.logger.error(f"Dequeue error: {e}")
            db.rollback()
            return []
        finally:
            db.close()

    def process_webhook(self, webhook: WebhookDeliveryQueue):
        """Process single webhook delivery."""
        self.logger.info(
            f"Delivering webhook {webhook.id} "
            f"(attempt {webhook.attempt_count}/{webhook.max_attempts})"
        )

        db = self.Session()
        try:
            # Prepare signed request
            url, payload, headers = WebhookSigner.prepare_signed_request(
                webhook.url,
                webhook.payload,
                webhook.secret
            )

            # Deliver webhook
            response = self.http.post(
                url,
                json=payload,
                headers=headers,
                timeout=TIMEOUT
            )

            # Handle response
            self.handle_response(db, webhook, response)

        except requests.Timeout:
            self.logger.warning(f"Webhook {webhook.id} timed out")
            self.handle_failure(db, webhook, 0, "Request timeout")

        except requests.RequestException as e:
            self.logger.warning(f"Webhook {webhook.id} failed: {e}")
            self.handle_failure(db, webhook, 0, str(e))

        except Exception as e:
            self.logger.error(f"Unexpected error: {e}", exc_info=True)
            self.handle_failure(db, webhook, 0, str(e))

        finally:
            db.close()

    def handle_response(
        self,
        db: Session,
        webhook: WebhookDeliveryQueue,
        response: requests.Response
    ):
        """Handle HTTP response."""
        webhook.last_response_status = response.status_code
        webhook.last_response_body = response.text[:1000]  # Limit size

        # Success (2xx)
        if 200 <= response.status_code < 300:
            webhook.status = 'delivered'
            webhook.deliveredAt = datetime.utcnow()
            webhook.last_error = None
            self.logger.info(f"Webhook {webhook.id} delivered successfully")

        # Failure
        else:
            self.handle_failure(
                db,
                webhook,
                response.status_code,
                f"HTTP {response.status_code}: {response.text[:200]}"
            )

        db.commit()

    def handle_failure(
        self,
        db: Session,
        webhook: WebhookDeliveryQueue,
        status_code: int,
        error_message: str
    ):
        """Handle webhook delivery failure."""
        webhook.last_error = error_message

        # Check if should retry
        if RetryStrategy.should_retry(webhook.attempt_count, status_code):
            # Calculate next retry
            next_retry = RetryStrategy.calculate_next_retry(webhook.attempt_count)

            if next_retry:
                webhook.status = 'failed'
                webhook.next_retry_at = next_retry
                self.logger.info(
                    f"Webhook {webhook.id} will retry at {next_retry} "
                    f"(attempt {webhook.attempt_count + 1}/{webhook.max_attempts})"
                )
            else:
                # Max attempts exceeded
                webhook.status = 'dead_letter'
                self.logger.error(
                    f"Webhook {webhook.id} moved to dead letter queue "
                    f"(max attempts exceeded)"
                )
        else:
            # Non-retryable error (4xx client error)
            webhook.status = 'dead_letter'
            self.logger.warning(
                f"Webhook {webhook.id} moved to dead letter queue "
                f"(non-retryable error: {status_code})"
            )

        db.commit()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Webhook Delivery Worker')
    parser.add_argument('--instance', required=True, help='Worker instance ID')
    args = parser.parse_args()

    worker = WebhookWorker(worker_id=args.instance)
    worker.run()


if __name__ == '__main__':
    main()
```

---

## Deployment Architecture

### Horizontal Scaling

**Multiple Worker Instances**:
```
webhook-worker@1.service  (Worker 1)
webhook-worker@2.service  (Worker 2)
webhook-worker@3.service  (Worker 3)
```

**Load Distribution**:
- PostgreSQL `SKIP LOCKED` ensures no duplicate processing
- Each worker polls independently
- Workers compete for queue items

**Scaling Strategy**:
```bash
# Add more workers
sudo systemctl start webhook-worker@4.service
sudo systemctl start webhook-worker@5.service

# Update target to include new workers
# Edit /etc/systemd/system/webhook-worker.target
Wants=webhook-worker@1.service webhook-worker@2.service ... webhook-worker@5.service
```

### High Availability

**Database**:
- PostgreSQL with replication (read replicas for queue queries)
- Connection pooling (SQLAlchemy pool_pre_ping=True)

**Workers**:
- Systemd auto-restart on failure
- Health checks via metrics endpoint
- Graceful shutdown (SIGTERM handling)

**Monitoring**:
- Prometheus metrics export
- Grafana dashboards
- Alerting on dead letter queue growth

---

## Monitoring & Observability

### Metrics

**Prometheus Metrics** (Optional):
```python
from prometheus_client import Counter, Histogram, Gauge

# Counters
webhooks_enqueued = Counter('webhooks_enqueued_total', 'Total webhooks enqueued', ['user_id', 'event_type'])
webhooks_delivered = Counter('webhooks_delivered_total', 'Total webhooks delivered', ['user_id', 'partner_id'])
webhooks_failed = Counter('webhooks_failed_total', 'Total webhooks failed', ['user_id', 'partner_id', 'status_code'])

# Histograms
delivery_duration = Histogram('webhook_delivery_duration_seconds', 'Webhook delivery duration', ['partner_id'])

# Gauges
queue_size = Gauge('webhook_queue_size', 'Current queue size', ['status'])
```

### Logging

**Log Levels**:
- `INFO`: Normal operations (enqueue, deliver, retry)
- `WARNING`: Retryable failures
- `ERROR`: Dead letter queue moves, unexpected errors

**Log Format**:
```
2025-10-29 15:30:45 [INFO] [Worker-1] Delivering webhook abc123 (attempt 1/5)
2025-10-29 15:30:46 [INFO] [Worker-1] Webhook abc123 delivered successfully
2025-10-29 15:30:47 [WARNING] [Worker-2] Webhook def456 failed: HTTP 503
2025-10-29 15:30:47 [INFO] [Worker-2] Webhook def456 will retry at 2025-10-29 15:31:17
```

### Health Checks

**Systemd Health**:
```bash
# Check if workers are running
systemctl is-active webhook-worker@1.service

# Check worker logs
journalctl -u webhook-worker@1.service -n 50
```

**Queue Health**:
```sql
-- Check queue depth
SELECT status, COUNT(*) FROM webhook_delivery_queue GROUP BY status;

-- Check old pending webhooks
SELECT COUNT(*) FROM webhook_delivery_queue
WHERE status = 'pending' AND "createdAt" < NOW() - INTERVAL '1 hour';

-- Check dead letter queue
SELECT COUNT(*) FROM webhook_delivery_queue WHERE status = 'dead_letter';
```

---

## Summary

### Key Design Decisions

1. **PostgreSQL Queue**: Native database queue with SKIP LOCKED for concurrency
2. **Exponential Backoff**: Industry-standard retry strategy with jitter
3. **HMAC-SHA256**: Secure webhook signing for authenticity
4. **Systemd Integration**: Production-ready service management
5. **Multi-Tenant**: User-scoped webhooks with partner configurations
6. **Horizontal Scaling**: Multiple worker instances with no coordination required

### Design Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| PostgreSQL Queue | Simple, no additional dependencies | Not as fast as Redis/RabbitMQ |
| SKIP LOCKED | Automatic concurrency control | PostgreSQL 9.5+ required |
| Systemd | Native Linux service management | Linux-only deployment |
| Exponential Backoff | Industry best practice | Delays can accumulate |
| At-Least-Once | Guaranteed delivery | Partners must handle duplicates |

### Next Steps

1. **Implementation**: Build worker.py based on specification
2. **Testing**: Unit tests, integration tests, load tests
3. **Deployment**: Create systemd units, environment files
4. **Monitoring**: Set up Prometheus + Grafana dashboards
5. **Documentation**: API docs for enqueueing webhooks

---

**Design Status**: ✅ Complete
**Ready for Implementation**: Yes
**Estimated Implementation Time**: 2-3 days
**Estimated Testing Time**: 1-2 days

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
**Status**: Design Complete - Ready for Implementation
