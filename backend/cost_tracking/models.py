"""
Cost Tracking SQLAlchemy Models
"""

from sqlalchemy import Column, String, Numeric, Integer, Boolean, Text, TIMESTAMP, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class PricingConfig(Base):
    __tablename__ = 'pricing_config'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    configName = Column('config_name', Text, nullable=False, unique=True)
    userId = Column('user_id', Text)

    # STT Providers
    deepgramNova2PerMin = Column('deepgram_nova2_per_min', Numeric(10, 6), default=0.08)
    deepgramNova3PerMin = Column('deepgram_nova3_per_min', Numeric(10, 6), default=0.10)
    deepgramWhisperPerMin = Column('deepgram_whisper_per_min', Numeric(10, 6), default=0.08)
    assemblyaiStandardPerMin = Column('assemblyai_standard_per_min', Numeric(10, 6), default=0.05)

    # LLM Providers - Voice
    openaiGpt4oMiniInputPer1mVoice = Column('openai_gpt4o_mini_input_per_1m_voice', Numeric(10, 6), default=15.00)
    openaiGpt4oMiniOutputPer1mVoice = Column('openai_gpt4o_mini_output_per_1m_voice', Numeric(10, 6), default=60.00)
    openaiGpt4InputPer1mVoice = Column('openai_gpt4_input_per_1m_voice', Numeric(10, 6), default=30.00)
    openaiGpt4OutputPer1mVoice = Column('openai_gpt4_output_per_1m_voice', Numeric(10, 6), default=60.00)
    anthropicClaude35InputPer1mVoice = Column('anthropic_claude_35_input_per_1m_voice', Numeric(10, 6), default=3.00)
    anthropicClaude35OutputPer1mVoice = Column('anthropic_claude_35_output_per_1m_voice', Numeric(10, 6), default=15.00)

    # LLM Providers - Text
    openaiGpt4oMiniInputPer1mText = Column('openai_gpt4o_mini_input_per_1m_text', Numeric(10, 6), default=0.15)
    openaiGpt4oMiniOutputPer1mText = Column('openai_gpt4o_mini_output_per_1m_text', Numeric(10, 6), default=0.60)
    openaiGpt4InputPer1mText = Column('openai_gpt4_input_per_1m_text', Numeric(10, 6), default=5.00)
    openaiGpt4OutputPer1mText = Column('openai_gpt4_output_per_1m_text', Numeric(10, 6), default=15.00)
    anthropicClaude35InputPer1mText = Column('anthropic_claude_35_input_per_1m_text', Numeric(10, 6), default=3.00)
    anthropicClaude35OutputPer1mText = Column('anthropic_claude_35_output_per_1m_text', Numeric(10, 6), default=15.00)

    # TTS Providers
    openaiTtsPer1mChars = Column('openai_tts_per_1m_chars', Numeric(10, 6), default=15.00)
    openaiTtsHdPer1mChars = Column('openai_tts_hd_per_1m_chars', Numeric(10, 6), default=30.00)
    cartesiaPerAudioMin = Column('cartesia_per_audio_min', Numeric(10, 6), default=1.50)
    elevenlabsTurboPer1kChars = Column('elevenlabs_turbo_per_1k_chars', Numeric(10, 6), default=0.18)
    playhtPer1kChars = Column('playht_per_1k_chars', Numeric(10, 6), default=0.60)

    # Telephony
    inboundPerMinute = Column('inbound_per_minute', Numeric(10, 6), default=0.001)
    outboundPerMinute = Column('outbound_per_minute', Numeric(10, 6), default=0.002)
    didMonthlyCost = Column('did_monthly_cost', Numeric(10, 6), default=2.00)
    smsPerMessage = Column('sms_per_message', Numeric(10, 6), default=0.0075)
    whatsappPerMessage = Column('whatsapp_per_message', Numeric(10, 6), default=0.005)

    # LiveKit
    livekitMonthlyBase = Column('livekit_monthly_base', Numeric(10, 6), default=50.00)
    livekitPerParticipantMin = Column('livekit_per_participant_min', Numeric(10, 6), default=0.0)
    livekitRecordingPerGbMonth = Column('livekit_recording_per_gb_month', Numeric(10, 6), default=0.023)

    # Platform Overhead
    platformOverheadPerCallMin = Column('platform_overhead_per_call_min', Numeric(10, 6), default=0.01)
    platformOverheadPerTextMessage = Column('platform_overhead_per_text_message', Numeric(10, 6), default=0.001)

    # Customer Pricing - Voice
    customerVoiceBasicPerMin = Column('customer_voice_basic_per_min', Numeric(10, 6), default=0.40)
    customerVoiceAdvancedPerMin = Column('customer_voice_advanced_per_min', Numeric(10, 6), default=0.70)
    customerVoicePremiumPerMin = Column('customer_voice_premium_per_min', Numeric(10, 6), default=1.00)
    customerVoiceGpt4AddonPerMin = Column('customer_voice_gpt4_addon_per_min', Numeric(10, 6), default=0.15)
    customerVoiceClaudeAddonPerMin = Column('customer_voice_claude_addon_per_min', Numeric(10, 6), default=0.25)
    customerVoiceCartesiaAddonPerMin = Column('customer_voice_cartesia_addon_per_min', Numeric(10, 6), default=0.05)
    customerVoiceElevenlabsAddonPerMin = Column('customer_voice_elevenlabs_addon_per_min', Numeric(10, 6), default=0.20)
    customerVoicePlayhtAddonPerMin = Column('customer_voice_playht_addon_per_min', Numeric(10, 6), default=0.15)

    # Customer Pricing - Text
    customerTextBasicPerMessage = Column('customer_text_basic_per_message', Numeric(10, 6), default=0.01)
    customerTextAdvancedPerMessage = Column('customer_text_advanced_per_message', Numeric(10, 6), default=0.02)
    customerTextPremiumPerMessage = Column('customer_text_premium_per_message', Numeric(10, 6), default=0.05)
    customerTextBundle100Price = Column('customer_text_bundle_100_price', Numeric(10, 6), default=0.80)
    customerTextBundle1000Price = Column('customer_text_bundle_1000_price', Numeric(10, 6), default=6.00)
    customerTextBundle10000Price = Column('customer_text_bundle_10000_price', Numeric(10, 6), default=50.00)
    customerTextGpt4AddonPerMessage = Column('customer_text_gpt4_addon_per_message', Numeric(10, 6), default=0.005)
    customerTextClaudeAddonPerMessage = Column('customer_text_claude_addon_per_message', Numeric(10, 6), default=0.008)

    # Features
    customerDidMonthly = Column('customer_did_monthly', Numeric(10, 6), default=5.00)
    customerOutboundAddonPerMin = Column('customer_outbound_addon_per_min', Numeric(10, 6), default=0.05)
    customerSmsPerMessage = Column('customer_sms_per_message', Numeric(10, 6), default=0.02)
    customerWhatsappPerMessage = Column('customer_whatsapp_per_message', Numeric(10, 6), default=0.015)
    customerToolPerInvocation = Column('customer_tool_per_invocation', Numeric(10, 6), default=0.01)
    customerCrmPerCall = Column('customer_crm_per_call', Numeric(10, 6), default=0.05)
    customerRecordingPerGbMonth = Column('customer_recording_per_gb_month', Numeric(10, 6), default=0.10)

    # Markup
    defaultVoiceMarkupMultiplier = Column('default_voice_markup_multiplier', Numeric(10, 4), default=4.0)
    defaultTextMarkupMultiplier = Column('default_text_markup_multiplier', Numeric(10, 4), default=5.0)

    # Metadata
    effectiveDate = Column('effective_date', TIMESTAMP, nullable=False, server_default=text('NOW()'))
    createdAt = Column('created_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))
    updatedAt = Column('updated_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))


class CallCostBreakdown(Base):
    __tablename__ = 'call_cost_breakdown'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    callLogId = Column('call_log_id', UUID(as_uuid=True), nullable=False)
    userId = Column('user_id', Text, nullable=False)

    # STT
    sttProvider = Column('stt_provider', Text, nullable=False)
    sttModel = Column('stt_model', Text, nullable=False)
    sttAudioMinutes = Column('stt_audio_minutes', Numeric(10, 4), nullable=False, default=0)
    sttRealCost = Column('stt_real_cost', Numeric(10, 6), nullable=False, default=0)

    # LLM
    llmProvider = Column('llm_provider', Text, nullable=False)
    llmModel = Column('llm_model', Text, nullable=False)
    llmInputTokens = Column('llm_input_tokens', Integer, nullable=False, default=0)
    llmOutputTokens = Column('llm_output_tokens', Integer, nullable=False, default=0)
    llmRealCost = Column('llm_real_cost', Numeric(10, 6), nullable=False, default=0)

    # TTS
    ttsProvider = Column('tts_provider', Text, nullable=False)
    ttsModel = Column('tts_model', Text)
    ttsCharacters = Column('tts_characters', Integer, nullable=False, default=0)
    ttsAudioSeconds = Column('tts_audio_seconds', Numeric(10, 4))
    ttsRealCost = Column('tts_real_cost', Numeric(10, 6), nullable=False, default=0)

    # Telephony
    telephonyDirection = Column('telephony_direction', Text, nullable=False)
    telephonyMinutes = Column('telephony_minutes', Numeric(10, 4), nullable=False)
    telephonyRealCost = Column('telephony_real_cost', Numeric(10, 6), nullable=False, default=0)

    # LiveKit
    livekitParticipantMinutes = Column('livekit_participant_minutes', Numeric(10, 4))
    livekitRealCost = Column('livekit_real_cost', Numeric(10, 6), nullable=False, default=0)

    # DID
    didPhoneNumber = Column('did_phone_number', Text)
    didAllocationCost = Column('did_allocation_cost', Numeric(10, 6), nullable=False, default=0)

    # Platform
    platformOverheadCost = Column('platform_overhead_cost', Numeric(10, 6), nullable=False, default=0)

    # Tools
    toolInvocations = Column('tool_invocations', JSONB, default=[])
    toolTotalCost = Column('tool_total_cost', Numeric(10, 6), nullable=False, default=0)

    # Recording
    recordingEnabled = Column('recording_enabled', Boolean, default=False)
    recordingSizeMb = Column('recording_size_mb', Numeric(10, 4))
    recordingCost = Column('recording_cost', Numeric(10, 6), nullable=False, default=0)

    # Totals
    totalRealCost = Column('total_real_cost', Numeric(10, 6), nullable=False)

    # Customer Pricing
    customerVoiceTier = Column('customer_voice_tier', Text)
    customerBaseCost = Column('customer_base_cost', Numeric(10, 6), nullable=False)
    customerLlmAddon = Column('customer_llm_addon', Numeric(10, 6), nullable=False, default=0)
    customerTtsAddon = Column('customer_tts_addon', Numeric(10, 6), nullable=False, default=0)
    customerOutboundAddon = Column('customer_outbound_addon', Numeric(10, 6), nullable=False, default=0)
    customerFeatureCosts = Column('customer_feature_costs', Numeric(10, 6), nullable=False, default=0)
    totalCustomerCost = Column('total_customer_cost', Numeric(10, 6), nullable=False)

    # Metadata
    createdAt = Column('created_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))


class CustomerBalance(Base):
    __tablename__ = 'customer_balance'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    userId = Column('user_id', Text, nullable=False, unique=True)

    currentBalance = Column('current_balance', Numeric(10, 6), nullable=False, default=0)
    reservedBalance = Column('reserved_balance', Numeric(10, 6), nullable=False, default=0)

    totalCreditsPurchased = Column('total_credits_purchased', Numeric(10, 6), nullable=False, default=0)
    totalCreditsSpent = Column('total_credits_spent', Numeric(10, 6), nullable=False, default=0)

    lowBalanceThreshold = Column('low_balance_threshold', Numeric(10, 6), default=10.00)
    lowBalanceAlertSent = Column('low_balance_alert_sent', Boolean, default=False)

    autoRechargeEnabled = Column('auto_recharge_enabled', Boolean, default=False)
    autoRechargeThreshold = Column('auto_recharge_threshold', Numeric(10, 6), default=5.00)
    autoRechargeAmount = Column('auto_recharge_amount', Numeric(10, 6), default=25.00)

    createdAt = Column('created_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))
    updatedAt = Column('updated_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))


class CreditTransaction(Base):
    __tablename__ = 'credit_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    userId = Column('user_id', Text, nullable=False)

    transactionType = Column('transaction_type', Text, nullable=False)
    amount = Column('amount', Numeric(10, 6), nullable=False)

    balanceBefore = Column('balance_before', Numeric(10, 6), nullable=False)
    balanceAfter = Column('balance_after', Numeric(10, 6), nullable=False)

    callLogId = Column('call_log_id', UUID(as_uuid=True))
    paymentId = Column('payment_id', Text)

    description = Column('description', Text)
    transactionMetadata = Column('metadata', JSONB)

    createdAt = Column('created_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))


class MessageCostBreakdown(Base):
    __tablename__ = 'message_cost_breakdown'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    userId = Column('user_id', Text, nullable=False)

    messageId = Column('message_id', Text, nullable=False)
    conversationId = Column('conversation_id', Text)
    agentConfigId = Column('agent_config_id', Text)

    # LLM
    llmProvider = Column('llm_provider', Text, nullable=False)
    llmModel = Column('llm_model', Text, nullable=False)
    llmInputTokens = Column('llm_input_tokens', Integer, nullable=False, default=0)
    llmOutputTokens = Column('llm_output_tokens', Integer, nullable=False, default=0)
    llmRealCost = Column('llm_real_cost', Numeric(10, 6), nullable=False, default=0)

    # Platform
    platformOverheadCost = Column('platform_overhead_cost', Numeric(10, 6), nullable=False, default=0)

    # Tools
    toolInvocations = Column('tool_invocations', JSONB, default=[])
    toolTotalCost = Column('tool_total_cost', Numeric(10, 6), nullable=False, default=0)

    # Totals
    totalRealCost = Column('total_real_cost', Numeric(10, 6), nullable=False)

    # Customer Pricing
    customerMessageTier = Column('customer_message_tier', Text)
    customerBaseCost = Column('customer_base_cost', Numeric(10, 6), nullable=False)
    customerLlmAddon = Column('customer_llm_addon', Numeric(10, 6), nullable=False, default=0)
    customerFeatureCosts = Column('customer_feature_costs', Numeric(10, 6), nullable=False, default=0)
    totalCustomerCost = Column('total_customer_cost', Numeric(10, 6), nullable=False)

    # Metadata
    createdAt = Column('created_at', TIMESTAMP, nullable=False, server_default=text('NOW()'))
