# Cost Tracking Implementation Plan - ACTUAL RATES

## 📊 REVISED REAL COST BREAKDOWN (Actual Provider Rates)

### Provider Rates (Confirmed from User)

| Service | Rate | Unit | Source |
|---------|------|------|--------|
| **Deepgram STT** | $0.08/min | audio minute | User confirmed |
| **OpenAI GPT** | $15/1M tokens (input) | per 1M input tokens | User confirmed |
| **OpenAI GPT** | $60/1M tokens (output) | per 1M output tokens | User confirmed |
| **MagnusBilling** | $0.001/min | telephony minute | User confirmed |
| **LiveKit** | Free → $50/mo planned | usage-based | User confirmed (TBD) |

### Revised Cost Calculation (1-minute call example)

```
STT (Deepgram):           1.0 min × $0.08/min           = $0.0800
LLM (OpenAI GPT):         ~2000 tokens × $0.0000375    = $0.0750  (mixed input/output)
TTS (OpenAI):             ~500 chars × $0.000015        = $0.0075
Telephony (Magnus):       1.0 min × $0.001/min          = $0.0010
LiveKit Media:            Included in $50/mo or free    = $0.0000  (for now)
Platform Overhead:        1.0 min × $0.01/min           = $0.0100
                                                  TOTAL = $0.1735
```

**Real Cost Per Minute: ~$0.15-0.20** (15-20 cents)

### Component Cost Breakdown

| Component | Low | High | Notes |
|-----------|-----|------|-------|
| STT | $0.06 | $0.08 | Depends on BYO TTS, volume discount |
| LLM | $0.02 | $0.15 | Varies by model (mini vs full GPT-4) & conversation length |
| TTS | $0.005 | $0.03 | Depends on provider (OpenAI vs Cartesia vs ElevenLabs) |
| Telephony | $0.001 | $0.002 | Inbound vs outbound |
| LiveKit | $0 | $0.01 | Free now, may add usage charges later |
| Platform | $0.01 | $0.02 | Server overhead amortized |
| **TOTAL** | **$0.10** | **$0.25** | **Per minute** |

---

## 💰 COMPONENT-BASED CUSTOMER PRICING

### Pricing Structure Design

**Base Components:**
1. **Conversation Base** - Core platform access
2. **Voice Feature** - Voice AI capability (per minute)
3. **LLM Tier** - Model quality selection
4. **Voice Provider** - TTS quality selection
5. **Add-on Features** - Tools, SMS, WhatsApp, etc.

### Example Pricing Tiers

#### Voice Per-Minute Rates (Component: Voice Feature)

| Tier | Real Cost | Customer Rate | Markup | Includes |
|------|-----------|---------------|--------|----------|
| **Basic Voice** | $0.10/min | $0.40/min | 4x | Standard STT + GPT-4o-mini + Basic TTS |
| **Advanced Voice** | $0.18/min | $0.70/min | 3.9x | Enhanced STT + GPT-4 + Premium TTS |
| **Premium Voice** | $0.25/min | $1.00/min | 4x | Best STT + GPT-4 + ElevenLabs TTS |

#### LLM Model Selection (Component: LLM Tier)

| Model | Real Cost/min | Customer Add-on | Description |
|-------|---------------|-----------------|-------------|
| **GPT-4o-mini** | $0.02 | Included in base | Fast, cost-effective |
| **GPT-4** | $0.08 | +$0.15/min | Better reasoning |
| **GPT-4 Turbo** | $0.10 | +$0.20/min | Fastest GPT-4 |
| **Claude 3.5 Sonnet** | $0.12 | +$0.25/min | Best reasoning |

#### TTS Voice Provider Selection (Component: Voice Provider)

