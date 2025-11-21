# Agent Configuration Mapping

This document maps LiveKit agent configuration from code samples to database fields and GUI.

## Config Sample Analysis

### Sample 1: Standard Pipeline Agent
```python
AgentSession(
    stt="assemblyai/universal-streaming:en",
    llm="openai/gpt-4.1-mini",
    tts="cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    vad=silero.VAD.load(),
    turn_detection=MultilingualModel(),
)

RoomInputOptions(
    noise_cancellation=noise_cancellation.BVC()
)
```

### Sample 2: Realtime API Agent
```python
AgentSession(
    llm=openai.realtime.RealtimeModel(voice="coral")
)

RoomInputOptions(
    noise_cancellation=noise_cancellation.BVC()
)
```

## Current Database Schema

```python
class AgentConfig(Base):
    id = String(36)
    user_id = String(36)
    name = String(255)              # ✅ Exists
    instructions = Text              # ✅ Exists
    llm_model = String(100)         # ✅ Exists
    voice = String(50)              # ✅ Exists (for TTS)
    temperature = Float             # ✅ Exists
    language = String(10)           # ✅ Exists
    created_at = DateTime
    updated_at = DateTime
    is_active = Boolean
```

## New Fields Required

### 1. Agent Mode Selection
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agent_mode` | String(50) | "standard" | "standard" or "realtime" |

**Purpose:** Determines if using standard STT→LLM→TTS pipeline or OpenAI Realtime API

**GUI:** Radio buttons or dropdown

### 2. Speech-to-Text (STT) Configuration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stt_provider` | String(100) | "deepgram" | Provider name (deepgram, assemblyai, openai) |
| `stt_model` | String(100) | "nova-2" | Model identifier |
| `stt_language` | String(10) | "en" | Language code for STT |

**Examples:**
- `deepgram/nova-2` → provider: "deepgram", model: "nova-2"
- `assemblyai/universal-streaming:en` → provider: "assemblyai", model: "universal-streaming", lang: "en"

**GUI:** Dropdown for provider, text input for model

### 3. Text-to-Speech (TTS) Configuration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tts_provider` | String(100) | "openai" | Provider name (openai, cartesia, elevenlabs) |
| `tts_model` | String(100) | null | Model identifier (optional) |
| `tts_voice_id` | String(100) | null | Voice ID for advanced TTS |

**Examples:**
- `openai/ash` → provider: "openai", voice: "ash"
- `cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc` → provider: "cartesia", model: "sonic-2", voice_id: "9626c31c..."

**Note:** Current `voice` field can be repurposed or we add `tts_voice_id` for full IDs

**GUI:** Dropdown for provider, dropdown for common voices, text input for custom voice ID

### 4. LLM Configuration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `llm_provider` | String(100) | "openai" | Provider name |
| `llm_model` | String(100) | "gpt-4o-mini" | Already exists - keep it |

**Examples:**
- `openai/gpt-4.1-mini` → provider: "openai", model: "gpt-4.1-mini"
- `anthropic/claude-3-sonnet` → provider: "anthropic", model: "claude-3-sonnet"

**GUI:** Dropdown for provider, dropdown for model

### 5. Voice Activity Detection (VAD)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `vad_enabled` | Boolean | True | Enable voice activity detection |
| `vad_provider` | String(50) | "silero" | VAD provider (silero, webrtc) |

**GUI:** Toggle switch for enabled, dropdown for provider

### 6. Turn Detection
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `turn_detection_model` | String(50) | "multilingual" | Model type (multilingual, semantic, vad) |

**Examples:**
- `MultilingualModel()` → "multilingual"
- `SemanticModel()` → "semantic"
- `VADModel()` → "vad"

**GUI:** Dropdown

### 7. Noise Cancellation
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `noise_cancellation_enabled` | Boolean | True | Enable noise cancellation |
| `noise_cancellation_type` | String(50) | "BVC" | Type (BVC, BVCTelephony) |

**GUI:** Toggle for enabled, dropdown for type

### 8. Advanced Session Options
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `preemptive_generation` | Boolean | False | Generate response before user finishes |
| `resume_false_interruption` | Boolean | False | Resume speech if interrupted by noise |
| `false_interruption_timeout` | Float | 1.0 | Timeout in seconds |
| `min_interruption_duration` | Float | 0.2 | Minimum duration for valid interruption |

**GUI:** Toggle switches and number inputs in "Advanced" section

### 9. Greeting/Initial Behavior
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `greeting_enabled` | Boolean | True | Auto-greet on call start |
| `greeting_message` | Text | null | Custom greeting instructions |

**Examples:**
- "Greet the user and offer your assistance."
- "Say hello in Spanish and ask how you can help."

**GUI:** Toggle + textarea

### 10. Realtime API Specific
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `realtime_voice` | String(50) | "alloy" | Voice for OpenAI Realtime API |

**Options:** alloy, echo, fable, onyx, nova, shimmer, coral

**GUI:** Dropdown (only shown when agent_mode = "realtime")

