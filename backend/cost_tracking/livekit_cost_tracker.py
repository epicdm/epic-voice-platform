"""
LiveKit Cost Tracker - Real-time cost tracking for voice agent calls

Hooks into LiveKit agent shutdown to:
1. Parse usage metrics from UsageCollector
2. Calculate real & customer costs
3. Charge customer credits
4. Store cost breakdown in database
"""

import logging
import uuid
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from backend.call_outcomes.models import CallLog
from .models import CallCostBreakdown
from .pricing_service import PricingService
from .balance_service import BalanceService

logger = logging.getLogger(__name__)


class LiveKitCostTracker:
    """
    Real-time cost tracking for LiveKit voice agent calls.

    Usage:
        tracker = LiveKitCostTracker()
        await tracker.track_call_costs(
            room_name=ctx.room.name,
            usage_summary=usage_collector.get_summary(),
            agent_config=config,
            call_duration_seconds=duration
        )
    """

    def __init__(self, db_session: Optional[Session] = None):
        """
        Initialize cost tracker.

        Args:
            db_session: Optional database session (creates new if not provided)
        """
        self.db = db_session
        self._should_close_db = db_session is None

    async def track_call_costs(
        self,
        room_name: str,
        usage_summary: Dict[str, Any],
        agent_config: Dict[str, Any],
        call_duration_seconds: int
    ) -> Optional[str]:
        """
        Calculate and store costs for a completed call.

        Args:
            room_name: LiveKit room name
            usage_summary: Output from UsageCollector.get_summary()
            agent_config: Agent configuration dict
            call_duration_seconds: Total call duration

        Returns:
            cost_breakdown_id (UUID str) or None if failed
        """
        logger.info(f"📊 Tracking costs for room {room_name}")

        db = self.db if self.db else SessionLocal()

        try:
            # 1. Find call_log by room name
            call_log = db.query(CallLog).filter(
                (CallLog.roomName == room_name) |
                (CallLog.livekitRoomName == room_name)
            ).first()

            if not call_log:
                logger.warning(f"Call log not found for room {room_name}")
                return None

            # 2. Parse usage metrics
            stt_minutes = self._extract_stt_minutes(usage_summary, call_duration_seconds)
            llm_tokens = self._extract_llm_tokens(usage_summary)
            tts_chars = self._extract_tts_characters(usage_summary)

            # 3. Determine telephony direction
            telephony_direction = self._determine_telephony_direction(room_name, call_log)

            # 4. Calculate costs using PricingService
            pricing = PricingService(db, user_id=call_log.userId)

            costs = pricing.calculate_voice_call_costs(
                stt_provider=agent_config.get('sttProvider', 'deepgram'),
                stt_model=agent_config.get('sttModel', 'nova-2'),
                stt_minutes=stt_minutes,

                llm_provider=agent_config.get('llmProvider', 'openai'),
                llm_model=agent_config.get('llmModel', 'gpt-4o-mini'),
                llm_input_tokens=llm_tokens['input'],
                llm_output_tokens=llm_tokens['output'],

                tts_provider=agent_config.get('ttsProvider', 'openai'),
                tts_model=agent_config.get('ttsModel'),
                tts_characters=tts_chars,

                call_duration_minutes=call_duration_seconds / 60.0,
                telephony_direction=telephony_direction,
                voice_tier=agent_config.get('voiceTier', 'basic'),
            )

            # 5. Charge customer credits
            balance = BalanceService(db)

            customer_cost = Decimal(str(costs['customer_costs']['total']))
            reserved_amount = Decimal(str(call_log.creditsReserved or 0))

            success, error = balance.charge_credits(
                user_id=call_log.userId,
                actual_amount=customer_cost,
                reserved_amount=reserved_amount,
                call_log_id=str(call_log.id),
                description=f"Voice call charge - {call_duration_seconds}s"
            )

            if not success:
                logger.error(f"Failed to charge credits: {error}")
                # Continue to store breakdown even if charge failed

            # 6. Create cost breakdown record
            breakdown = CallCostBreakdown(
                id=str(uuid.uuid4()),
                callLogId=str(call_log.id),
                userId=call_log.userId,

                # STT
                sttProvider=agent_config.get('sttProvider', 'deepgram'),
                sttModel=agent_config.get('sttModel', 'nova-2'),
                sttAudioMinutes=Decimal(str(stt_minutes)),
                sttRealCost=Decimal(str(costs['real_costs']['stt'])),

                # LLM
                llmProvider=agent_config.get('llmProvider', 'openai'),
                llmModel=agent_config.get('llmModel', 'gpt-4o-mini'),
                llmInputTokens=llm_tokens['input'],
                llmOutputTokens=llm_tokens['output'],
                llmRealCost=Decimal(str(costs['real_costs']['llm'])),

                # TTS
                ttsProvider=agent_config.get('ttsProvider', 'openai'),
                ttsModel=agent_config.get('ttsModel'),
                ttsCharacters=tts_chars,
                ttsRealCost=Decimal(str(costs['real_costs']['tts'])),

                # Telephony
                telephonyDirection=telephony_direction,
                telephonyMinutes=Decimal(str(call_duration_seconds / 60.0)),
                telephonyRealCost=Decimal(str(costs['real_costs']['telephony'])),

                # LiveKit
                livekitParticipantMinutes=Decimal(str(call_duration_seconds / 60.0)),
                livekitRealCost=Decimal(str(costs['real_costs']['livekit'])),

                # Platform
                platformOverheadCost=Decimal(str(costs['real_costs']['platform'])),

                # Totals
                totalRealCost=Decimal(str(costs['real_costs']['total'])),

                # Customer Pricing
                customerVoiceTier=agent_config.get('voiceTier', 'basic'),
                customerBaseCost=Decimal(str(costs['customer_costs']['base'])),
                customerLlmAddon=Decimal(str(costs['customer_costs']['llm_addon'])),
                customerTtsAddon=Decimal(str(costs['customer_costs']['tts_addon'])),
                customerOutboundAddon=Decimal(str(costs['customer_costs']['outbound_addon'])),
                customerFeatureCosts=Decimal(str(costs['customer_costs']['features'])),
                totalCustomerCost=Decimal(str(costs['customer_costs']['total'])),
            )

            db.add(breakdown)

            # 7. Update call_log with costs and usage metrics
            call_log.costBreakdownId = breakdown.id
            call_log.totalRealCost = Decimal(str(costs['real_costs']['total']))
            call_log.totalCustomerCost = Decimal(str(costs['customer_costs']['total']))
            call_log.profitMargin = Decimal(str(costs['profit_margin']))
            call_log.usageMetrics = usage_summary
            call_log.voiceTier = agent_config.get('voiceTier', 'basic')
            call_log.llmUsed = agent_config.get('llmModel', 'gpt-4o-mini')
            call_log.ttsUsed = agent_config.get('ttsProvider', 'openai')
            call_log.creditsCharged = customer_cost

            db.commit()

            logger.info(
                f"✅ Cost tracking complete for call {call_log.id}: "
                f"Real=${costs['real_costs']['total']:.4f}, "
                f"Customer=${costs['customer_costs']['total']:.4f}, "
                f"Profit=${costs['profit_margin']:.4f} "
                f"({costs['markup_multiplier']:.2f}x markup)"
            )

            return breakdown.id

        except Exception as e:
            logger.error(f"Failed to track costs for room {room_name}: {e}", exc_info=True)
            db.rollback()
            return None
        finally:
            if self._should_close_db and db:
                db.close()

    def _extract_stt_minutes(self, usage: Dict, duration_sec: int) -> float:
        """
        Extract STT audio minutes from usage metrics.

        Usage summary structure (from LiveKit agents):
        {
            'stt': {
                'audio_duration_ms': 60000,
                ...
            },
            ...
        }
        """
        # Try to get actual STT audio duration
        stt_data = usage.get('stt', {})

        if isinstance(stt_data, dict):
            audio_ms = stt_data.get('audio_duration_ms')
            if audio_ms:
                return float(audio_ms) / 60000.0

        # Fallback: use call duration
        return float(duration_sec) / 60.0

    def _extract_llm_tokens(self, usage: Dict) -> Dict[str, int]:
        """
        Extract LLM token counts from usage metrics.

        Usage summary structure:
        {
            'llm': {
                'prompt_tokens': 1000,
                'completion_tokens': 500,
                ...
            },
            ...
        }
        """
        llm_data = usage.get('llm', {})

        if isinstance(llm_data, dict):
            input_tokens = (
                llm_data.get('prompt_tokens', 0) +
                llm_data.get('input_tokens', 0)
            )
            output_tokens = (
                llm_data.get('completion_tokens', 0) +
                llm_data.get('output_tokens', 0)
            )

            return {
                'input': int(input_tokens),
                'output': int(output_tokens)
            }

        # Fallback: estimate based on duration (very rough)
        return {'input': 0, 'output': 0}

    def _extract_tts_characters(self, usage: Dict) -> int:
        """
        Extract TTS character count from usage metrics.

        Usage summary structure:
        {
            'tts': {
                'characters': 500,
                'character_count': 500,
                ...
            },
            ...
        }
        """
        tts_data = usage.get('tts', {})

        if isinstance(tts_data, dict):
            chars = (
                tts_data.get('characters', 0) or
                tts_data.get('character_count', 0)
            )
            return int(chars)

        return 0

    def _determine_telephony_direction(self, room_name: str, call_log: CallLog) -> str:
        """
        Determine if call was inbound or outbound.

        Room naming conventions:
        - Inbound: sip-{DID}___{caller}_{random}
        - Outbound: Usually contains 'outbound' or specific pattern
        """
        # Check if room name or SIP call ID indicates outbound
        room_lower = room_name.lower()

        if 'outbound' in room_lower:
            return 'outbound'

        # Check call_log for outbound indicators
        if call_log.sipCallId and 'outbound' in call_log.sipCallId.lower():
            return 'outbound'

        # Default to inbound (most common)
        return 'inbound'


