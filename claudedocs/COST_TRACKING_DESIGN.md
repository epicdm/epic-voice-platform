# Cost Tracking System Design

## Overview
Two-tier cost tracking: **Real Costs** (our actual expenses) and **Customer Costs** (what we charge).

---

## 💵 REAL COST COMPONENTS (Admin View)

### 1. **AI Model Costs**

#### A. Speech-to-Text (STT)
- **Provider**: Deepgram (current default)
- **Pricing Model**: Per audio minute
- **Current Rates** (as of 2024):
  - Nova-2: $0.0043/minute (base model)
  - Nova-2 Enhanced: $0.0059/minute
  - Whisper Cloud: $0.0048/minute
- **Cost Calculation**: `call_duration_minutes × stt_rate_per_minute`
- **Usage Tracking**: Actual audio processed (may differ from call duration)

#### B. Large Language Model (LLM)
- **Provider**: OpenAI (current default)
- **Pricing Model**: Per token (input + output)
- **Current Rates** (GPT-4o-mini):
  - Input tokens: $0.150 per 1M tokens
  - Output tokens: $0.600 per 1M tokens
- **Cost Calculation**: `(input_tokens × $0.00000015) + (output_tokens × $0.00000060)`
- **Usage Tracking**:
  - Count tokens from agent conversation turns
  - Include system prompt tokens
  - Include function calling tokens

#### C. Text-to-Speech (TTS)
- **Provider**: OpenAI TTS (current default)
- **Pricing Model**: Per character or per second
- **Current Rates**:
  - OpenAI TTS: $15.00 per 1M characters
  - OpenAI TTS HD: $30.00 per 1M characters
  - Cartesia: ~$0.025 per minute of audio generated
  - ElevenLabs: ~$0.18 per 1K characters (Turbo v2.5)
- **Cost Calculation**:
  - OpenAI: `character_count × $0.000015`
  - Cartesia: `audio_seconds × ($0.025/60)`
- **Usage Tracking**: Count all characters sent to TTS or measure audio duration

---

### 2. **Telephony Costs**

#### A. DID (Phone Number) Rental
- **Provider**: Magnus (based on phone_number_pool table)
- **Pricing Model**: Monthly per number
- **Estimated Rates**: $1-3 per number per month
- **Cost Allocation**:
  - Amortize monthly cost across calls using that DID
  - `(monthly_did_cost / total_minutes_on_did) × call_minutes`

#### B. Inbound Call Minutes
- **Provider**: LiveKit SIP + Magnus
- **Pricing Model**: Per-minute cost for incoming calls
- **Estimated Rates**: $0.004-0.012 per minute (varies by region)
- **Cost Calculation**: `inbound_duration_minutes × inbound_rate`

#### C. Outbound Call Minutes
- **Provider**: LiveKit SIP + Magnus
- **Pricing Model**: Per-minute cost for outgoing calls
- **Estimated Rates**: $0.012-0.024 per minute (typically 2-3x inbound)
- **Cost Calculation**: `outbound_duration_minutes × outbound_rate`

#### D. SMS/MMS (if applicable)
- **Pricing Model**: Per message
- **Estimated Rates**:
  - SMS: $0.0075 per message
  - MMS: $0.02 per message

---

### 3. **LiveKit Infrastructure Costs**

#### A. Media Server Compute
- **Pricing Model**: Per participant-minute or flat rate
- **LiveKit Cloud Rates** (estimated):
  - ~$0.004 per participant-minute
  - Includes WebRTC media relay
- **Cost Calculation**: `call_duration_minutes × participant_count × $0.004`

#### B. Recording Storage (if enabled)
- **Pricing Model**: Per GB stored + egress
- **Estimated Rates**:
  - Storage: $0.023 per GB-month
  - Egress: $0.09 per GB transferred
- **Cost Calculation**: Based on recording file size

#### C. SIP Trunk Usage
- **Included in telephony costs** or separate SIP trunk fees
- **Estimated**: $0.001-0.003 per minute additional

---

### 4. **Platform Infrastructure Costs**

#### A. Backend Compute (Self-hosted)
- **Server Costs**: Current VPS/dedicated server
- **Allocation Method**: Amortize across calls
  - `(monthly_server_cost / total_monthly_call_minutes) × call_minutes`
- **Example**: $200/month server, 10,000 minutes → $0.02 per minute

#### B. Database Costs
- **PostgreSQL Storage/Compute**
- **Minimal per-call cost**: Usually absorbed into platform overhead
- **Estimated**: <$0.0001 per call

#### C. Bandwidth/CDN
- **Frontend delivery, API requests**
- **Minimal per-call cost**: Usually absorbed
- **Estimated**: <$0.0001 per call

---

### 5. **Tool/Integration Costs**

