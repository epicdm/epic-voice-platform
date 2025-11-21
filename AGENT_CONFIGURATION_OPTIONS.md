# 🤖 AI Agent Configuration Options

## ✅ **Edit Functionality Now Available!**

You can now **edit agents after creation** from the GUI. Click the **⋮** menu on any agent card → **Edit Agent** to access the comprehensive configuration panel.

---

## 📝 **Available Configuration Options**

### **Basic Settings** (Tab 1)

#### **Agent Identity**
- **Agent Name** * (Required)
  - Display name for the agent
  - Example: "Customer Support Agent", "Sales Bot"

- **System Instructions** * (Required)
  - Core behavior and personality
  - What the agent should do
  - How it should respond
  - Example: "You are a helpful customer support agent..."

- **Description** (Optional)
  - Short description of the agent's purpose

#### **Agent Mode**
- **Standard Pipeline**
  - Full control over STT (Speech-to-Text), LLM, and TTS (Text-to-Speech)
  - Choose each component independently
  - More configuration options
  - Best for customization

- **Realtime API**
  - Ultra-low latency using OpenAI Realtime API
  - Integrated STT + LLM + TTS in one
  - Fastest response times
  - Limited to OpenAI models

#### **Phone Numbers**
- Assign multiple phone numbers to an agent
- Add/remove phone numbers
- Each number routes to this agent

---

### **LLM Settings** (Tab 2)

#### **LLM Provider**
- **OpenAI** (Recommended)
  - gpt-4o
  - gpt-4o-mini ⭐ (Recommended for cost/performance)
  - gpt-4-turbo
  - gpt-4.1-mini

- **Anthropic**
  - claude-3-5-sonnet ⭐ (Recommended)
  - claude-3-opus

- **Google**
  - gemini-1.5-pro ⭐ (Recommended)

#### **Model Selection**
- Choose specific model version
- Each provider has multiple models
- Recommendations marked with ⭐

#### **Temperature** (0.0 - 1.0)
- **0.0-0.3**: Focused, deterministic, consistent
- **0.4-0.6**: Balanced, reliable responses
- **0.7-1.0**: Creative, varied, conversational
- **Default**: 0.7

#### **Language**
- Primary language for the agent
- Default: `en-US`
- Supports multiple language codes

---

### **Voice Settings** (Tab 3)

#### **For Standard Pipeline Mode:**

##### **Speech-to-Text (STT)**

**Provider Options:**
- **Deepgram** ⭐ (Recommended)
  - nova-2
  - nova-3
  - enhanced

- **AssemblyAI**
  - universal-streaming

- **OpenAI Whisper**
  - whisper-1

**STT Language:**
- Language code for speech recognition
- Example: `en`, `es`, `fr`, `de`

##### **Text-to-Speech (TTS)**

**Provider Options:**
- **OpenAI** ⭐ (Recommended)
  - Multiple voice options (see below)
  - High quality
  - Good pricing

- **Cartesia**
  - Custom voice IDs
  - Ultra-low latency

- **ElevenLabs**
  - High quality voices
  - Custom voice IDs
  - Premium pricing

**OpenAI Voice Options:**
- **alloy**: Neutral, balanced
- **echo**: Warm, friendly
- **fable**: Expressive
- **onyx**: Deep, authoritative
- **nova**: Energetic
- **shimmer**: Soft, gentle
- **ash**: Clear, professional ⭐
- **ballad**: Smooth, storytelling
- **coral**: Bright, cheerful

**Custom Voice IDs** (Cartesia/ElevenLabs):
- Enter voice ID from provider
- Example: `79a125e8-cd45-4c13-8a67-188112f4dd22`

#### **For Realtime API Mode:**

**Realtime Voice Options:**
- **alloy**: Neutral
- **echo**: Warm
- **shimmer**: Soft
- **coral**: Bright

---

### **Advanced Settings** (Tab 4)

