#!/usr/bin/env python3
"""
Webhook Delivery Service
Processes webhook_events_queue and delivers events to configured endpoints
"""

import os
import sys
import asyncio
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
import aiohttp
from sqlalchemy import create_engine, text
from database import SessionLocal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/webhook_delivery.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
POLL_INTERVAL = int(os.getenv('WEBHOOK_POLL_INTERVAL', '5'))  # seconds
MAX_CONCURRENT_DELIVERIES = int(os.getenv('WEBHOOK_MAX_CONCURRENT', '10'))
REQUEST_TIMEOUT = int(os.getenv('WEBHOOK_REQUEST_TIMEOUT', '30'))  # seconds
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'epic-voice-webhook-secret-change-in-production')


class WebhookDeliveryService:
    """
    Background service that:
    1. Polls webhook_events_queue for pending events
    2. Delivers events to configured partner_webhooks endpoints
    3. Implements retry logic with exponential backoff
    4. Records delivery attempts in webhook_deliveries table
    """

    def __init__(self):
        self.running = False
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_DELIVERIES)

    async def start(self):
        """Start the webhook delivery service"""
        self.running = True
        logger.info("🚀 Webhook Delivery Service started")
        logger.info(f"   Poll interval: {POLL_INTERVAL}s")
        logger.info(f"   Max concurrent: {MAX_CONCURRENT_DELIVERIES}")
        logger.info(f"   Request timeout: {REQUEST_TIMEOUT}s")

        while self.running:
            try:
                await self.process_pending_events()
                await asyncio.sleep(POLL_INTERVAL)
            except KeyboardInterrupt:
                logger.info("⏹️  Shutting down gracefully...")
                self.running = False
                break
            except Exception as e:
                logger.error(f"❌ Error in main loop: {e}")
                import traceback
                traceback.print_exc()
                await asyncio.sleep(POLL_INTERVAL)

    async def process_pending_events(self):
        """Find and process pending webhook events"""
        db = SessionLocal()

        try:
            # Find pending events (unprocessed or ready for retry)
            result = db.execute(text("""
                SELECT
                    id, event_type, event_id, user_id, payload,
                    retry_count, max_retries, last_error
                FROM webhook_events_queue
                WHERE processed_at IS NULL
                  AND retry_count < max_retries
                  AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
                ORDER BY created_at ASC
                LIMIT :limit
            """), {'limit': MAX_CONCURRENT_DELIVERIES * 2})

            events = result.fetchall()

            if not events:
                return  # Nothing to process

            logger.info(f"📋 Found {len(events)} pending webhook events")

            # Process events concurrently
            tasks = []
            for event in events:
                task = asyncio.create_task(self.process_event(
                    event_queue_id=event[0],
                    event_type=event[1],
                    event_id=event[2],
                    user_id=event[3],
                    payload=event[4],
                    retry_count=event[5],
                    max_retries=event[6],
                    last_error=event[7]
                ))
                tasks.append(task)

            # Wait for all deliveries to complete
            await asyncio.gather(*tasks, return_exceptions=True)

        except Exception as e:
            logger.error(f"❌ Error processing pending events: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    async def process_event(self, event_queue_id: str, event_type: str,
                           event_id: str, user_id: str, payload: dict,
                           retry_count: int, max_retries: int,
                           last_error: Optional[str]):
        """Process a single webhook event and deliver to all subscribed endpoints"""
        async with self.semaphore:  # Limit concurrent deliveries
            db = SessionLocal()

            try:
                # Find all webhooks subscribed to this event type for this user
                result = db.execute(text("""
                    SELECT id, url, secret, events, headers, retry_config
                    FROM partner_webhooks
                    WHERE user_id = :user_id
                      AND active = true
                      AND :event_type = ANY(events)
                """), {'user_id': user_id, 'event_type': event_type})

                webhooks = result.fetchall()

                if not webhooks:
                    logger.info(f"ℹ️  No subscribed webhooks for {event_type} (user: {user_id[:8]}...)")
                    # Mark as processed (no subscribers)
                    db.execute(text("""
                        UPDATE webhook_events_queue
                        SET processed_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                    """), {'id': event_queue_id})
                    db.commit()
                    return

                logger.info(f"📤 Delivering {event_type} to {len(webhooks)} webhook(s)")

                # Deliver to each webhook endpoint
                delivery_tasks = []
                for webhook in webhooks:
                    webhook_id = webhook[0]
                    url = webhook[1]
                    secret = webhook[2]
                    headers = webhook[4] or {}
                    retry_config = webhook[5] or {
                        'max_retries': 3,
                        'backoff_multiplier': 2,
                        'initial_delay_seconds': 5
                    }

                    task = asyncio.create_task(self.deliver_to_endpoint(
                        event_queue_id=event_queue_id,
                        webhook_id=webhook_id,
                        url=url,
                        secret=secret,
                        event_type=event_type,
                        event_id=event_id,
                        payload=payload,
                        custom_headers=headers,
                        retry_count=retry_count,
                        retry_config=retry_config
                    ))
                    delivery_tasks.append(task)

                # Wait for all deliveries
                results = await asyncio.gather(*delivery_tasks, return_exceptions=True)

                # Check if all deliveries succeeded
                all_succeeded = all(r is True for r in results if not isinstance(r, Exception))

                if all_succeeded:
                    # Mark event as processed
                    db.execute(text("""
                        UPDATE webhook_events_queue
                        SET processed_at = CURRENT_TIMESTAMP
                        WHERE id = :id
                    """), {'id': event_queue_id})
                    db.commit()
                    logger.info(f"✅ Event {event_id[:8]}... delivered to all webhooks")
                else:
                    # Some deliveries failed - schedule retry
                    retry_count += 1
                    if retry_count < max_retries:
                        # Calculate next retry time (exponential backoff)
                        delay_seconds = retry_config.get('initial_delay_seconds', 5) * \
                                      (retry_config.get('backoff_multiplier', 2) ** (retry_count - 1))
                        next_retry = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)

                        db.execute(text("""
                            UPDATE webhook_events_queue
                            SET retry_count = :retry_count,
                                next_retry_at = :next_retry,
                                last_error = :error
                            WHERE id = :id
                        """), {
                            'id': event_queue_id,
                            'retry_count': retry_count,
                            'next_retry': next_retry,
                            'error': 'Some deliveries failed'
                        })
                        db.commit()
                        logger.warning(f"⚠️  Event {event_id[:8]}... failed, retry {retry_count}/{max_retries} at {next_retry}")
                    else:
                        # Max retries exceeded
                        logger.error(f"❌ Event {event_id[:8]}... failed after {max_retries} retries")

            except Exception as e:
                logger.error(f"❌ Error processing event {event_id[:8]}...: {e}")
                import traceback
                traceback.print_exc()
            finally:
                db.close()

    async def deliver_to_endpoint(self, event_queue_id: str, webhook_id: str,
                                  url: str, secret: str, event_type: str,
                                  event_id: str, payload: dict,
                                  custom_headers: dict, retry_count: int,
                                  retry_config: dict) -> bool:
        """Deliver webhook event to a single endpoint"""
        db = SessionLocal()
        delivery_id = None
        start_time = datetime.now(timezone.utc)

        try:
            # Prepare payload
            webhook_payload = {
                'event_id': event_id,
                'event_type': event_type,
                'timestamp': start_time.isoformat(),
                'data': payload
            }

            payload_json = json.dumps(webhook_payload)

            # Generate HMAC signature
            signature = self.generate_signature(payload_json, secret or WEBHOOK_SECRET)

            # Prepare headers
            headers = {
                'Content-Type': 'application/json',
                'X-Epic-Voice-Event': event_type,
                'X-Epic-Voice-Event-Id': event_id,
                'X-Epic-Voice-Signature': signature,
                'User-Agent': 'Epic-Voice-Webhooks/1.0'
            }

            # Add custom headers
            if custom_headers:
                headers.update(custom_headers)

            # Create delivery record (match schema: no event_id/status columns, use success boolean)
            result = db.execute(text("""
                INSERT INTO webhook_deliveries (
                    id, webhook_id, event_type, payload,
                    success, retry_number
                ) VALUES (
                    gen_random_uuid()::text, :webhook_id, :event_type,
                    CAST(:payload AS jsonb), false, :retry_number
                )
                RETURNING id
            """), {
                'webhook_id': webhook_id,
                'event_type': event_type,
                'payload': json.dumps(webhook_payload),
                'retry_number': retry_count
            })
            delivery_id = result.fetchone()[0]
            db.commit()

            # Make HTTP POST request
            timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, data=payload_json, headers=headers) as response:
                    response_status = response.status
                    response_body = await response.text()
                    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

                    # Check if successful (2xx status code)
                    if 200 <= response_status < 300:
                        # Success (use success=true, response_status instead of status_code)
                        db.execute(text("""
                            UPDATE webhook_deliveries
                            SET success = true,
                                delivered_at = :delivered_at,
                                response_status = :response_status,
                                response_body = :response_body,
                                duration_ms = :duration_ms
                            WHERE id = :id
                        """), {
                            'id': delivery_id,
                            'delivered_at': datetime.now(timezone.utc),
                            'response_status': response_status,
                            'response_body': response_body[:1000],  # Limit response body
                            'duration_ms': duration_ms
                        })
                        db.commit()
                        logger.info(f"✅ Delivered to {url[:50]}... ({response_status}, {duration_ms}ms)")
                        return True
                    else:
                        # Failure (use success=false, response_status, no error_message column)
                        error_message = f"HTTP {response_status}: {response_body[:200]}"
                        db.execute(text("""
                            UPDATE webhook_deliveries
                            SET success = false,
                                response_status = :response_status,
                                response_body = :response_body,
                                duration_ms = :duration_ms,
                                delivered_at = :delivered_at
                            WHERE id = :id
                        """), {
                            'id': delivery_id,
                            'response_status': response_status,
                            'response_body': error_message[:1000],  # Store error in response_body
                            'duration_ms': duration_ms,
                            'delivered_at': datetime.now(timezone.utc)
                        })

                        # Schedule retry if under max_retries
                        if retry_count < retry_config.get('max_retries', 3):
                            delay_seconds = retry_config.get('initial_delay_seconds', 5) * \
                                          (retry_config.get('backoff_multiplier', 2) ** retry_count)
                            next_retry = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)

                            db.execute(text("""
                                UPDATE webhook_deliveries
                                SET next_retry_at = :next_retry
                                WHERE id = :id
                            """), {'id': delivery_id, 'next_retry': next_retry})

                        db.commit()
                        logger.warning(f"⚠️  Failed to deliver to {url[:50]}... ({response_status})")
                        return False

        except asyncio.TimeoutError:
            # Timeout (use success=false, response_body for error)
            error_message = f"Request timeout after {REQUEST_TIMEOUT}s"
            if delivery_id:
                db.execute(text("""
                    UPDATE webhook_deliveries
                    SET success = false,
                        response_body = :response_body,
                        delivered_at = :delivered_at
                    WHERE id = :id
                """), {
                    'id': delivery_id,
                    'response_body': error_message,
                    'delivered_at': datetime.now(timezone.utc)
                })
                db.commit()
            logger.error(f"⏱️  Timeout delivering to {url[:50]}...")
            return False

        except Exception as e:
            # Other errors (network, DNS, etc.) - use success=false, response_body for error
            error_message = f"Error: {str(e)}"
            if delivery_id:
                db.execute(text("""
                    UPDATE webhook_deliveries
                    SET success = false,
                        response_body = :response_body,
                        delivered_at = :delivered_at
                    WHERE id = :id
                """), {
                    'id': delivery_id,
                    'response_body': error_message,
                    'delivered_at': datetime.now(timezone.utc)
                })
                db.commit()
            logger.error(f"❌ Error delivering to {url[:50]}...: {e}")
            return False

        finally:
            db.close()

    def generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload"""
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"

    def stop(self):
        """Stop the service"""
        self.running = False
        logger.info("🛑 Webhook Delivery Service stopped")


async def main():
    """Main entry point"""
    service = WebhookDeliveryService()

    try:
        await service.start()
    except KeyboardInterrupt:
        service.stop()
        logger.info("👋 Goodbye!")


if __name__ == '__main__':
    asyncio.run(main())