#### A. External API Calls
- **Cost depends on tools used by agent**:
  - CRM API calls: $0-0.01 per call
  - Payment processing: 2.9% + $0.30 per transaction
  - Knowledge base queries: Varies by provider
  - Calendar integrations: Usually free or minimal
- **Tracking**: Log each tool invocation with associated cost

#### B. Third-party Services
- **Email sending (SendGrid/Mailgun)**: $0.0001-0.001 per email
- **Analytics (if not self-hosted)**: Absorbed in platform cost

---

## 💰 COST CALCULATION FORMULAS

### Real Cost Per Call
```
total_real_cost =
  stt_cost +           // Deepgram minutes
  llm_cost +           // OpenAI tokens
  tts_cost +           // TTS characters/seconds
  telephony_cost +     // Inbound/outbound minutes
  livekit_cost +       // Media server + SIP
  did_allocation +     // Amortized DID rental
  platform_overhead +  // Server costs amortized
  tool_costs           // External API calls
```

### Example Calculation (1-minute call)
```
STT (Deepgram Nova-2):     1.0 min × $0.0043        = $0.0043
LLM (GPT-4o-mini):         2000 tokens × $0.00000038 = $0.0008
TTS (OpenAI):              500 chars × $0.000015     = $0.0075
Inbound Telephony:         1.0 min × $0.008          = $0.0080
LiveKit Media:             1.0 min × $0.004          = $0.0040
DID Allocation:            1.0 min × $0.001          = $0.0010
Platform Overhead:         1.0 min × $0.02           = $0.0200
Tool Costs:                0 calls                   = $0.0000
                                           TOTAL    = $0.0456
```

**Real cost per minute: ~$0.045-0.05** (4.5-5 cents)

---

## 💵 CUSTOMER COST STRUCTURE

### Pricing Strategy Options

#### Option 1: Simple Per-Minute Markup
- **Base Rate**: Real cost × markup (e.g., 3-5x)
- **Customer Rate**: $0.15-0.25 per minute
- **Example**: $0.05 real cost × 4x markup = $0.20 customer rate

#### Option 2: Tiered Pricing by Features
```
Basic Agent:       $0.15/min  (Standard LLM, basic voice)
Advanced Agent:    $0.25/min  (GPT-4, premium voice)
Premium Agent:     $0.40/min  (GPT-4 + tools + outbound)
```

#### Option 3: Usage-Based Components
```
Base Call:           $0.10/min
+ Outbound Calling:  +$0.05/min
+ Premium Voice:     +$0.03/min
+ Advanced Tools:    +$0.02/min per tool call
+ SMS Features:      +$0.01 per SMS
```

#### Option 4: Subscription + Usage
```
Monthly Subscription:
  - Starter: $50/month  (includes 500 minutes, $0.10/min overage)
  - Pro:     $200/month (includes 2500 minutes, $0.08/min overage)
  - Enterprise: Custom pricing

Additional Charges:
  - DID Rental: $2/month per number
  - SMS: $0.02 per message
  - Premium voices: +20% on usage
```

---

## 📊 DATABASE SCHEMA DESIGN

### New Table: `call_cost_breakdown`
```sql
CREATE TABLE call_cost_breakdown (
  id UUID PRIMARY KEY,
  call_log_id UUID NOT NULL REFERENCES call_logs(id),
  user_id TEXT NOT NULL,

  -- Real costs (what we pay)
  stt_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  stt_provider TEXT NOT NULL,
  stt_minutes DECIMAL(10, 4) NOT NULL,

  llm_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  llm_provider TEXT NOT NULL,
  llm_input_tokens INTEGER NOT NULL DEFAULT 0,
  llm_output_tokens INTEGER NOT NULL DEFAULT 0,

  tts_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  tts_provider TEXT NOT NULL,
  tts_characters INTEGER NOT NULL DEFAULT 0,

  telephony_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  telephony_direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  telephony_minutes DECIMAL(10, 4) NOT NULL,

  livekit_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  did_allocation_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  platform_overhead_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,

  tool_costs DECIMAL(10, 6) NOT NULL DEFAULT 0,
  tool_usage_detail JSONB, -- Array of {tool_name, count, cost}

  total_real_cost DECIMAL(10, 6) NOT NULL,

  -- Customer costs (what we charge)
  customer_rate_per_minute DECIMAL(10, 6),
  customer_base_cost DECIMAL(10, 6),
  customer_feature_costs DECIMAL(10, 6),
  total_customer_cost DECIMAL(10, 6),

  -- Metadata
  profit_margin DECIMAL(10, 6), -- total_customer_cost - total_real_cost
  markup_multiplier DECIMAL(10, 4), -- total_customer_cost / total_real_cost

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_call_cost_user (user_id),
  INDEX idx_call_cost_call_log (call_log_id)
);
```