| Provider | Real Cost/min | Customer Add-on | Quality |
|----------|---------------|-----------------|---------|
| **OpenAI TTS** | $0.005 | Included | Good, natural |
| **Cartesia** | $0.025 | +$0.05/min | Fast, low latency |
| **ElevenLabs Turbo** | $0.10 | +$0.20/min | Premium, most natural |
| **PlayHT** | $0.08 | +$0.15/min | Voice cloning |

#### Add-on Features (Component: Features)

| Feature | Real Cost | Customer Price | Billing |
|---------|-----------|----------------|---------|
| **DID Rental** | $2/mo | $5/mo | Monthly per number |
| **Outbound Calling** | $0.001/min | +$0.05/min | Per minute |
| **SMS** | $0.0075/msg | $0.02/msg | Per message |
| **WhatsApp** | $0.005/msg | $0.015/msg | Per message |
| **Function Tools** | $0.001/call | $0.01/call | Per tool invocation |
| **CRM Integration** | $0 | $0.05/call | Per API call |
| **Recording Storage** | $0.023/GB-mo | $0.10/GB-mo | Storage |

---

## 🗄️ DATABASE SCHEMA

### Table 1: `pricing_config`
Store configurable rates for all providers.

```sql
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL, -- 'system_default', 'user_override_{userId}'
  user_id TEXT, -- NULL for system defaults

  -- === REAL COSTS (what we pay providers) ===

  -- STT Providers
  deepgram_nova2_per_min DECIMAL(10, 6) DEFAULT 0.08,
  deepgram_nova2_enhanced_per_min DECIMAL(10, 6) DEFAULT 0.10,
  deepgram_whisper_per_min DECIMAL(10, 6) DEFAULT 0.08,

  -- LLM Providers (per 1M tokens)
  openai_gpt4o_mini_input_per_1m DECIMAL(10, 6) DEFAULT 15.00,
  openai_gpt4o_mini_output_per_1m DECIMAL(10, 6) DEFAULT 60.00,
  openai_gpt4_input_per_1m DECIMAL(10, 6) DEFAULT 30.00,
  openai_gpt4_output_per_1m DECIMAL(10, 6) DEFAULT 60.00,
  anthropic_claude_35_input_per_1m DECIMAL(10, 6) DEFAULT 3.00,
  anthropic_claude_35_output_per_1m DECIMAL(10, 6) DEFAULT 15.00,

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
  livekit_per_participant_min DECIMAL(10, 6) DEFAULT 0.0,
  livekit_monthly_base DECIMAL(10, 6) DEFAULT 50.00,
  livekit_recording_per_gb_month DECIMAL(10, 6) DEFAULT 0.023,

  -- Platform Overhead
  platform_overhead_per_min DECIMAL(10, 6) DEFAULT 0.01,

  -- === CUSTOMER PRICING ===

  -- Voice Tiers (per minute)
  customer_voice_basic_per_min DECIMAL(10, 6) DEFAULT 0.40,
  customer_voice_advanced_per_min DECIMAL(10, 6) DEFAULT 0.70,
  customer_voice_premium_per_min DECIMAL(10, 6) DEFAULT 1.00,

  -- LLM Add-ons
  customer_gpt4_addon_per_min DECIMAL(10, 6) DEFAULT 0.15,
  customer_claude_addon_per_min DECIMAL(10, 6) DEFAULT 0.25,

  -- TTS Add-ons
  customer_cartesia_addon_per_min DECIMAL(10, 6) DEFAULT 0.05,
  customer_elevenlabs_addon_per_min DECIMAL(10, 6) DEFAULT 0.20,
  customer_playht_addon_per_min DECIMAL(10, 6) DEFAULT 0.15,

  -- Features
  customer_did_monthly DECIMAL(10, 6) DEFAULT 5.00,
  customer_outbound_addon_per_min DECIMAL(10, 6) DEFAULT 0.05,
  customer_sms_per_message DECIMAL(10, 6) DEFAULT 0.02,
  customer_whatsapp_per_message DECIMAL(10, 6) DEFAULT 0.015,
  customer_tool_per_invocation DECIMAL(10, 6) DEFAULT 0.01,
  customer_crm_per_call DECIMAL(10, 6) DEFAULT 0.05,
  customer_recording_per_gb_month DECIMAL(10, 6) DEFAULT 0.10,

  -- Default Markup
  default_markup_multiplier DECIMAL(10, 4) DEFAULT 4.0,

  -- Metadata
  effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(config_name)
);

-- Create system default config
INSERT INTO pricing_config (config_name) VALUES ('system_default');
```

