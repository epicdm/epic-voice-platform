#!/usr/bin/env python3
"""
Campaign Execution Engine
Automatically processes scheduled campaign calls and dispatches them to LiveKit
"""

import os
import sys
import time
import uuid
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt

# Database imports
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import SessionLocal
from webhook_events import trigger_webhook_event

# LiveKit imports
from livekit import api
from livekit.protocol.sip import CreateSIPParticipantRequest

# Webhook imports
from webhook_events import trigger_webhook_event

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/campaign_engine.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('CampaignEngine')


class CampaignEngine:
    """
    Background worker that processes scheduled campaign calls
    """

    def __init__(self):
        self.livekit_url = os.getenv('LIVEKIT_URL')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

        # Configuration
        self.poll_interval = int(os.getenv('CAMPAIGN_POLL_INTERVAL', '30'))  # seconds
        self.max_concurrent_calls = int(os.getenv('CAMPAIGN_MAX_CONCURRENT', '5'))
        self.call_timeout = int(os.getenv('CAMPAIGN_CALL_TIMEOUT', '300'))  # 5 minutes

        # Validate LiveKit credentials
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            raise ValueError("LiveKit credentials not configured")

        logger.info("Campaign Engine initialized")
        logger.info(f"Poll interval: {self.poll_interval}s")
        logger.info(f"Max concurrent calls: {self.max_concurrent_calls}")

    def generate_access_token(self, grant: Dict[str, Any]) -> str:
        """Generate JWT token for LiveKit API"""
        return jwt.encode(
            payload={
                "exp": int(time.time()) + 86400,  # 24 hours
                "iss": self.livekit_api_key,
                "video": grant
            },
            key=self.livekit_api_secret,
            algorithm="HS256"
        )

    async def create_outbound_call(
        self,
        campaign_call_id: str,
        lead_phone: str,
        agent_id: str,
        user_id: str,
        from_number: str = "+17678183366"
    ) -> Dict[str, Any]:
        """
        Create an outbound call using LiveKit SIP API

        Returns:
            dict with success status, call_id, room_name, and error if any
        """
        db = SessionLocal()

        try:
            # Get agent configuration
            result = db.execute(text("""
                SELECT id, name, voice, "llmModel"
                FROM agent_configs
                WHERE id = :agent_id AND "userId" = :user_id AND "isActive" = true
            """), {'agent_id': agent_id, 'user_id': user_id})

            agent = result.fetchone()
            if not agent:
                return {
                    'success': False,
                    'error': 'Agent not found or inactive'
                }

            agent_name = agent[1]

            # Get SIP trunk configuration
            result = db.execute(text("""
                SELECT "trunkId" FROM sip_configs
                WHERE "userId" = :user_id AND "isDefault" = true AND "outboundEnabled" = true
                LIMIT 1
            """), {'user_id': user_id})

            sip_config = result.fetchone()
            if sip_config:
                sip_trunk_id = sip_config[0]
            else:
                # Fallback to environment variable
                sip_trunk_id = os.getenv('SIP_OUTBOUND_TRUNK_ID')

            if not sip_trunk_id:
                return {
                    'success': False,
                    'error': 'No SIP trunk configured'
                }

            # Format phone numbers
            to_number = lead_phone if lead_phone.startswith('+') else f'+{lead_phone}'
            if not from_number.startswith('+'):
                from_number = f'+{from_number}'

            # Create unique room name
            room_name = f"campaign-{campaign_call_id}-{str(uuid.uuid4())[:8]}"

            # Step 1: Create room
            api_url = self.livekit_url.replace('wss://', 'https://').replace('ws://', 'http://').rstrip('/')

            lk_api = api.LiveKitAPI(
                api_url,
                self.livekit_api_key,
                self.livekit_api_secret
            )

            try:
                # Create room
                await lk_api.room.create_room(api.CreateRoomRequest(name=room_name))
                logger.info(f"✅ Room created: {room_name}")

                # Step 2: Create SIP participant
                participant_identity = f"campaign-{campaign_call_id}"
                participant_name = f"Agent {agent_name}"

                request = CreateSIPParticipantRequest(
                    sip_trunk_id=sip_trunk_id,
                    sip_call_to=to_number,
                    sip_number=from_number,
                    room_name=room_name,
                    participant_identity=participant_identity,
                    participant_name=participant_name
                )

                participant = await lk_api.sip.create_sip_participant(request)

                logger.info(f"✅ SIP call created for campaign call {campaign_call_id}")
                logger.info(f"   Calling: {to_number} from {from_number}")
                logger.info(f"   SIP Call ID: {participant.sip_call_id}")
                logger.info(f"   Room: {room_name}")

                # Create call log entry with direction='outbound'
                call_id = str(uuid.uuid4())
                db.execute(text("""
                    INSERT INTO call_logs (
                        id, "userId", "agentConfigId", "phoneNumber",
                        "livekitRoomName", "startedAt", direction
                    ) VALUES (
                        :id, :user_id, :agent_id, :phone_number,
                        :room_name, :started_at, :direction
                    )
                """), {
                    'id': call_id,
                    'user_id': user_id,
                    'agent_id': agent_id,
                    'phone_number': to_number,
                    'room_name': room_name,
                    'started_at': datetime.now(timezone.utc),
                    'direction': 'outbound'
                })
                db.commit()

                return {
                    'success': True,
                    'call_id': call_id,
                    'room_name': room_name,
                    'sip_call_id': participant.sip_call_id
                }

            finally:
                await lk_api.aclose()

        except Exception as e:
            logger.error(f"❌ Error creating outbound call: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            db.close()

    def get_scheduled_calls(self, db) -> list:
        """
        Get campaign calls that are ready to be executed

        Returns calls where:
        - status = 'scheduled'
        - scheduled_for <= now
        - campaign status in ('scheduled', 'running')
        """
        result = db.execute(text("""
            SELECT
                cc.id,
                cc.campaign_id,
                cc.lead_id,
                cc.scheduled_for,
                l.phone_number,
                l.user_id,
                c.agent_id,
                c.status as campaign_status
            FROM campaign_calls cc
            JOIN leads l ON cc.lead_id = l.id
            JOIN campaigns c ON cc.campaign_id = c.id
            WHERE cc.status = 'scheduled'
              AND cc.scheduled_for <= :now
              AND c.status IN ('scheduled', 'running')
            ORDER BY cc.scheduled_for ASC
            LIMIT :limit
        """), {
            'now': datetime.now(timezone.utc),
            'limit': self.max_concurrent_calls
        })

        return result.fetchall()

    def update_call_status(
        self,
        db,
        campaign_call_id: str,
        status: str,
        call_log_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        livekit_room_name: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Update campaign_calls record status"""
        update_fields = ['status = :status', 'attempted_at = :attempted_at']
        params = {
            'campaign_call_id': campaign_call_id,
            'status': status,
            'attempted_at': datetime.now(timezone.utc)
        }

        if call_log_id:
            update_fields.append('call_log_id = :call_log_id')
            params['call_log_id'] = call_log_id

        if agent_id:
            update_fields.append('agent_id = :agent_id')
            params['agent_id'] = agent_id

        if livekit_room_name:
            update_fields.append('livekit_room_name = :livekit_room_name')
            params['livekit_room_name'] = livekit_room_name

        if error_message:
            update_fields.append('error_message = :error_message')
            params['error_message'] = error_message

        if status == 'completed':
            update_fields.append('completed_at = :completed_at')
            params['completed_at'] = datetime.now(timezone.utc)

        db.execute(text(f"""
            UPDATE campaign_calls
            SET {', '.join(update_fields)}
            WHERE id = :campaign_call_id
        """), params)
        db.commit()

    def update_lead_status(
        self,
        db,
        lead_id: str,
        status: str,
        call_status: Optional[str] = None
    ):
        """Update lead record with call information"""
        update_fields = [
            'status = :status',
            'times_called = times_called + 1',
            'last_called_at = :last_called_at'
        ]
        params = {
            'lead_id': lead_id,
            'status': status,
            'last_called_at': datetime.now(timezone.utc)
        }

        if call_status:
            update_fields.append('last_call_status = :call_status')
            params['call_status'] = call_status

        db.execute(text(f"""
            UPDATE leads
            SET {', '.join(update_fields)}
            WHERE id = :lead_id
        """), params)
        db.commit()

    def update_campaign_metrics(self, db, campaign_id: str):
        """Update campaign aggregate metrics"""
        db.execute(text("""
            UPDATE campaigns
            SET
                leads_completed = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND status = 'completed'
                ),
                leads_failed = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND status = 'failed'
                ),
                leads_in_progress = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND status = 'calling'
                ),
                total_calls = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND attempted_at IS NOT NULL
                ),
                successful_calls = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND status = 'completed'
                ),
                failed_calls = (
                    SELECT COUNT(*) FROM campaign_calls
                    WHERE campaign_id = :campaign_id AND status = 'failed'
                )
            WHERE id = :campaign_id
        """), {'campaign_id': campaign_id})
        db.commit()

    async def check_campaign_completion(self, db, campaign_id: str, user_id: str):
        """Check if campaign is complete and update status"""
        result = db.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status IN ('completed', 'failed', 'cancelled') THEN 1 END) as finished
            FROM campaign_calls
            WHERE campaign_id = :campaign_id
        """), {'campaign_id': campaign_id})

        row = result.fetchone()
        if row and row[0] > 0 and row[0] == row[1]:
            # All calls finished
            end_time = datetime.now(timezone.utc)
            db.execute(text("""
                UPDATE campaigns
                SET status = 'completed', actual_end = :end_time
                WHERE id = :campaign_id
            """), {
                'campaign_id': campaign_id,
                'end_time': end_time
            })
            db.commit()
            logger.info(f"✅ Campaign {campaign_id} completed")

            # Trigger webhook: campaign.completed
            await trigger_webhook_event('campaign.completed', {
                'campaign_id': campaign_id,
                'completed_at': end_time.isoformat(),
                'total_calls': row[0]
            }, user_id)

    async def process_scheduled_call(self, call_data: tuple):
        """Process a single scheduled call"""
        db = SessionLocal()

        try:
            (
                campaign_call_id,
                campaign_id,
                lead_id,
                scheduled_for,
                phone_number,
                user_id,
                agent_id,
                campaign_status
            ) = call_data

            logger.info(f"Processing campaign call {campaign_call_id}")
            logger.info(f"  Lead: {phone_number}")
            logger.info(f"  Agent: {agent_id}")

            # Update campaign status to 'running' if it's 'scheduled'
            if campaign_status == 'scheduled':
                start_time = datetime.now(timezone.utc)
                db.execute(text("""
                    UPDATE campaigns
                    SET status = 'running', actual_start = :start_time
                    WHERE id = :campaign_id
                """), {
                    'campaign_id': campaign_id,
                    'start_time': start_time
                })
                db.commit()

                # Trigger webhook: campaign.started
                await trigger_webhook_event('campaign.started', {
                    'campaign_id': campaign_id,
                    'agent_id': agent_id,
                    'started_at': start_time.isoformat()
                }, user_id)

            # Update campaign_calls status to 'calling' with agent_id
            self.update_call_status(
                db,
                campaign_call_id,
                'calling',
                agent_id=agent_id
            )

            # Update lead status to 'calling'
            self.update_lead_status(db, lead_id, 'calling')

            # Create the outbound call
            result = await self.create_outbound_call(
                campaign_call_id=campaign_call_id,
                lead_phone=phone_number,
                agent_id=agent_id,
                user_id=user_id
            )

            if result['success']:
                # Update with call_log_id and room_name for outcome tracking
                self.update_call_status(
                    db,
                    campaign_call_id,
                    'calling',
                    call_log_id=result.get('call_id'),
                    agent_id=agent_id,
                    livekit_room_name=result.get('room_name')
                )

                logger.info(f"✅ Call initiated successfully for {phone_number}")

                # Trigger webhook: call.started
                await trigger_webhook_event('call.started', {
                    'call_id': result.get('call_id'),
                    'campaign_call_id': campaign_call_id,
                    'campaign_id': campaign_id,
                    'lead_id': lead_id,
                    'phone_number': phone_number,
                    'agent_id': agent_id,
                    'room_name': result.get('room_name'),
                    'from_number': "+17678183366"
                }, user_id)

                # Note: Call completion will be handled by webhook or polling
                # For now, we just initiate the call
                # The call status will be updated when the call ends

            else:
                # Call failed to initiate
                error_msg = result.get('error', 'Unknown error')
                logger.error(f"❌ Failed to initiate call: {error_msg}")

                # Update campaign_calls to failed
                self.update_call_status(
                    db,
                    campaign_call_id,
                    'failed',
                    error_message=error_msg
                )

                # Update lead status
                self.update_lead_status(db, lead_id, 'failed', call_status='error')

                # Trigger webhook: call.failed
                await trigger_webhook_event('call.failed', {
                    'campaign_call_id': campaign_call_id,
                    'campaign_id': campaign_id,
                    'lead_id': lead_id,
                    'phone_number': phone_number,
                    'agent_id': agent_id,
                    'error': error_msg,
                    'reason': 'initiation_failed'
                }, user_id)

                # Check if we should retry
                result = db.execute(text("""
                    SELECT retry_count, max_retries
                    FROM campaign_calls
                    WHERE id = :id
                """), {'id': campaign_call_id})

                row = result.fetchone()
                if row and row[0] < row[1]:
                    # Schedule retry
                    retry_delay = timedelta(hours=24)  # TODO: Get from campaign config
                    db.execute(text("""
                        UPDATE campaign_calls
                        SET
                            status = 'retry',
                            retry_count = retry_count + 1,
                            next_retry_at = :next_retry
                        WHERE id = :id
                    """), {
                        'id': campaign_call_id,
                        'next_retry': datetime.now(timezone.utc) + retry_delay
                    })
                    db.commit()
                    logger.info(f"  Scheduled retry for {phone_number}")

            # Update campaign metrics
            self.update_campaign_metrics(db, campaign_id)

            # Check if campaign is complete
            await self.check_campaign_completion(db, campaign_id, user_id)

        except Exception as e:
            logger.error(f"❌ Error processing call: {str(e)}", exc_info=True)
        finally:
            db.close()

    async def run_once(self):
        """Process one batch of scheduled calls"""
        db = SessionLocal()

        try:
            # Get scheduled calls
            scheduled_calls = self.get_scheduled_calls(db)

            if scheduled_calls:
                logger.info(f"Found {len(scheduled_calls)} scheduled calls to process")

                # Process calls concurrently
                tasks = [self.process_scheduled_call(call) for call in scheduled_calls]
                await asyncio.gather(*tasks, return_exceptions=True)

            else:
                logger.debug("No scheduled calls at this time")

        except Exception as e:
            logger.error(f"❌ Error in run_once: {str(e)}", exc_info=True)
        finally:
            db.close()

    async def run(self):
        """Main loop - continuously process scheduled calls"""
        logger.info("🚀 Campaign Engine started")
        logger.info(f"   Polling every {self.poll_interval} seconds")

        while True:
            try:
                await self.run_once()
                await asyncio.sleep(self.poll_interval)
            except KeyboardInterrupt:
                logger.info("Campaign Engine stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Unexpected error: {str(e)}", exc_info=True)
                await asyncio.sleep(self.poll_interval)


def main():
    """Entry point"""
    try:
        engine = CampaignEngine()
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        logger.info("Campaign Engine stopped")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