#### **Voice Activity Detection (VAD)**
- **Enabled/Disabled** Toggle
- Detects when user starts/stops speaking
- Prevents interruptions
- More natural conversations

**Provider Options:**
- **Silero VAD** ⭐ (Recommended)
  - ML-based detection
  - High accuracy

- **WebRTC VAD**
  - Browser-based
  - Lower latency

#### **Turn Detection Model**
- Determines when it's the agent's turn to speak

**Options:**
- **Multilingual** ⭐ (Recommended)
  - Best for multiple languages
  - Context-aware

- **Semantic**
  - Context-aware turn detection
  - Understands conversation flow

- **VAD**
  - Simple voice activity based
  - Fast but less accurate

#### **Noise Cancellation**
- **Enabled/Disabled** Toggle
- Removes background noise
- Improves audio quality

**Types:**
- **BVC Standard**
  - Standard noise cancellation
  
- **BVC Telephony** ⭐ (Recommended for phone calls)
  - Optimized for telephone audio
  - Better for SIP calls

---

### **Session Options** (Tab 5)

#### **Preemptive Generation**
- **Enabled/Disabled**
- Start generating response before user finishes
- Lower latency but may interrupt
- Use for fast-paced conversations

#### **False Interruption Recovery**
- **Enabled/Disabled**
- Resume if user pauses mid-sentence
- Prevents cutting off user
- More natural flow

#### **False Interruption Timeout**
- Time in seconds to wait before resuming
- Range: 0.1 - 5.0 seconds
- Default: 1.0 seconds
- Higher = more forgiving of pauses

#### **Minimum Interruption Duration**
- Minimum speech duration to count as interruption
- Range: 0.1 - 2.0 seconds
- Default: 0.2 seconds
- Lower = more sensitive to interruptions

#### **Greeting Message**
- **Enabled/Disabled**
- Agent speaks first when call connects
- Custom greeting text

**Options:**
- Enable/disable greeting
- Custom greeting message
- Example: "Hello! How can I help you today?"

---

## 🎯 **Recommended Configurations**

### **Customer Support Agent**
```yaml
Agent Mode: Standard Pipeline
LLM: gpt-4o-mini (OpenAI)
Temperature: 0.5
STT: nova-2 (Deepgram)
TTS: ash (OpenAI)
VAD: Enabled (Silero)
Turn Detection: Multilingual
Noise Cancellation: BVC Telephony
Greeting: Enabled
```

### **Sales Agent**
```yaml
Agent Mode: Standard Pipeline
LLM: gpt-4o-mini (OpenAI)
Temperature: 0.7
STT: nova-2 (Deepgram)
TTS: ballad (OpenAI)
VAD: Enabled (Silero)
Turn Detection: Semantic
Noise Cancellation: BVC Telephony
Preemptive Generation: Enabled
Greeting: Enabled
```

### **Ultra-Low Latency Agent**
```yaml
Agent Mode: Realtime API
Realtime Voice: alloy
Temperature: 0.7
VAD: Enabled (Silero)
Turn Detection: VAD
Noise Cancellation: BVC Standard
Preemptive Generation: Enabled
False Interruption Recovery: Enabled
Greeting: Enabled
```

---

## 🚀 **How to Edit an Agent**

1. **Navigate to Agents Page**
   - Go to http://localhost:3001/agents

2. **Find Your Agent**
   - Locate the agent card you want to edit

3. **Open Edit Menu**
   - Click the **⋮** (three dots) button on the agent card
   - Click **"Edit Agent"**

4. **Configure Settings**
   - **Basic Tab**: Name, instructions, mode, phone numbers
   - **LLM Tab**: Provider, model, temperature
   - **Voice Tab**: STT/TTS providers and voices
   - **Advanced Tab**: VAD, turn detection, noise cancellation
   - **Session Tab**: Interruption handling, greeting

5. **Save Changes**
   - Click **"Save Changes"** button
   - Agent will be updated immediately
   - Changes take effect on next call

---