### Table 2: `call_cost_breakdown`
Store itemized costs per call for transparency.

```sql
CREATE TABLE call_cost_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- === USAGE METRICS ===

  -- STT Usage
  stt_provider TEXT NOT NULL, -- 'deepgram', 'assemblyai', etc.
  stt_model TEXT NOT NULL,    -- 'nova-2', 'whisper', etc.
  stt_audio_minutes DECIMAL(10, 4) NOT NULL DEFAULT 0,
  stt_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- LLM Usage
  llm_provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
  llm_model TEXT NOT NULL,    -- 'gpt-4o-mini', 'claude-3.5-sonnet', etc.
  llm_input_tokens INTEGER NOT NULL DEFAULT 0,
  llm_output_tokens INTEGER NOT NULL DEFAULT 0,
  llm_total_tokens INTEGER GENERATED ALWAYS AS (llm_input_tokens + llm_output_tokens) STORED,
  llm_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- TTS Usage
  tts_provider TEXT NOT NULL, -- 'openai', 'cartesia', 'elevenlabs', etc.
  tts_model TEXT,             -- 'tts-1', 'tts-1-hd', 'sonic', etc.
  tts_characters INTEGER NOT NULL DEFAULT 0,
  tts_audio_seconds DECIMAL(10, 4), -- For providers that bill by audio duration
  tts_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Telephony Usage
  telephony_direction TEXT NOT NULL, -- 'inbound', 'outbound'
  telephony_minutes DECIMAL(10, 4) NOT NULL,
  telephony_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- LiveKit Usage
  livekit_participant_minutes DECIMAL(10, 4),
  livekit_real_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- DID Allocation
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

  -- === COST TOTALS ===
  total_real_cost DECIMAL(10, 6) NOT NULL,

  -- === CUSTOMER PRICING ===
  customer_voice_tier TEXT, -- 'basic', 'advanced', 'premium'
  customer_base_cost DECIMAL(10, 6) NOT NULL,
  customer_llm_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
  customer_tts_addon DECIMAL(10, 6) NOT NULL DEFAULT 0,
  customer_feature_costs DECIMAL(10, 6) NOT NULL DEFAULT 0,
  total_customer_cost DECIMAL(10, 6) NOT NULL,

  -- === PROFIT METRICS ===
  profit_margin DECIMAL(10, 6) GENERATED ALWAYS AS (total_customer_cost - total_real_cost) STORED,
  markup_multiplier DECIMAL(10, 4) GENERATED ALWAYS AS (
    CASE WHEN total_real_cost > 0
    THEN total_customer_cost / total_real_cost
    ELSE 0 END
  ) STORED,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_call_cost_user (user_id),
  INDEX idx_call_cost_call_log (call_log_id),
  INDEX idx_call_cost_created (created_at)
);
```

### Table 3: Update `call_logs`

```sql
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS cost_breakdown_id UUID REFERENCES call_cost_breakdown(id),
  ADD COLUMN IF NOT EXISTS total_real_cost DECIMAL(10, 6),
  ADD COLUMN IF NOT EXISTS total_customer_cost DECIMAL(10, 6),
  ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(10, 6),

  -- Store raw usage metrics from LiveKit UsageCollector
  ADD COLUMN IF NOT EXISTS usage_metrics JSONB,

  -- Voice agent configuration used
  ADD COLUMN IF NOT EXISTS voice_tier TEXT,
  ADD COLUMN IF NOT EXISTS llm_used TEXT,
  ADD COLUMN IF NOT EXISTS tts_used TEXT;
```

