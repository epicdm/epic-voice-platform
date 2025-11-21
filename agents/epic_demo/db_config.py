"""
Database-aware Configuration Loader
Reads agent configuration from database instead of static files
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# LiveKit Connection (from .env)
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////opt/livekit1/voice_agents.db")

def load_agent_config():
    """Load agent configuration from database"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Import models from parent directory
    sys.path.insert(0, '/opt/livekit1')
    from database import AgentConfig
    
    # Create database session
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Find this agent by directory name
        current_dir = os.path.basename(os.path.dirname(os.path.abspath(__file__)))
        
        # Try to find by file_path
        agent = session.query(AgentConfig).filter(
            AgentConfig.file_path.like(f'%{current_dir}%')
        ).first()
        
        # Fallback: find by name (for sales_agent)
        if not agent:
            agent_name_map = {
                'sales_agent': 'Sales Agent',
                'support_agent': 'Support Agent',
                'custom_agent': 'Custom Agent',
            }
            name = agent_name_map.get(current_dir, 'Sales Agent')
            agent = session.query(AgentConfig).filter(
                AgentConfig.name == name
            ).first()
        
        if not agent:
            print(f"⚠️  Warning: Agent not found in database, using defaults")
            return get_default_config()
        
        print(f"✅ Loaded config for: {agent.name} from database")
        
        # Build config from database
        config = {
            # Agent Identity
            'AGENT_NAME': agent.name or 'Sales Agent',
            'AGENT_DESCRIPTION': agent.description or '',
            'AGENT_ID': agent.id,
            
            # Core Config
            'AGENT_MODE': agent.agent_mode or 'standard',
            'LANGUAGE': agent.language or 'en-US',
            'TEMPERATURE': agent.temperature if agent.temperature is not None else 0.7,
            'INSTRUCTIONS': agent.instructions or 'You are a helpful AI assistant.',
            
            # LLM
            'LLM_PROVIDER': agent.llm_provider or 'openai',
            'LLM_MODEL': agent.llm_model or 'gpt-4o-mini',
            
            # STT
            'STT_PROVIDER': agent.stt_provider or 'deepgram',
            'STT_MODEL': agent.stt_model or 'nova-2',
            'STT_LANGUAGE': agent.stt_language or 'en',
            
            # TTS
            'TTS_PROVIDER': agent.tts_provider or 'openai',
            'TTS_MODEL': agent.tts_model,
            'TTS_VOICE_ID': agent.tts_voice_id,
            'TTS_VOICE': agent.voice or 'alloy',
            
            # Realtime API
            'REALTIME_VOICE': agent.realtime_voice or 'alloy',
            
            # VAD
            'VAD_ENABLED': bool(agent.vad_enabled) if agent.vad_enabled is not None else True,
            'VAD_PROVIDER': agent.vad_provider or 'silero',
            
            # Turn Detection
            'TURN_DETECTION_MODEL': agent.turn_detection_model or 'multilingual',
            
            # Noise Cancellation
            'NOISE_CANCELLATION_ENABLED': bool(agent.noise_cancellation_enabled) if agent.noise_cancellation_enabled is not None else True,
            'NOISE_CANCELLATION_TYPE': agent.noise_cancellation_type or 'BVC',
            
            # Session Options
            'PREEMPTIVE_GENERATION': bool(agent.preemptive_generation),
            'RESUME_FALSE_INTERRUPTION': bool(agent.resume_false_interruption),
            'FALSE_INTERRUPTION_TIMEOUT': agent.false_interruption_timeout if agent.false_interruption_timeout is not None else 1.0,
            'MIN_INTERRUPTION_DURATION': agent.min_interruption_duration if agent.min_interruption_duration is not None else 0.2,
            
            # Greeting
            'GREETING_ENABLED': bool(agent.greeting_enabled) if agent.greeting_enabled is not None else True,
            'GREETING_MESSAGE': agent.greeting_message or '',
            
            # Features
            'TRANSCRIPTION_ENABLED': True,
        }
        
        return config
        
    except Exception as e:
        print(f"❌ Error loading config from database: {e}")
        import traceback
        traceback.print_exc()
        return get_default_config()
    finally:
        session.close()