## Complete Updated Schema

```python
class AgentConfig(Base):
    __tablename__ = 'agent_configs'

    # Existing fields
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Core Configuration
    agent_mode = Column(String(50), default='standard')  # 'standard' or 'realtime'
    language = Column(String(10), default='en-US')
    temperature = Column(Float, default=0.7)

    # LLM Configuration
    llm_provider = Column(String(100), default='openai')
    llm_model = Column(String(100), default='gpt-4o-mini')

    # STT Configuration (Standard mode only)
    stt_provider = Column(String(100), default='deepgram')
    stt_model = Column(String(100), default='nova-2')
    stt_language = Column(String(10), default='en')

    # TTS Configuration (Standard mode only)
    tts_provider = Column(String(100), default='openai')
    tts_model = Column(String(100))  # Optional
    tts_voice_id = Column(String(100))  # Full voice ID for providers like Cartesia
    voice = Column(String(50), default='alloy')  # Simple voice name

    # Realtime API Configuration
    realtime_voice = Column(String(50), default='alloy')

    # VAD Configuration
    vad_enabled = Column(Boolean, default=True)
    vad_provider = Column(String(50), default='silero')

    # Turn Detection
    turn_detection_model = Column(String(50), default='multilingual')

    # Noise Cancellation
    noise_cancellation_enabled = Column(Boolean, default=True)
    noise_cancellation_type = Column(String(50), default='BVC')

    # Advanced Session Options
    preemptive_generation = Column(Boolean, default=False)
    resume_false_interruption = Column(Boolean, default=False)
    false_interruption_timeout = Column(Float, default=1.0)
    min_interruption_duration = Column(Float, default=0.2)

    # Greeting Configuration
    greeting_enabled = Column(Boolean, default=True)
    greeting_message = Column(Text)

    # Relationships (unchanged)
    user = relationship('User', back_populates='agents')
    phone_mappings = relationship('PhoneMapping', back_populates='agent')
    call_logs = relationship('CallLog', back_populates='agent')
```

## GUI Layout Proposal

### Tab 1: Basic Configuration
- Agent Name
- Instructions (large textarea)
- Agent Mode (Standard / Realtime API)

### Tab 2: Voice & Language
- Language
- Temperature slider

**If Standard Mode:**
- STT Provider + Model
- TTS Provider + Voice
- Voice ID (advanced)

**If Realtime Mode:**
- Realtime Voice selector

### Tab 3: Advanced Audio
- VAD Settings (enabled, provider)
- Turn Detection Model
- Noise Cancellation (enabled, type)

### Tab 4: Session Behavior
- Preemptive Generation
- Interruption Handling
- Greeting Settings

### Tab 5: Phone Numbers
- (Existing functionality)

## Code Generation Requirements

### 1. Database Migration
- Add new columns to `agent_configs` table
- Set sensible defaults
- Preserve existing data

### 2. Backend API Updates
- Update GET /api/user/agents to return new fields
- Update POST /api/user/agents to accept new fields
- Update PUT /api/user/agents/:id to accept new fields

### 3. Frontend Updates
- Update TypeScript types
- Create tabbed agent editor
- Add dropdowns, toggles, sliders for new fields
- Add conditional rendering (Standard vs Realtime mode)

### 4. Agent Implementation
- Update multi_tenant_agent.py to read new fields
- Parse provider/model strings
- Configure AgentSession based on mode
- Handle both pipeline and realtime configurations

## Provider Options Reference

### STT Providers
- `deepgram` - Models: nova-2, nova-3, base, enhanced
- `assemblyai` - Models: universal-streaming
- `openai` - Models: whisper-1

### TTS Providers
- `openai` - Voices: alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse
- `cartesia` - Models: sonic-2 (requires voice ID)
- `elevenlabs` - Models: turbo-v2, multilingual-v2 (requires voice ID)

### LLM Providers
- `openai` - Models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4.1-mini
- `anthropic` - Models: claude-3-5-sonnet, claude-3-opus, claude-3-sonnet
- `google` - Models: gemini-pro, gemini-1.5-pro

### Turn Detection Models
- `multilingual` - Best for multiple languages
- `semantic` - Context-aware turn detection
- `vad` - Voice activity detection based

## Migration Strategy

1. **Phase 1: Database**
   - Add columns with defaults
   - Existing agents continue working

2. **Phase 2: Backend**
   - Update API to handle new fields
   - Backward compatible (old format still works)

3. **Phase 3: Frontend**
   - Add new UI components
   - Show/hide based on mode

4. **Phase 4: Agent**
   - Update multi_tenant_agent.py
   - Parse and apply new settings
   - Test both modes

## Testing Checklist

- [ ] Old agents still work after migration
- [ ] New agents can be created with advanced settings
- [ ] Standard mode configures STT→LLM→TTS pipeline
- [ ] Realtime mode uses OpenAI Realtime API
- [ ] Phone mappings work with updated agents
- [ ] Existing calls continue to function
- [ ] New advanced features apply correctly