---

## 🔧 IMPLEMENTATION: Real-Time Cost Tracking

### Step 1: Hook into LiveKit Agent Shutdown

Modify agent entrypoint to calculate and store costs:

```python
# File: backend/livekit_cost_tracker.py

import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
import uuid

from database import SessionLocal
from .models import CallLog
from .pricing import PricingService, CallCostBreakdown

logger = logging.getLogger(__name__)


class LiveKitCostTracker:
    """
    Real-time cost tracking for LiveKit voice agent calls.

    Hooks into agent shutdown to:
    1. Parse UsageCollector metrics
    2. Calculate real costs based on provider rates
    3. Calculate customer costs based on pricing config
    4. Store breakdown in database
    """

    def __init__(self):
        self.pricing_service = PricingService()

    async def track_call_costs(
        self,
        room_name: str,
        usage_summary: Dict[str, Any],
        agent_config: Dict[str, Any],
        call_duration_seconds: int
    ) -> Optional[uuid.UUID]:
        """
        Calculate and store costs for a completed call.

        Args:
            room_name: LiveKit room name
            usage_summary: Output from UsageCollector.get_summary()
            agent_config: Agent configuration used
            call_duration_seconds: Total call duration

        Returns:
            cost_breakdown_id or None if failed
        """
        logger.info(f"📊 Tracking costs for room {room_name}")

        db = SessionLocal()
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

            # 3. Calculate real costs
            real_costs = self.pricing_service.calculate_real_costs(
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
                telephony_direction='inbound',  # Determine from call_log
            )

            # 4. Calculate customer costs
            customer_costs = self.pricing_service.calculate_customer_costs(
                voice_tier=agent_config.get('voiceTier', 'basic'),
                llm_model=agent_config.get('llmModel'),
                tts_provider=agent_config.get('ttsProvider'),
                call_duration_minutes=call_duration_seconds / 60.0,
                features_used=agent_config.get('featuresEnabled', [])
            )

            # 5. Create cost breakdown record
            breakdown = CallCostBreakdown(
                id=str(uuid.uuid4()),
                callLogId=call_log.id,
                userId=call_log.userId,

                # STT
                sttProvider=agent_config.get('sttProvider', 'deepgram'),
                sttModel=agent_config.get('sttModel', 'nova-2'),
                sttAudioMinutes=stt_minutes,
                sttRealCost=real_costs['stt'],

                # LLM
                llmProvider=agent_config.get('llmProvider', 'openai'),
                llmModel=agent_config.get('llmModel', 'gpt-4o-mini'),
                llmInputTokens=llm_tokens['input'],
                llmOutputTokens=llm_tokens['output'],
                llmRealCost=real_costs['llm'],

                # TTS
                ttsProvider=agent_config.get('ttsProvider', 'openai'),
                ttsModel=agent_config.get('ttsModel'),
                ttsCharacters=tts_chars,
                ttsRealCost=real_costs['tts'],

                # Telephony
                telephonyDirection='inbound',
                telephonyMinutes=call_duration_seconds / 60.0,
                telephonyRealCost=real_costs['telephony'],

                # Totals
                totalRealCost=real_costs['total'],
                totalCustomerCost=customer_costs['total'],
                customerVoiceTier=agent_config.get('voiceTier', 'basic'),
                customerBaseCost=customer_costs['base'],
                customerLlmAddon=customer_costs['llm_addon'],
                customerTtsAddon=customer_costs['tts_addon'],
                customerFeatureCosts=customer_costs['features'],
            )

            db.add(breakdown)

            # 6. Update call_log with costs
            call_log.costBreakdownId = breakdown.id
            call_log.totalRealCost = real_costs['total']
            call_log.totalCustomerCost = customer_costs['total']
            call_log.profitMargin = customer_costs['total'] - real_costs['total']
            call_log.usageMetrics = usage_summary  # Store raw metrics
            call_log.voiceTier = agent_config.get('voiceTier')
            call_log.llmUsed = agent_config.get('llmModel')
            call_log.ttsUsed = agent_config.get('ttsProvider')

            db.commit()

            logger.info(
                f"✅ Cost tracking complete: "
                f"Real=${real_costs['total']:.4f}, "
                f"Customer=${customer_costs['total']:.4f}, "
                f"Profit=${customer_costs['total'] - real_costs['total']:.4f}"
            )

            return breakdown.id

        except Exception as e:
            logger.error(f"Failed to track costs: {e}", exc_info=True)
            db.rollback()
            return None
        finally:
            db.close()

    def _extract_stt_minutes(self, usage: Dict, duration_sec: int) -> float:
        """Extract STT audio minutes from usage metrics"""
        # LiveKit UsageCollector may provide stt_audio_duration_ms
        stt_ms = usage.get('stt', {}).get('audio_duration_ms', duration_sec * 1000)
        return stt_ms / 60000.0

    def _extract_llm_tokens(self, usage: Dict) -> Dict[str, int]:
        """Extract LLM token counts from usage metrics"""
        llm = usage.get('llm', {})
        return {
            'input': llm.get('prompt_tokens', 0) + llm.get('input_tokens', 0),
            'output': llm.get('completion_tokens', 0) + llm.get('output_tokens', 0)
        }

    def _extract_tts_characters(self, usage: Dict) -> int:
        """Extract TTS character count from usage metrics"""
        tts = usage.get('tts', {})
        return tts.get('characters', 0) or tts.get('character_count', 0)
```

