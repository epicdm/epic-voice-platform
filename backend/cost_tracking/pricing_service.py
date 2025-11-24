"""
Pricing Service - Cost Calculation Engine

Calculates real costs (what we pay) and customer costs (what we charge)
for both voice and text agents based on configurable pricing.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session

from .models import PricingConfig

logger = logging.getLogger(__name__)


class PricingService:
    """
    Service for calculating costs based on usage metrics.

    Features:
    - Real cost calculation (provider costs)
    - Customer cost calculation (what we charge)
    - Support for voice (per-minute) and text (per-message) agents
    - Admin-configurable pricing
    - Automatic markup calculation
    """

    def __init__(self, db_session: Session, user_id: Optional[str] = None):
        """
        Initialize pricing service.

        Args:
            db_session: Database session
            user_id: Optional user ID for custom pricing (defaults to system pricing)
        """
        self.db = db_session
        self.user_id = user_id
        self._config = None

    def _get_pricing_config(self) -> PricingConfig:
        """Get pricing configuration (system default or user override)"""
        if self._config:
            return self._config

        # Try user-specific config first
        if self.user_id:
            config = self.db.query(PricingConfig).filter(
                PricingConfig.userId == self.user_id
            ).first()
            if config:
                self._config = config
                return config

        # Fall back to system default
        config = self.db.query(PricingConfig).filter(
            PricingConfig.configName == 'system_default'
        ).first()

        if not config:
            raise ValueError("System default pricing config not found")

        self._config = config
        return config

    # ============================================
    # VOICE AGENT COST CALCULATIONS
    # ============================================

    def calculate_voice_call_costs(
        self,
        # Usage metrics
        stt_provider: str,
        stt_model: str,
        stt_minutes: float,
        llm_provider: str,
        llm_model: str,
        llm_input_tokens: int,
        llm_output_tokens: int,
        tts_provider: str,
        tts_model: Optional[str],
        tts_characters: int,
        call_duration_minutes: float,
        telephony_direction: str,  # 'inbound' or 'outbound'
        # Configuration
        voice_tier: str = 'basic',  # 'basic', 'advanced', 'premium'
        tool_invocations: Optional[list] = None,
        recording_size_mb: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate complete cost breakdown for a voice call.

        Returns:
            {
                'real_costs': {
                    'stt': Decimal,
                    'llm': Decimal,
                    'tts': Decimal,
                    'telephony': Decimal,
                    'livekit': Decimal,
                    'platform': Decimal,
                    'tools': Decimal,
                    'recording': Decimal,
                    'total': Decimal
                },
                'customer_costs': {
                    'base': Decimal,
                    'llm_addon': Decimal,
                    'tts_addon': Decimal,
                    'outbound_addon': Decimal,
                    'features': Decimal,
                    'total': Decimal
                },
                'profit_margin': Decimal,
                'markup_multiplier': Decimal
            }
        """
        config = self._get_pricing_config()

        # === REAL COSTS ===

        # STT Cost
        stt_cost = self._calculate_stt_cost(config, stt_provider, stt_model, stt_minutes)

        # LLM Cost (voice rates)
        llm_cost = self._calculate_llm_voice_cost(
            config, llm_provider, llm_model, llm_input_tokens, llm_output_tokens
        )

        # TTS Cost
        tts_cost = self._calculate_tts_cost(
            config, tts_provider, tts_model, tts_characters, call_duration_minutes
        )

        # Telephony Cost
        telephony_cost = self._calculate_telephony_cost(
            config, telephony_direction, call_duration_minutes
        )

        # LiveKit Cost (currently free or flat monthly)
        livekit_cost = Decimal('0.0')

        # Platform Overhead
        platform_cost = Decimal(str(config.platformOverheadPerCallMin)) * Decimal(str(call_duration_minutes))

        # Tool Costs
        tool_cost = self._calculate_tool_costs(config, tool_invocations)

        # Recording Cost
        recording_cost = self._calculate_recording_cost(config, recording_size_mb)

        total_real_cost = (
            stt_cost + llm_cost + tts_cost + telephony_cost +
            livekit_cost + platform_cost + tool_cost + recording_cost
        )

        # === CUSTOMER COSTS ===

        # Base voice tier cost
        base_cost = self._get_voice_tier_cost(config, voice_tier) * Decimal(str(call_duration_minutes))

        # LLM addon (if not default mini)
        llm_addon = self._get_voice_llm_addon(config, llm_model) * Decimal(str(call_duration_minutes))

        # TTS addon (if not default OpenAI)
        tts_addon = self._get_voice_tts_addon(config, tts_provider) * Decimal(str(call_duration_minutes))

        # Outbound addon
        outbound_addon = Decimal('0.0')
        if telephony_direction == 'outbound':
            outbound_addon = Decimal(str(config.customerOutboundAddonPerMin)) * Decimal(str(call_duration_minutes))

        # Feature costs (tools, etc.)
        feature_costs = tool_cost * Decimal(str(config.defaultVoiceMarkupMultiplier))

        total_customer_cost = base_cost + llm_addon + tts_addon + outbound_addon + feature_costs

        # === PROFIT METRICS ===

        profit_margin = total_customer_cost - total_real_cost
        markup_multiplier = total_customer_cost / total_real_cost if total_real_cost > 0 else Decimal('0.0')

        return {
            'real_costs': {
                'stt': float(stt_cost),
                'llm': float(llm_cost),
                'tts': float(tts_cost),
                'telephony': float(telephony_cost),
                'livekit': float(livekit_cost),
                'platform': float(platform_cost),
                'tools': float(tool_cost),
                'recording': float(recording_cost),
                'total': float(total_real_cost)
            },
            'customer_costs': {
                'base': float(base_cost),
                'llm_addon': float(llm_addon),
                'tts_addon': float(tts_addon),
                'outbound_addon': float(outbound_addon),
                'features': float(feature_costs),
                'total': float(total_customer_cost)
            },
            'profit_margin': float(profit_margin),
            'markup_multiplier': float(markup_multiplier)
        }

    # ============================================
    # TEXT AGENT COST CALCULATIONS
    # ============================================

    def calculate_text_message_costs(
        self,
        llm_provider: str,
        llm_model: str,
        llm_input_tokens: int,
        llm_output_tokens: int,
        message_tier: str = 'basic',  # 'basic', 'advanced', 'premium'
        tool_invocations: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Calculate costs for a single text agent message.

        Returns similar structure to calculate_voice_call_costs
        """
        config = self._get_pricing_config()

        # === REAL COSTS ===

        # LLM Cost (text rates - much cheaper than voice)
        llm_cost = self._calculate_llm_text_cost(
            config, llm_provider, llm_model, llm_input_tokens, llm_output_tokens
        )

        # Platform Overhead
        platform_cost = Decimal(str(config.platformOverheadPerTextMessage))

        # Tool Costs
        tool_cost = self._calculate_tool_costs(config, tool_invocations)

        total_real_cost = llm_cost + platform_cost + tool_cost

        # === CUSTOMER COSTS ===

        # Base message tier cost
        base_cost = self._get_text_tier_cost(config, message_tier)

        # LLM addon
        llm_addon = self._get_text_llm_addon(config, llm_model)

        # Feature costs
        feature_costs = tool_cost * Decimal(str(config.defaultTextMarkupMultiplier))

        total_customer_cost = base_cost + llm_addon + feature_costs

        # === PROFIT METRICS ===

        profit_margin = total_customer_cost - total_real_cost
        markup_multiplier = total_customer_cost / total_real_cost if total_real_cost > 0 else Decimal('0.0')

        return {
            'real_costs': {
                'llm': float(llm_cost),
                'platform': float(platform_cost),
                'tools': float(tool_cost),
                'total': float(total_real_cost)
            },
            'customer_costs': {
                'base': float(base_cost),
                'llm_addon': float(llm_addon),
                'features': float(feature_costs),
                'total': float(total_customer_cost)
            },
            'profit_margin': float(profit_margin),
            'markup_multiplier': float(markup_multiplier)
        }

    # ============================================
    # COST ESTIMATION (Pre-call)
    # ============================================

    def estimate_voice_call_cost(
        self,
        estimated_duration_minutes: float,
        voice_tier: str = 'basic',
        llm_model: str = 'gpt-4o-mini',
        tts_provider: str = 'openai',
        telephony_direction: str = 'inbound'
    ) -> Decimal:
        """
        Estimate customer cost for a voice call (for pre-call balance check).
        Uses conservative estimates for token/character usage.
        """
        config = self._get_pricing_config()

        # Base cost
        base_cost = self._get_voice_tier_cost(config, voice_tier) * Decimal(str(estimated_duration_minutes))

        # LLM addon
        llm_addon = self._get_voice_llm_addon(config, llm_model) * Decimal(str(estimated_duration_minutes))

        # TTS addon
        tts_addon = self._get_voice_tts_addon(config, tts_provider) * Decimal(str(estimated_duration_minutes))

        # Outbound addon
        outbound_addon = Decimal('0.0')
        if telephony_direction == 'outbound':
            outbound_addon = Decimal(str(config.customerOutboundAddonPerMin)) * Decimal(str(estimated_duration_minutes))

        # Add 10% buffer for safety
        estimated_cost = (base_cost + llm_addon + tts_addon + outbound_addon) * Decimal('1.1')

        return estimated_cost

    # ============================================
    # HELPER METHODS
    # ============================================

    def _calculate_stt_cost(self, config: PricingConfig, provider: str, model: str, minutes: float) -> Decimal:
        """Calculate STT cost based on provider and model"""
        rate_map = {
            ('deepgram', 'nova-2'): config.deepgramNova2PerMin,
            ('deepgram', 'nova-3'): config.deepgramNova3PerMin,
            ('deepgram', 'whisper'): config.deepgramWhisperPerMin,
            ('assemblyai', 'standard'): config.assemblyaiStandardPerMin,
        }

        rate = rate_map.get((provider.lower(), model.lower()), config.deepgramNova2PerMin)
        return Decimal(str(rate)) * Decimal(str(minutes))

    def _calculate_llm_voice_cost(
        self, config: PricingConfig, provider: str, model: str, input_tokens: int, output_tokens: int
    ) -> Decimal:
        """Calculate LLM cost for voice agents (higher rates)"""
        provider_lower = provider.lower()
        model_lower = model.lower()

        if 'gpt-4o-mini' in model_lower or 'gpt-4.1-mini' in model_lower:
            input_rate = config.openaiGpt4oMiniInputPer1mVoice
            output_rate = config.openaiGpt4oMiniOutputPer1mVoice
        elif 'gpt-4' in model_lower:
            input_rate = config.openaiGpt4InputPer1mVoice
            output_rate = config.openaiGpt4OutputPer1mVoice
        elif 'claude' in model_lower:
            input_rate = config.anthropicClaude35InputPer1mVoice
            output_rate = config.anthropicClaude35OutputPer1mVoice
        else:
            # Default to mini rates
            input_rate = config.openaiGpt4oMiniInputPer1mVoice
            output_rate = config.openaiGpt4oMiniOutputPer1mVoice

        input_cost = (Decimal(str(input_tokens)) / Decimal('1000000')) * Decimal(str(input_rate))
        output_cost = (Decimal(str(output_tokens)) / Decimal('1000000')) * Decimal(str(output_rate))

        return input_cost + output_cost

    def _calculate_llm_text_cost(
        self, config: PricingConfig, provider: str, model: str, input_tokens: int, output_tokens: int
    ) -> Decimal:
        """Calculate LLM cost for text agents (lower rates)"""
        model_lower = model.lower()

        if 'gpt-4o-mini' in model_lower or 'gpt-4.1-mini' in model_lower:
            input_rate = config.openaiGpt4oMiniInputPer1mText
            output_rate = config.openaiGpt4oMiniOutputPer1mText
        elif 'gpt-4' in model_lower:
            input_rate = config.openaiGpt4InputPer1mText
            output_rate = config.openaiGpt4OutputPer1mText
        elif 'claude' in model_lower:
            input_rate = config.anthropicClaude35InputPer1mText
            output_rate = config.anthropicClaude35OutputPer1mText
        else:
            input_rate = config.openaiGpt4oMiniInputPer1mText
            output_rate = config.openaiGpt4oMiniOutputPer1mText

        input_cost = (Decimal(str(input_tokens)) / Decimal('1000000')) * Decimal(str(input_rate))
        output_cost = (Decimal(str(output_tokens)) / Decimal('1000000')) * Decimal(str(output_rate))

        return input_cost + output_cost

    def _calculate_tts_cost(
        self, config: PricingConfig, provider: str, model: Optional[str], characters: int, audio_minutes: float
    ) -> Decimal:
        """Calculate TTS cost based on provider"""
        provider_lower = provider.lower()

        if provider_lower == 'openai':
            if model and 'hd' in model.lower():
                rate = config.openaiTtsHdPer1mChars
            else:
                rate = config.openaiTtsPer1mChars
            return (Decimal(str(characters)) / Decimal('1000000')) * Decimal(str(rate))

        elif provider_lower == 'cartesia':
            return Decimal(str(config.cartesiaPerAudioMin)) * Decimal(str(audio_minutes))

        elif provider_lower == 'elevenlabs':
            return (Decimal(str(characters)) / Decimal('1000')) * Decimal(str(config.elevenlabsTurboPer1kChars))

        elif provider_lower == 'playht':
            return (Decimal(str(characters)) / Decimal('1000')) * Decimal(str(config.playhtPer1kChars))

        else:
            # Default to OpenAI
            return (Decimal(str(characters)) / Decimal('1000000')) * Decimal(str(config.openaiTtsPer1mChars))

    def _calculate_telephony_cost(self, config: PricingConfig, direction: str, minutes: float) -> Decimal:
        """Calculate telephony cost based on direction"""
        if direction == 'outbound':
            rate = config.outboundPerMinute
        else:
            rate = config.inboundPerMinute

        return Decimal(str(rate)) * Decimal(str(minutes))

    def _calculate_tool_costs(self, config: PricingConfig, tool_invocations: Optional[list]) -> Decimal:
        """Calculate total tool invocation costs"""
        if not tool_invocations:
            return Decimal('0.0')

        total = Decimal('0.0')
        for tool in tool_invocations:
            count = tool.get('count', 1)
            total += Decimal(str(config.customerToolPerInvocation)) * Decimal(str(count))

        return total

    def _calculate_recording_cost(self, config: PricingConfig, size_mb: Optional[float]) -> Decimal:
        """Calculate recording storage cost"""
        if not size_mb:
            return Decimal('0.0')

        size_gb = Decimal(str(size_mb)) / Decimal('1024')
        return size_gb * Decimal(str(config.livekitRecordingPerGbMonth))

    def _get_voice_tier_cost(self, config: PricingConfig, tier: str) -> Decimal:
        """Get voice tier customer rate per minute"""
        tier_map = {
            'basic': config.customerVoiceBasicPerMin,
            'advanced': config.customerVoiceAdvancedPerMin,
            'premium': config.customerVoicePremiumPerMin,
        }
        return Decimal(str(tier_map.get(tier, config.customerVoiceBasicPerMin)))

    def _get_voice_llm_addon(self, config: PricingConfig, model: str) -> Decimal:
        """Get LLM addon cost per minute for voice"""
        model_lower = model.lower()

        if 'gpt-4' in model_lower and 'mini' not in model_lower:
            return Decimal(str(config.customerVoiceGpt4AddonPerMin))
        elif 'claude' in model_lower:
            return Decimal(str(config.customerVoiceClaudeAddonPerMin))
        else:
            return Decimal('0.0')  # Mini is included

    def _get_voice_tts_addon(self, config: PricingConfig, provider: str) -> Decimal:
        """Get TTS addon cost per minute for voice"""
        provider_lower = provider.lower()

        if provider_lower == 'cartesia':
            return Decimal(str(config.customerVoiceCartesiaAddonPerMin))
        elif provider_lower == 'elevenlabs':
            return Decimal(str(config.customerVoiceElevenlabsAddonPerMin))
        elif provider_lower == 'playht':
            return Decimal(str(config.customerVoicePlayhtAddonPerMin))
        else:
            return Decimal('0.0')  # OpenAI is included

    def _get_text_tier_cost(self, config: PricingConfig, tier: str) -> Decimal:
        """Get text tier customer rate per message"""
        tier_map = {
            'basic': config.customerTextBasicPerMessage,
            'advanced': config.customerTextAdvancedPerMessage,
            'premium': config.customerTextPremiumPerMessage,
        }
        return Decimal(str(tier_map.get(tier, config.customerTextBasicPerMessage)))

    def _get_text_llm_addon(self, config: PricingConfig, model: str) -> Decimal:
        """Get LLM addon cost per message for text"""
        model_lower = model.lower()

        if 'gpt-4' in model_lower and 'mini' not in model_lower:
            return Decimal(str(config.customerTextGpt4AddonPerMessage))
        elif 'claude' in model_lower:
            return Decimal(str(config.customerTextClaudeAddonPerMessage))
        else:
            return Decimal('0.0')  # Mini is included
