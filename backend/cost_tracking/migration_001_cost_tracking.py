"""
Cost Tracking System Migration

Description:
  - Add comprehensive cost tracking with real-time balance deduction
  - Support pre-pay credits system
  - Track both voice (per-minute) and text (per-message) agents
  - Admin-configurable pricing for all providers

Tables Created:
  1. pricing_config - Provider rates and customer pricing (admin configurable)
  2. call_cost_breakdown - Itemized cost breakdown per call
  3. customer_balance - Pre-pay credit balance per user
  4. credit_transactions - Credit add/deduct history
  5. message_cost_breakdown - Text agent message costs (future)

Tables Updated:
  - call_logs: Add cost columns
  - users: Add credit balance tracking
"""

import logging
from datetime import datetime
from sqlalchemy import text

logger = logging.getLogger(__name__)


def upgrade(db_session):
    """Apply cost tracking migration"""
    logger.info("🔧 Starting cost tracking migration...")

    # ========================================
    # Table 1: pricing_config
    # ========================================
    logger.info("Creating pricing_config table...")
    db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS pricing_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_name TEXT NOT NULL UNIQUE,
          user_id TEXT, -- NULL for system defaults, userId for custom overrides

          -- ===== REAL COSTS (what we pay providers) =====

          -- STT Providers (per audio minute)
          deepgram_nova2_per_min DECIMAL(10, 6) DEFAULT 0.08,
          deepgram_nova3_per_min DECIMAL(10, 6) DEFAULT 0.10,
          deepgram_whisper_per_min DECIMAL(10, 6) DEFAULT 0.08,
          assemblyai_standard_per_min DECIMAL(10, 6) DEFAULT 0.05,

          -- LLM Providers - VOICE AGENTS (per 1M tokens)
          openai_gpt4o_mini_input_per_1m_voice DECIMAL(10, 6) DEFAULT 15.00,
          openai_gpt4o_mini_output_per_1m_voice DECIMAL(10, 6) DEFAULT 60.00,
          openai_gpt4_input_per_1m_voice DECIMAL(10, 6) DEFAULT 30.00,
          openai_gpt4_output_per_1m_voice DECIMAL(10, 6) DEFAULT 60.00,
          anthropic_claude_35_input_per_1m_voice DECIMAL(10, 6) DEFAULT 3.00,
          anthropic_claude_35_output_per_1m_voice DECIMAL(10, 6) DEFAULT 15.00,

          -- LLM Providers - TEXT AGENTS (per 1M tokens)
          openai_gpt4o_mini_input_per_1m_text DECIMAL(10, 6) DEFAULT 0.15,
          openai_gpt4o_mini_output_per_1m_text DECIMAL(10, 6) DEFAULT 0.60,
          openai_gpt4_input_per_1m_text DECIMAL(10, 6) DEFAULT 5.00,
          openai_gpt4_output_per_1m_text DECIMAL(10, 6) DEFAULT 15.00,
          anthropic_claude_35_input_per_1m_text DECIMAL(10, 6) DEFAULT 3.00,
          anthropic_claude_35_output_per_1m_text DECIMAL(10, 6) DEFAULT 15.00,

          -- TTS Providers
          openai_tts_per_1m_chars DECIMAL(10, 6) DEFAULT 15.00,
          openai_tts_hd_per_1m_chars DECIMAL(10, 6) DEFAULT 30.00,
          cartesia_per_audio_min DECIMAL(10, 6) DEFAULT 1.50,
          elevenlabs_turbo_per_1k_chars DECIMAL(10, 6) DEFAULT 0.18,
          playht_per_1k_chars DECIMAL(10, 6) DEFAULT 0.60,

          -- Telephony
          inbound_per_minute DECIMAL(10, 6) DEFAULT 0.001,
          outbound_per_minute DECIMAL(10, 6) DEFAULT 0.002,
          did_monthly_cost DECIMAL(10, 6) DEFAULT 2.00,
          sms_per_message DECIMAL(10, 6) DEFAULT 0.0075,
          whatsapp_per_message DECIMAL(10, 6) DEFAULT 0.005,

          -- LiveKit
          livekit_monthly_base DECIMAL(10, 6) DEFAULT 50.00,
          livekit_per_participant_min DECIMAL(10, 6) DEFAULT 0.0,
          livekit_recording_per_gb_month DECIMAL(10, 6) DEFAULT 0.023,

          -- Platform Overhead
          platform_overhead_per_call_min DECIMAL(10, 6) DEFAULT 0.01,
          platform_overhead_per_text_message DECIMAL(10, 6) DEFAULT 0.001,

          -- ===== CUSTOMER PRICING =====

          -- Voice Agent Tiers (per minute)
          customer_voice_basic_per_min DECIMAL(10, 6) DEFAULT 0.40,
          customer_voice_advanced_per_min DECIMAL(10, 6) DEFAULT 0.70,
          customer_voice_premium_per_min DECIMAL(10, 6) DEFAULT 1.00,

          -- Voice LLM Add-ons (per minute)
          customer_voice_gpt4_addon_per_min DECIMAL(10, 6) DEFAULT 0.15,
          customer_voice_claude_addon_per_min DECIMAL(10, 6) DEFAULT 0.25,

          -- Voice TTS Add-ons (per minute)
          customer_voice_cartesia_addon_per_min DECIMAL(10, 6) DEFAULT 0.05,
          customer_voice_elevenlabs_addon_per_min DECIMAL(10, 6) DEFAULT 0.20,
          customer_voice_playht_addon_per_min DECIMAL(10, 6) DEFAULT 0.15,

          -- Text Agent Pricing (per message)
          customer_text_basic_per_message DECIMAL(10, 6) DEFAULT 0.01,
          customer_text_advanced_per_message DECIMAL(10, 6) DEFAULT 0.02,
          customer_text_premium_per_message DECIMAL(10, 6) DEFAULT 0.05,

          -- Text Agent Bundles (discounted rates)
          customer_text_bundle_100_price DECIMAL(10, 6) DEFAULT 0.80,  -- $0.80 for 100 messages
          customer_text_bundle_1000_price DECIMAL(10, 6) DEFAULT 6.00, -- $6 for 1000 messages
          customer_text_bundle_10000_price DECIMAL(10, 6) DEFAULT 50.00, -- $50 for 10k messages

          -- Text LLM Add-ons (per message)
          customer_text_gpt4_addon_per_message DECIMAL(10, 6) DEFAULT 0.005,
          customer_text_claude_addon_per_message DECIMAL(10, 6) DEFAULT 0.008,

          -- Features & Add-ons
          customer_did_monthly DECIMAL(10, 6) DEFAULT 5.00,
          customer_outbound_addon_per_min DECIMAL(10, 6) DEFAULT 0.05,
          customer_sms_per_message DECIMAL(10, 6) DEFAULT 0.02,
          customer_whatsapp_per_message DECIMAL(10, 6) DEFAULT 0.015,
          customer_tool_per_invocation DECIMAL(10, 6) DEFAULT 0.01,
          customer_crm_per_call DECIMAL(10, 6) DEFAULT 0.05,
          customer_recording_per_gb_month DECIMAL(10, 6) DEFAULT 0.10,

          -- Default Markup Multipliers
          default_voice_markup_multiplier DECIMAL(10, 4) DEFAULT 4.0,
          default_text_markup_multiplier DECIMAL(10, 4) DEFAULT 5.0,

          -- Metadata
          effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_pricing_config_user ON pricing_config(user_id);
    """))

    # Insert system default config
    db_session.execute(text("""
        INSERT INTO pricing_config (config_name, user_id)
        VALUES ('system_default', NULL)
        ON CONFLICT (config_name) DO NOTHING;
    """))

    # ========================================
    # Table 2: call_cost_breakdown
    # ========================================
    logger.info("Creating call_cost_breakdown table...")
    db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS call_cost_breakdown (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          call_log_id UUID NOT NULL,
          user_id TEXT NOT NULL,

          -- ===== USAGE METRICS =====

          -- STT Usage
          stt_provider TEXT NOT NULL,
          stt_model TEXT NOT NULL,
          stt_audio_minutes DECIMAL(10, 4) NOT NULL DEFAULT 0,
          stt_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- LLM Usage
          llm_provider TEXT NOT NULL,
          llm_model TEXT NOT NULL,
          llm_input_tokens INTEGER NOT NULL DEFAULT 0,
          llm_output_tokens INTEGER NOT NULL DEFAULT 0,
          llm_total_tokens INTEGER GENERATED ALWAYS AS (llm_input_tokens + llm_output_tokens) STORED,
          llm_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- TTS Usage
          tts_provider TEXT NOT NULL,
          tts_model TEXT,
          tts_characters INTEGER NOT NULL DEFAULT 0,
          tts_audio_seconds DECIMAL(10, 4),
          tts_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Telephony Usage
          telephony_direction TEXT NOT NULL, -- 'inbound', 'outbound'
          telephony_minutes DECIMAL(10, 4) NOT NULL,
          telephony_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- LiveKit Usage
          livekit_participant_minutes DECIMAL(10, 4),
          livekit_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- DID Allocation (amortized)
          did_phone_number TEXT,
          did_allocation_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Platform Overhead
          platform_overhead_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Tool Invocations
          tool_invocations JSONB DEFAULT '[]', -- [{name, count, cost}, ...]
          tool_total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Recording
          recording_enabled BOOLEAN DEFAULT FALSE,
          recording_size_mb DECIMAL(10, 4),
          recording_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- ===== COST TOTALS =====
          total_real_cost DECIMAL(10, 6) NOT NULL,

          -- ===== CUSTOMER PRICING =====
          customer_voice_tier TEXT, -- 'basic', 'advanced', 'premium'
          customer_base_cost DECIMAL(10, 6) NOT NULL,
          customer_llm_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
          customer_tts_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
          customer_outbound_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
          customer_feature_costs DECIMAL(10, 6) NOT NULL DEFAULT 0,
          total_customer_cost DECIMAL(10, 6) NOT NULL,

          -- ===== PROFIT METRICS =====
          profit_margin DECIMAL(10, 6) GENERATED ALWAYS AS (total_customer_cost - total_real_cost) STORED,
          markup_multiplier DECIMAL(10, 4) GENERATED ALWAYS AS (
            CASE WHEN total_real_cost > 0
            THEN total_customer_cost / total_real_cost
            ELSE 0 END
          ) STORED,

          -- Metadata
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_call_cost_user ON call_cost_breakdown(user_id);
        CREATE INDEX IF NOT EXISTS idx_call_cost_call_log ON call_cost_breakdown(call_log_id);
        CREATE INDEX IF NOT EXISTS idx_call_cost_created ON call_cost_breakdown(created_at);
    """))

    # ========================================
    # Table 3: customer_balance
    # ========================================
    logger.info("Creating customer_balance table...")
    db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS customer_balance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL UNIQUE,

          -- Balance
          current_balance DECIMAL(10, 6) NOT NULL DEFAULT 0,
          reserved_balance DECIMAL(10, 6) NOT NULL DEFAULT 0, -- Held during active calls
          available_balance DECIMAL(10, 6) GENERATED ALWAYS AS (current_balance - reserved_balance) STORED,

          -- Lifetime Stats
          total_credits_purchased DECIMAL(10, 6) NOT NULL DEFAULT 0,
          total_credits_spent DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Low Balance Alerts
          low_balance_threshold DECIMAL(10, 6) DEFAULT 10.00,
          low_balance_alert_sent BOOLEAN DEFAULT FALSE,

          -- Auto-recharge (optional)
          auto_recharge_enabled BOOLEAN DEFAULT FALSE,
          auto_recharge_threshold DECIMAL(10, 6) DEFAULT 5.00,
          auto_recharge_amount DECIMAL(10, 6) DEFAULT 25.00,

          -- Metadata
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

          CONSTRAINT fk_customer_balance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_customer_balance_user ON customer_balance(user_id);
    """))

    # ========================================
    # Table 4: credit_transactions
    # ========================================
    logger.info("Creating credit_transactions table...")
    db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS credit_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,

          -- Transaction Details
          transaction_type TEXT NOT NULL, -- 'purchase', 'deduction', 'refund', 'bonus', 'reserve', 'release'
          amount DECIMAL(10, 6) NOT NULL, -- Positive for credits added, negative for deductions

          -- Balance Snapshots
          balance_before DECIMAL(10, 6) NOT NULL,
          balance_after DECIMAL(10, 6) NOT NULL,

          -- Related Records
          call_log_id UUID, -- If deduction from call
          payment_id TEXT, -- If purchase via payment processor

          -- Description
          description TEXT,
          metadata JSONB, -- Additional context

          -- Metadata
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),

          CONSTRAINT fk_credit_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_credit_transaction_user ON credit_transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_credit_transaction_type ON credit_transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_credit_transaction_created ON credit_transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_credit_transaction_call ON credit_transactions(call_log_id);
    """))

    # ========================================
    # Table 5: message_cost_breakdown (for text agents)
    # ========================================
    logger.info("Creating message_cost_breakdown table...")
    db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS message_cost_breakdown (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,

          -- Message Details
          message_id TEXT NOT NULL,
          conversation_id TEXT,
          agent_config_id TEXT,

          -- LLM Usage
          llm_provider TEXT NOT NULL,
          llm_model TEXT NOT NULL,
          llm_input_tokens INTEGER NOT NULL DEFAULT 0,
          llm_output_tokens INTEGER NOT NULL DEFAULT 0,
          llm_total_tokens INTEGER GENERATED ALWAYS AS (llm_input_tokens + llm_output_tokens) STORED,
          llm_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Platform Overhead
          platform_overhead_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- Tool Costs
          tool_invocations JSONB DEFAULT '[]',
          tool_total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

          -- ===== COST TOTALS =====
          total_real_cost DECIMAL(10, 6) NOT NULL,

          -- ===== CUSTOMER PRICING =====
          customer_message_tier TEXT, -- 'basic', 'advanced', 'premium'
          customer_base_cost DECIMAL(10, 6) NOT NULL,
          customer_llm_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
          customer_feature_costs DECIMAL(10, 6) NOT NULL DEFAULT 0,
          total_customer_cost DECIMAL(10, 6) NOT NULL,

          -- Profit Metrics
          profit_margin DECIMAL(10, 6) GENERATED ALWAYS AS (total_customer_cost - total_real_cost) STORED,

          -- Metadata
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),

          CONSTRAINT fk_message_cost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_message_cost_user ON message_cost_breakdown(user_id);
        CREATE INDEX IF NOT EXISTS idx_message_cost_message ON message_cost_breakdown(message_id);
        CREATE INDEX IF NOT EXISTS idx_message_cost_conversation ON message_cost_breakdown(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_message_cost_created ON message_cost_breakdown(created_at);
    """))

    # ========================================
    # Update: call_logs table
    # ========================================
    logger.info("Updating call_logs table...")
    db_session.execute(text("""
        ALTER TABLE call_logs
          ADD COLUMN IF NOT EXISTS cost_breakdown_id UUID,
          ADD COLUMN IF NOT EXISTS total_real_cost DECIMAL(10, 6),
          ADD COLUMN IF NOT EXISTS total_customer_cost DECIMAL(10, 6),
          ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(10, 6),
          ADD COLUMN IF NOT EXISTS usage_metrics JSONB,
          ADD COLUMN IF NOT EXISTS voice_tier TEXT,
          ADD COLUMN IF NOT EXISTS llm_used TEXT,
          ADD COLUMN IF NOT EXISTS tts_used TEXT,
          ADD COLUMN IF NOT EXISTS credits_reserved DECIMAL(10, 6) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS credits_charged DECIMAL(10, 6) DEFAULT 0;

        CREATE INDEX IF NOT EXISTS idx_call_logs_cost_breakdown ON call_logs(cost_breakdown_id);
    """))

    # ========================================
    # Update: users table
    # ========================================
    logger.info("Updating users table...")
    db_session.execute(text("""
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10, 6) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10, 6) DEFAULT 0;
    """))

    db_session.commit()
    logger.info("✅ Cost tracking migration completed successfully")


def downgrade(db_session):
    """Rollback cost tracking migration"""
    logger.info("🔄 Rolling back cost tracking migration...")

    # Drop tables in reverse order (respecting foreign keys)
    db_session.execute(text("DROP TABLE IF EXISTS message_cost_breakdown CASCADE;"))
    db_session.execute(text("DROP TABLE IF EXISTS credit_transactions CASCADE;"))
    db_session.execute(text("DROP TABLE IF EXISTS customer_balance CASCADE;"))
    db_session.execute(text("DROP TABLE IF EXISTS call_cost_breakdown CASCADE;"))
    db_session.execute(text("DROP TABLE IF EXISTS pricing_config CASCADE;"))

    # Remove columns from existing tables
    db_session.execute(text("""
        ALTER TABLE call_logs
          DROP COLUMN IF EXISTS cost_breakdown_id,
          DROP COLUMN IF EXISTS total_real_cost,
          DROP COLUMN IF EXISTS total_customer_cost,
          DROP COLUMN IF EXISTS profit_margin,
          DROP COLUMN IF EXISTS usage_metrics,
          DROP COLUMN IF EXISTS voice_tier,
          DROP COLUMN IF EXISTS llm_used,
          DROP COLUMN IF EXISTS tts_used,
          DROP COLUMN IF EXISTS credits_reserved,
          DROP COLUMN IF EXISTS credits_charged;
    """))

    db_session.execute(text("""
        ALTER TABLE users
          DROP COLUMN IF EXISTS credit_balance,
          DROP COLUMN IF EXISTS total_spent;
    """))

    db_session.commit()
    logger.info("✅ Cost tracking migration rolled back successfully")


if __name__ == "__main__":
    # Test migration
    from database import SessionLocal

    db = SessionLocal()
    try:
        upgrade(db)
        print("✅ Migration test passed!")
    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        db.rollback()
    finally:
        db.close()