### Step 2: Modify Agent Entrypoint

```python
# In voice_agents/tst0002.py or agent_creator.py generated agents

from backend.livekit_cost_tracker import LiveKitCostTracker

async def entrypoint(ctx: JobContext):
    # ... existing setup ...

    cost_tracker = LiveKitCostTracker()
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage_and_track_costs():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

        # NEW: Track costs in database
        agent_config = await load_agent_config(ctx.room.name)
        await cost_tracker.track_call_costs(
            room_name=ctx.room.name,
            usage_summary=summary,
            agent_config=agent_config,
            call_duration_seconds=session.duration_seconds
        )

    ctx.add_shutdown_callback(log_usage_and_track_costs)

    # ... rest of agent setup ...
```

---

## 📈 CUSTOMER-FACING COST BREAKDOWN UI

### API Endpoint: Get Call Cost Breakdown

```python
# In user_dashboard.py

@app.route('/api/v1/calls/<call_id>/costs', methods=['GET'])
@require_authentication
def get_call_costs(call_id):
    """Get detailed cost breakdown for a call"""
    user_email = request.headers.get('X-User-Email')
    user = db.query(User).filter(User.email == user_email).first()

    call = db.query(CallLog).filter(
        CallLog.id == call_id,
        CallLog.userId == user.id
    ).first()

    if not call:
        return jsonify({'success': False, 'error': 'Call not found'}), 404

    if not call.costBreakdownId:
        return jsonify({'success': False, 'error': 'Cost data not available'}), 404

    breakdown = db.query(CallCostBreakdown).filter(
        CallCostBreakdown.id == call.costBreakdownId
    ).first()

    return jsonify({
        'success': True,
        'data': {
            'total': float(breakdown.totalCustomerCost),
            'breakdown': {
                'voice_base': {
                    'label': f'{breakdown.customerVoiceTier.title()} Voice',
                    'cost': float(breakdown.customerBaseCost),
                    'details': f'{breakdown.telephonyMinutes:.2f} minutes @ ${breakdown.customerBaseCost / breakdown.telephonyMinutes:.4f}/min'
                },
                'llm': {
                    'label': f'{breakdown.llmModel} LLM',
                    'cost': float(breakdown.customerLlmAddon),
                    'details': f'{breakdown.llmTotalTokens:,} tokens ({breakdown.llmInputTokens:,} in / {breakdown.llmOutputTokens:,} out)'
                },
                'tts': {
                    'label': f'{breakdown.ttsProvider.title()} Voice',
                    'cost': float(breakdown.customerTtsAddon),
                    'details': f'{breakdown.ttsCharacters:,} characters'
                },
                'features': {
                    'label': 'Features & Add-ons',
                    'cost': float(breakdown.customerFeatureCosts),
                    'details': breakdown.toolInvocations if breakdown.toolInvocations else []
                }
            },
            'usage': {
                'duration_minutes': float(breakdown.telephonyMinutes),
                'stt_minutes': float(breakdown.sttAudioMinutes),
                'llm_tokens': breakdown.llmTotalTokens,
                'tts_characters': breakdown.ttsCharacters
            }
        }
    })
```