async def load_agent_config_from_room(room_name: str) -> Dict[str, Any]:
    """
    Load agent configuration from room name.

    Extracts agent_config_id from room name and loads from database.
    """
    db = SessionLocal()
    try:
        # Import here to avoid circular dependency
        from backend.db_config import get_agent_config_by_room_name

        config = await get_agent_config_by_room_name(room_name, db)

        if config:
            return {
                'sttProvider': config.get('sttProvider', 'deepgram'),
                'sttModel': config.get('sttModel', 'nova-2'),
                'llmProvider': config.get('llmProvider', 'openai'),
                'llmModel': config.get('llmModel', 'gpt-4o-mini'),
                'ttsProvider': config.get('ttsProvider', 'openai'),
                'ttsModel': config.get('ttsModel'),
                'voiceTier': config.get('voiceTier', 'basic'),
            }

        # Fallback to default config
        return {
            'sttProvider': 'deepgram',
            'sttModel': 'nova-2',
            'llmProvider': 'openai',
            'llmModel': 'gpt-4o-mini',
            'ttsProvider': 'openai',
            'ttsModel': 'tts-1',
            'voiceTier': 'basic',
        }

    except Exception as e:
        logger.error(f"Failed to load agent config for room {room_name}: {e}")
        # Return default config
        return {
            'sttProvider': 'deepgram',
            'sttModel': 'nova-2',
            'llmProvider': 'openai',
            'llmModel': 'gpt-4o-mini',
            'ttsProvider': 'openai',
            'ttsModel': 'tts-1',
            'voiceTier': 'basic',
        }
    finally:
        db.close()