## ⚙️ **Configuration Tips**

### **For Better Conversations:**
- ✅ Enable VAD for natural turn-taking
- ✅ Use Multilingual turn detection
- ✅ Set temperature 0.6-0.8 for friendly tone
- ✅ Enable greeting for proactive engagement

### **For Lower Latency:**
- ✅ Use Realtime API mode
- ✅ Enable preemptive generation
- ✅ Use VAD turn detection
- ✅ Disable false interruption recovery

### **For Phone Calls:**
- ✅ Use BVC Telephony noise cancellation
- ✅ Enable VAD
- ✅ Use clear voices (ash, alloy, ballad)
- ✅ Set temperature 0.5-0.7 for consistency

### **For Cost Optimization:**
- ✅ Use gpt-4o-mini model
- ✅ Use Deepgram for STT
- ✅ Use OpenAI for TTS
- ✅ Set temperature 0.5-0.6 (less tokens)

---

## 📊 **Field Reference**

### **Database Fields Available:**
```
Core:
  - name (string)
  - instructions (text)
  - description (text)
  - agent_mode (standard|realtime)
  - language (string)
  - temperature (float 0.0-1.0)

LLM:
  - llm_provider (openai|anthropic|google)
  - llm_model (string)

STT:
  - stt_provider (deepgram|assemblyai|openai)
  - stt_model (string)
  - stt_language (string)

TTS:
  - tts_provider (openai|cartesia|elevenlabs)
  - tts_model (string)
  - tts_voice_id (string)
  - voice (string)

Realtime API:
  - realtime_voice (alloy|echo|shimmer|coral)

VAD:
  - vad_enabled (boolean)
  - vad_provider (silero|webrtc)

Turn Detection:
  - turn_detection_model (multilingual|semantic|vad)

Noise Cancellation:
  - noise_cancellation_enabled (boolean)
  - noise_cancellation_type (BVC|BVCTelephony)

Session Options:
  - preemptive_generation (boolean)
  - resume_false_interruption (boolean)
  - false_interruption_timeout (float)
  - min_interruption_duration (float)

Greeting:
  - greeting_enabled (boolean)
  - greeting_message (text)

System:
  - is_active (boolean)
  - status (created|deployed|deploying|undeploying|inactive)
  - file_path (string)
  - agent_id (string)
  - created_at (datetime)
  - updated_at (datetime)
```

---

## 🔄 **API Endpoint**

**Update Agent:**
```http
PUT /api/user/agents/{agent_id}
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "instructions": "Updated instructions...",
  "llm_provider": "openai",
  "llm_model": "gpt-4o-mini",
  "temperature": 0.7,
  "stt_provider": "deepgram",
  "stt_model": "nova-2",
  "tts_provider": "openai",
  "voice": "ash",
  "vad_enabled": true,
  "greeting_enabled": true,
  "greeting_message": "Hello! How can I help you?",
  ... (all other fields optional)
}
```

**Response:**
```json
{
  "success": true
}
```

---

## ✅ **Feature Summary**

**What You Can Now Do:**
- ✅ Edit any agent configuration after creation
- ✅ Change LLM provider and model
- ✅ Switch between Standard and Realtime modes
- ✅ Customize voice and speech settings
- ✅ Fine-tune advanced session options
- ✅ Add/remove phone numbers
- ✅ Update instructions and personality
- ✅ Enable/disable features on the fly
- ✅ All changes saved to database
- ✅ No need to recreate agents!

**Edit Modal Features:**
- 📱 **5 organized tabs** for easy navigation
- 🎨 **Visual selectors** for voices and modes
- 🔄 **Real-time preview** of selections
- 💾 **Instant save** with validation
- 🎯 **Recommended options** marked
- 📝 **Helpful descriptions** for each option

---

**Last Updated**: October 21, 2025  
**Status**: ✅ Fully Functional  
**Version**: 1.0

🎉 **You can now edit all agent configurations!** 🎉