### New Table: `pricing_config`
```sql
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY,
  user_id TEXT, -- NULL for system defaults

  -- AI Provider Rates (our costs)
  deepgram_nova2_per_min DECIMAL(10, 6) DEFAULT 0.0043,
  openai_gpt4o_mini_input_per_1m DECIMAL(10, 6) DEFAULT 0.15,
  openai_gpt4o_mini_output_per_1m DECIMAL(10, 6) DEFAULT 0.60,
  openai_tts_per_1m_chars DECIMAL(10, 6) DEFAULT 15.00,
  cartesia_per_min DECIMAL(10, 6) DEFAULT 0.025,

  -- Telephony Rates (our costs)
  inbound_per_minute DECIMAL(10, 6) DEFAULT 0.008,
  outbound_per_minute DECIMAL(10, 6) DEFAULT 0.015,
  did_monthly_cost DECIMAL(10, 6) DEFAULT 2.00,
  sms_per_message DECIMAL(10, 6) DEFAULT 0.0075,

  -- LiveKit Rates (our costs)
  livekit_per_participant_min DECIMAL(10, 6) DEFAULT 0.004,

  -- Platform Overhead (our costs)
  platform_overhead_per_min DECIMAL(10, 6) DEFAULT 0.02,

  -- Customer Pricing
  customer_basic_per_min DECIMAL(10, 6) DEFAULT 0.15,
  customer_advanced_per_min DECIMAL(10, 6) DEFAULT 0.25,
  customer_premium_per_min DECIMAL(10, 6) DEFAULT 0.40,
  customer_did_monthly DECIMAL(10, 6) DEFAULT 3.00,
  customer_sms_per_message DECIMAL(10, 6) DEFAULT 0.02,

  -- Markup Strategy
  default_markup_multiplier DECIMAL(10, 4) DEFAULT 4.0,

  effective_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Update: `call_logs` table
```sql
ALTER TABLE call_logs
  ADD COLUMN cost_breakdown_id UUID REFERENCES call_cost_breakdown(id),
  ADD COLUMN total_real_cost DECIMAL(10, 6),
  ADD COLUMN total_customer_cost DECIMAL(10, 6);

-- Rename existing 'cost' to be clearer
ALTER TABLE call_logs RENAME COLUMN cost TO deprecated_cost;
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Cost Tracking Infrastructure
1. Create `call_cost_breakdown` table
2. Create `pricing_config` table with default rates
3. Add admin UI for configuring rates

### Phase 2: Real-time Cost Calculation
1. Hook into LiveKit webhook handler
2. Calculate STT cost from duration
3. Track LLM token usage during conversation
4. Track TTS character count
5. Calculate telephony costs from call direction
6. Store breakdown in database

### Phase 3: Customer Billing Integration
1. Apply customer pricing rules
2. Calculate customer cost on call end
3. Update customer balance/invoice
4. Generate itemized receipts

### Phase 4: Admin Reporting
1. Real vs Customer cost comparison dashboard
2. Profit margin analytics
3. Cost trending over time
4. Per-agent cost analysis
5. Identify high-cost calls/patterns

---

## 🎯 WHAT TO TRACK PER CALL

### Required Metrics:
- [x] Call duration (already tracked)
- [ ] STT audio minutes processed
- [ ] LLM input/output token counts
- [ ] TTS character count or audio seconds
- [ ] Call direction (inbound/outbound)
- [ ] DID used
- [ ] Agent configuration (determines rates)
- [ ] Tool invocations with costs
- [ ] Recording size (if enabled)

### Collection Points:
1. **LiveKit Agent** - Track tokens, TTS chars during call
2. **Webhook Handler** - Calculate costs on call end
3. **Database** - Store breakdown for analysis

---

## ❓ QUESTIONS TO ANSWER

1. **Do you want to track costs in real-time during calls?**
   - Or calculate at call end?
   - Real-time allows budget limits ("max $1 per call")

2. **How to handle platform overhead allocation?**
   - Fixed per-minute rate?
   - Percentage of call cost?
   - Absorb into margin?

3. **Customer pricing model preference?**
   - Simple per-minute with markup?
   - Tiered by features?
   - Subscription + overage?

4. **Do agents currently log token usage?**
   - Need to instrument agents to track this
   - OpenAI provides token counts in responses

5. **Recording storage costs?**
   - Track if recordings are enabled
   - Factor into cost?

6. **How to display costs to customers?**
   - Itemized breakdown?
   - Simple total?
   - Real-time balance deduction?

---

## 📝 NEXT STEPS

1. Review this design and answer questions above
2. Confirm pricing rates (get actual rates from your providers)
3. Implement Phase 1 (database schema)
4. Instrument agents to track token/character usage
5. Build cost calculation service
6. Create admin panel for viewing real vs customer costs