### Frontend Component: Cost Breakdown Card

```typescript
// frontend/components/calls/CallCostBreakdown.tsx

interface CostBreakdownProps {
  callId: string;
}

export function CallCostBreakdown({ callId }: CostBreakdownProps) {
  const [costs, setCosts] = useState(null);

  useEffect(() => {
    fetchCosts();
  }, [callId]);

  async function fetchCosts() {
    const response = await apiClient.get(`/api/v1/calls/${callId}/costs`);
    setCosts(response.data);
  }

  if (!costs) return <div>Loading cost breakdown...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
        <div className="text-2xl font-bold">${costs.total.toFixed(4)}</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Voice Base */}
          <div className="flex justify-between">
            <div>
              <div className="font-medium">{costs.breakdown.voice_base.label}</div>
              <div className="text-sm text-muted-foreground">
                {costs.breakdown.voice_base.details}
              </div>
            </div>
            <div className="font-mono">${costs.breakdown.voice_base.cost.toFixed(4)}</div>
          </div>

          {/* LLM Add-on */}
          {costs.breakdown.llm.cost > 0 && (
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{costs.breakdown.llm.label}</div>
                <div className="text-sm text-muted-foreground">
                  {costs.breakdown.llm.details}
                </div>
              </div>
              <div className="font-mono">${costs.breakdown.llm.cost.toFixed(4)}</div>
            </div>
          )}

          {/* TTS Add-on */}
          {costs.breakdown.tts.cost > 0 && (
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{costs.breakdown.tts.label}</div>
                <div className="text-sm text-muted-foreground">
                  {costs.breakdown.tts.details}
                </div>
              </div>
              <div className="font-mono">${costs.breakdown.tts.cost.toFixed(4)}</div>
            </div>
          )}

          {/* Features */}
          {costs.breakdown.features.cost > 0 && (
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{costs.breakdown.features.label}</div>
                <div className="text-sm text-muted-foreground">
                  {costs.breakdown.features.details.length} tool calls
                </div>
              </div>
              <div className="font-mono">${costs.breakdown.features.cost.toFixed(4)}</div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Usage Stats */}
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Duration: {costs.usage.duration_minutes.toFixed(2)} minutes</div>
          <div>Audio processed: {costs.usage.stt_minutes.toFixed(2)} minutes</div>
          <div>Tokens used: {costs.usage.llm_tokens.toLocaleString()}</div>
          <div>Speech generated: {costs.usage.tts_characters.toLocaleString()} chars</div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ NEXT STEPS

1. **Run database migrations** - Create pricing_config and call_cost_breakdown tables
2. **Implement PricingService** - Cost calculation logic
3. **Integrate LiveKitCostTracker** - Hook into agent shutdown
4. **Build admin pricing config UI** - Manage provider rates
5. **Add cost breakdown to call detail page** - Customer-facing display
6. **Create cost analytics dashboard** - Real vs customer cost comparison
7. **Implement budget limits** - Optional: stop calls exceeding budget

Ready to proceed with implementation?
