"""
Multi-Tenant LiveKit Voice Agent
Loads user-specific configurations from database dynamically per call.
"""

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, RunContext
from livekit.agents.llm import function_tool
from livekit.plugins import openai, deepgram, silero
from datetime import datetime
import os
import uuid
from database import SessionLocal, AgentConfig, PhoneMapping, CallLog, User

# Load environment variables
load_dotenv(".env")

class DynamicAssistant(Agent):
    """Voice assistant with dynamic user-specific configuration."""

    def __init__(self, instructions: str, user_id: str = None):
        super().__init__(instructions=instructions)
        self.user_id = user_id

    @function_tool
    async def get_current_date_and_time(self, context: RunContext) -> str:
        """Get the current date and time.
        
        Returns:
            The current date and time as a string.
        """
        now = datetime.now()
        return now.strftime("%A, %B %d, %Y at %I:%M %p")

def get_user_config_from_phone(phone_number: str):
    """Load user configuration based on incoming phone number."""
    db = SessionLocal()
    
    try:
        # Query for phone mapping and related agent config
        mapping = db.query(PhoneMapping).filter(
            PhoneMapping.phone_number == phone_number,
            PhoneMapping.is_active == True
        ).first()
        
        if mapping and mapping.agent:
            agent = mapping.agent
            return {
                'user_id': agent.user_id,
                'agent_id': agent.id,
                'instructions': agent.instructions,
                'llm_model': agent.llm_model,
                'voice': agent.voice,
                'temperature': agent.temperature,
                'language': agent.language,
                'user_name': agent.user.name if agent.user else 'Unknown'
            }
    except Exception as e:
        print(f"Error loading user config: {e}")
    finally:
        db.close()
    
    # Return default configuration if no mapping found
    print(f"⚠️ No configuration found for phone {phone_number}, using default")
    return {
        'user_id': None,
        'agent_id': None,
        'instructions': """You are a helpful and friendly voice assistant.
        Answer questions politely and provide clear, concise responses.
        Keep your responses brief and conversational.""",
        'llm_model': os.getenv('LLM_CHOICE', 'gpt-4o-mini'),
        'voice': os.getenv('AGENT_VOICE', 'alloy'),
        'temperature': float(os.getenv('AGENT_TEMPERATURE', '0.7')),
        'language': os.getenv('DEFAULT_LANGUAGE', 'en-US'),
        'user_name': 'Default'
    }

def log_call_start(user_id: str, agent_id: str, phone_number: str, room_name: str) -> str:
    """Log call start for billing and analytics."""
    db = SessionLocal()
    call_id = str(uuid.uuid4())
    
    try:
        call_log = CallLog(
            id=call_id,
            user_id=user_id,
            agent_config_id=agent_id,
            phone_number=phone_number,
            livekitRoomName=room_name,
            started_at=datetime.utcnow()
        )
        db.add(call_log)
        db.commit()
        print(f"📞 Call logged: {call_id} for user {user_id}")
    except Exception as e:
        print(f"Error logging call: {e}")
        db.rollback()
    finally:
        db.close()
    
    return call_id

def log_call_end(call_id: str, duration_seconds: int):
    """Update call log with end time and duration."""
    db = SessionLocal()
    
    try:
        call_log = db.query(CallLog).filter(CallLog.id == call_id).first()
        if call_log:
            call_log.ended_at = datetime.utcnow()
            call_log.duration_seconds = duration_seconds
            
            # Calculate cost (example: $0.02 per minute)
            minutes = duration_seconds / 60
            call_log.cost = round(minutes * 0.02, 4)
            
            db.commit()
            print(f"📊 Call ended: {call_id}, duration: {duration_seconds}s, cost: ${call_log.cost}")
    except Exception as e:
        print(f"Error updating call log: {e}")
        db.rollback()
    finally:
        db.close()

async def entrypoint(ctx: agents.JobContext):
    """Entry point for multi-tenant agent."""
    
    print(f"🎯 New call received in room: {ctx.room.name}")
    
    # Extract phone number from SIP participant
    phone_number = None
    caller_identity = None
    
    # Wait a moment for participants to join
    await ctx.wait_for_participant()
    
    # Try to get phone number from room participants
    for participant in ctx.room.remote_participants.values():
        # SIP participants have identity like "sip_+1234567890"
        if participant.identity.startswith('sip_'):
            caller_identity = participant.identity
            phone_number = caller_identity.replace('sip_', '').replace('_', '')
            print(f"📱 Detected caller: {phone_number}")
            break
    
    # If no phone number found, try to extract from room name
    if not phone_number:
        # Room names are like "sip-call_17678183742_random"
        parts = ctx.room.name.split('_')
        if len(parts) >= 2:
            phone_number = parts[1]
            print(f"📱 Extracted phone from room name: {phone_number}")
    
    # Load user-specific configuration
    config = get_user_config_from_phone(phone_number) if phone_number else get_user_config_from_phone('')
    
    print(f"👤 User: {config['user_name']}")
    print(f"🤖 Model: {config['llm_model']}")
    print(f"🎤 Voice: {config['voice']}")
    print(f"🌍 Language: {config['language']}")
    
    # Log call start
    call_id = None
    if config['user_id']:
        call_id = log_call_start(
            config['user_id'],
            config['agent_id'],
            phone_number,
            ctx.room.name
        )
    
    # Create session with user's configuration
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language=config['language']),
        llm=openai.LLM(
            model=config['llm_model'],
            temperature=config['temperature']
        ),
        tts=openai.TTS(voice=config['voice']),
        vad=silero.VAD.load(),
    )
    
    # Track call start time
    start_time = datetime.utcnow()
    
    # Start session with user's custom instructions
    await session.start(
        room=ctx.room,
        agent=DynamicAssistant(
            instructions=config['instructions'],
            user_id=config['user_id']
        )
    )
    
    # Generate initial greeting
    await session.generate_reply(
        instructions="Greet the caller warmly and ask how you can help them today."
    )
    
    # Wait for session to end
    await session.wait()
    
    # Log call end
    if call_id:
        duration = (datetime.utcnow() - start_time).total_seconds()
        log_call_end(call_id, int(duration))

if __name__ == "__main__":
    # Run the multi-tenant agent
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=os.getenv("AGENT_NAME", "multi-tenant-agent")
    ))