def get_default_config():
    """Fallback default configuration"""
    return {
        'AGENT_NAME': 'Sales Agent',
        'AGENT_DESCRIPTION': '',
        'AGENT_MODE': 'standard',
        'LANGUAGE': 'en-US',
        'TEMPERATURE': 0.7,
        'INSTRUCTIONS': 'You are a professional sales representative.',
        'LLM_PROVIDER': 'openai',
        'LLM_MODEL': 'gpt-4o-mini',
        'STT_PROVIDER': 'deepgram',
        'STT_MODEL': 'nova-2',
        'STT_LANGUAGE': 'en',
        'TTS_PROVIDER': 'openai',
        'TTS_MODEL': None,
        'TTS_VOICE_ID': None,
        'TTS_VOICE': 'ash',
        'REALTIME_VOICE': 'alloy',
        'VAD_ENABLED': True,
        'VAD_PROVIDER': 'silero',
        'TURN_DETECTION_MODEL': 'multilingual',
        'NOISE_CANCELLATION_ENABLED': True,
        'NOISE_CANCELLATION_TYPE': 'BVC',
        'PREEMPTIVE_GENERATION': False,
        'RESUME_FALSE_INTERRUPTION': False,
        'FALSE_INTERRUPTION_TIMEOUT': 1.0,
        'MIN_INTERRUPTION_DURATION': 0.2,
        'GREETING_ENABLED': True,
        'GREETING_MESSAGE': '',
        'TRANSCRIPTION_ENABLED': True,
    }


# Load config at module import
_config = load_agent_config()

# Export all config values
AGENT_NAME = _config['AGENT_NAME']
AGENT_DESCRIPTION = _config['AGENT_DESCRIPTION']
AGENT_MODE = _config['AGENT_MODE']
LANGUAGE = _config['LANGUAGE']
TEMPERATURE = _config['TEMPERATURE']
INSTRUCTIONS = _config['INSTRUCTIONS']

LLM_PROVIDER = _config['LLM_PROVIDER']
LLM_MODEL = _config['LLM_MODEL']

STT_PROVIDER = _config['STT_PROVIDER']
STT_MODEL = _config['STT_MODEL']
STT_LANGUAGE = _config['STT_LANGUAGE']

TTS_PROVIDER = _config['TTS_PROVIDER']
TTS_MODEL = _config['TTS_MODEL']
TTS_VOICE_ID = _config['TTS_VOICE_ID']
TTS_VOICE = _config['TTS_VOICE']

REALTIME_VOICE = _config['REALTIME_VOICE']

VAD_ENABLED = _config['VAD_ENABLED']
VAD_PROVIDER = _config['VAD_PROVIDER']

TURN_DETECTION_MODEL = _config['TURN_DETECTION_MODEL']

NOISE_CANCELLATION_ENABLED = _config['NOISE_CANCELLATION_ENABLED']
NOISE_CANCELLATION_TYPE = _config['NOISE_CANCELLATION_TYPE']

PREEMPTIVE_GENERATION = _config['PREEMPTIVE_GENERATION']
RESUME_FALSE_INTERRUPTION = _config['RESUME_FALSE_INTERRUPTION']
FALSE_INTERRUPTION_TIMEOUT = _config['FALSE_INTERRUPTION_TIMEOUT']
MIN_INTERRUPTION_DURATION = _config['MIN_INTERRUPTION_DURATION']

GREETING_ENABLED = _config['GREETING_ENABLED']
GREETING_MESSAGE = _config['GREETING_MESSAGE']

TRANSCRIPTION_ENABLED = _config['TRANSCRIPTION_ENABLED']
