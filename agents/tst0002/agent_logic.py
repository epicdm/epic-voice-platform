"""
Agent Logic
Auto-generated from Epic.ai agent builder
"""
import logging
from livekit.agents import Agent, AgentSession, JobContext, RunContext
from livekit.agents.voice import MetricsCollectedEvent
from livekit.agents import metrics
from livekit.plugins import deepgram, openai, silero

from config import (
    AGENT_NAME,
    LLM_MODEL,
    LLM_TEMPERATURE,
    STT_MODEL,
    TTS_VOICE,
    PREEMPTIVE_GENERATION,
    RESUME_FALSE_INTERRUPTION,
    TRANSCRIPTION_ENABLED,
)
from db_config import load_agent_config, load_agent_config_by_phone, load_agent_config_by_id
from transcript_capture import setup_transcript_capture
import re
import json
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class Tst0002Agent(Agent):
    """
    testingintttttt
    Personality: friendly
    """

    def __init__(self, instructions: str = None, greeting_message: str = None, greeting_enabled: bool = True) -> None:
        # Use dynamic instructions from database, fallback to default if not provided
        super().__init__(
            instructions=instructions or "tttttttttttttttttttttttttttttttttttt"
        )
        self.greeting_message = greeting_message
        self.greeting_enabled = greeting_enabled

    async def on_enter(self):
        """Called when agent enters the session"""
        # Generate initial greeting if enabled
        if self.greeting_enabled:
            if self.greeting_message:
                # Use custom greeting message
                await self.session.generate_reply(
                    instructions=f"Say this greeting to the user: {self.greeting_message}"
                )
            else:
                # Generate automatic greeting based on agent instructions
                await self.session.generate_reply(
                    instructions="Greet the user warmly and briefly introduce yourself based on your role."
                )
    
    # Add your custom tools here using @function_tool decorator
    # Example:
    # @function_tool
    # async def my_custom_tool(self, context: RunContext, arg: str):
    #     """Description of what this tool does"""
    #     return "tool result"


def extract_called_number_from_room_name(room_name: str) -> str:
    """
    Extract CALLED number (DID) from LiveKit room name prefix
    Examples:
    - "sip-17678189426__17678183742_u8f6X2ewvPHg" -> "+17678189426" (called number)
    - "sip-call__17678183742_u8f6X2ewvPHg" -> None (old format)
    """
    # New format: sip-{called_number}__
    match = re.search(r'sip-(\d+)__', room_name)
    if match:
        phone_digits = match.group(1)
        return f"+{phone_digits}" if not phone_digits.startswith('+') else phone_digits
    return None

def extract_caller_number_from_room_name(room_name: str) -> str:
    """
    Extract CALLER number from LiveKit room name
    Examples:
    - "sip-17678189426__17678183742_u8f6X2ewvPHg" -> "+17678183742" (caller)
    """
    # Match digits after __, before _
    match = re.search(r'__(\d+)_', room_name)
    if match:
        phone_digits = match.group(1)
        return f"+{phone_digits}" if not phone_digits.startswith('+') else phone_digits
    return None


def get_or_create_call_log(room_name: str, user_id: str = None, agent_config_id: str = None) -> str:
    """
    Get or create call log entry for transcript capture

    Args:
        room_name: LiveKit room name
        user_id: User ID for multi-tenant isolation
        agent_config_id: Agent config ID if known

    Returns:
        call_log_id: UUID of the call log entry
    """
    try:
        # Import database models
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from database import SessionLocal, CallLog

        db = SessionLocal()

        # Check if call log already exists for this room
        existing_log = db.query(CallLog).filter(
            CallLog.livekitRoomName == room_name
        ).first()

        if existing_log:
            call_log_id = existing_log.id
            logger.info(f"Found existing call log: {call_log_id}")
        else:
            # Create new call log
            call_log_id = str(uuid.uuid4())
            call_log = CallLog(
                id=call_log_id,
                userId=user_id or "unknown",
                agentConfigId=agent_config_id,
                livekitRoomName=room_name,
                startedAt=datetime.utcnow(),
                status="active",
                direction="inbound" if room_name.startswith("sip-") else "outbound"
            )
            db.add(call_log)
            db.commit()
            logger.info(f"Created new call log: {call_log_id}")

        db.close()
        return call_log_id

    except Exception as e:
        logger.error(f"Error getting/creating call log: {e}", exc_info=True)
        # Return a fallback UUID if database operation fails
        return str(uuid.uuid4())


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for the agent worker with dynamic routing
    """
    room_name = ctx.room.name

    # Log context
    ctx.log_context_fields = {
        "room": room_name,
        "agent": AGENT_NAME,
    }

    logger.info(f"Starting agent: {AGENT_NAME} for room: {room_name}")

    # Log room metadata for debugging
    if hasattr(ctx.room, 'metadata') and ctx.room.metadata:
        logger.info(f"Room metadata: {ctx.room.metadata}")

    # Determine routing strategy based on room name
    db_config = None
    routing_method = "unknown"

    if room_name.startswith("sip-"):
        # Incoming call - extract CALLED number (DID) from room prefix
        # New format: sip-{called_number}__{caller}_<random>
        called_number = extract_called_number_from_room_name(room_name)
        caller_number = extract_caller_number_from_room_name(room_name)

        if called_number:
            logger.info(f"📞 Incoming call TO: {called_number} FROM: {caller_number}")
            # Look up agent config by called number (the DID that was called)
            db_config = await load_agent_config_by_phone(called_number)
            routing_method = f"phone:{called_number}"
        else:
            logger.warning(f"Could not extract called number from room: {room_name}")

    elif room_name.startswith("funnel-"):
        # Funnel call - extract agent_config_id from room name
        # Format: funnel-{execution_id[:8]}-{agent_config_id}
        try:
            parts = room_name.split('-')
            # funnel-{execution_id}-{agent_config_id} has 3+ parts
            if len(parts) >= 3:
                # UUID can have hyphens, so join everything after "funnel-{execution_id}-"
                agent_config_id = '-'.join(parts[2:])
                execution_id_prefix = parts[1]
                logger.info(f"📞 Funnel call: execution={execution_id_prefix}, agent_id={agent_config_id}")
                db_config = await load_agent_config_by_id(agent_config_id)
                routing_method = f"funnel:{execution_id_prefix}:agent:{agent_config_id}"
            else:
                logger.warning(f"No agent_config_id in room name for funnel call: {room_name}")
        except Exception as e:
            logger.error(f"Failed to extract agent_config_id from funnel room name: {e}")
            logger.exception(e)

    elif room_name.startswith("outbound-"):
        # Outbound call - extract agent_config_id from room name
        # Format: outbound-call-{agent_config_id}
        try:
            parts = room_name.split('-')
            # outbound-call-{agent_config_id} has 3+ parts
            if len(parts) >= 3:
                # UUID can have hyphens, so join everything after "outbound-call-"
                agent_config_id = '-'.join(parts[2:])
                logger.info(f"📞 Outbound call with agent config ID from room name: {agent_config_id}")
                db_config = await load_agent_config_by_id(agent_config_id)
                routing_method = f"config_id:{agent_config_id}"
            else:
                logger.warning(f"No agent_config_id in room name for outbound call: {room_name}")
        except Exception as e:
            logger.error(f"Failed to extract agent_config_id from room name: {e}")
            logger.exception(e)

    logger.info(f"🔀 Routing: {routing_method}")

    # IMPORTANT: Only answer calls if phone is assigned to a deployed agent
    if not db_config:
        logger.warning(f"❌ No agent assigned to phone number or agent not found. Rejecting call.")
        await ctx.room.disconnect()
        return

    # Check if agent is deployed before processing the call
    agent_status = db_config.get('status', 'created')
    if agent_status != 'deployed':
        logger.warning(f"❌ Agent '{db_config.get('name')}' is not deployed (status: {agent_status}). Rejecting call.")
        await ctx.room.disconnect()
        return

    # Use database config for the assigned, deployed agent
    logger.info(f"Using database config for agent: {db_config.get('name')}")
    instructions = db_config.get('instructions', "You are a helpful assistant.")
    llm_model = db_config.get('llm_model', LLM_MODEL)
    temperature = db_config.get('temperature', LLM_TEMPERATURE)
    stt_model = db_config.get('stt_model', STT_MODEL)
    stt_language = db_config.get('stt_language', 'multi')
    voice = db_config.get('voice') or db_config.get('realtime_voice', TTS_VOICE)
    greeting_enabled = db_config.get('greetingEnabled', True)
    greeting_message = db_config.get('greetingMessage')
    preemptive_gen = db_config.get('preemptive_generation', PREEMPTIVE_GENERATION)
    resume_false_int = db_config.get('resume_false_interruption', RESUME_FALSE_INTERRUPTION)
    user_id = db_config.get('userId')
    agent_config_id = db_config.get('id')

    # Get or create call log for transcript capture
    call_log_id = get_or_create_call_log(room_name, user_id, agent_config_id)
    logger.info(f"📝 Call log ID for transcript capture: {call_log_id}")

    # Create agent session with dynamic configuration
    session = AgentSession(
        vad=silero.VAD.load(),
        llm=openai.LLM(model=llm_model, temperature=temperature),
        stt=deepgram.STT(model=stt_model, language=stt_language),
        tts=openai.TTS(model="tts-1", voice=voice),
        preemptive_generation=preemptive_gen,
        resume_false_interruption=resume_false_int,
        # Note: transcription_enabled removed - not supported in AgentSession v1.0
    )

    # Setup metrics collection
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Session usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Setup transcript capture for this call (only if we have a valid user_id)
    if user_id:
        logger.info(f"🎙️ Initializing transcript capture for call: {call_log_id}")
        transcript_capture = await setup_transcript_capture(
            session=session,
            ctx=ctx,
            call_log_id=call_log_id,
            user_id=user_id,
            language=stt_language if stt_language != 'multi' else 'en'
        )

        if transcript_capture:
            logger.info("✅ Transcript capture initialized successfully")
        else:
            logger.warning("⚠️ Transcript capture initialization failed, continuing without it")
    else:
        logger.warning("⚠️ No user_id available, skipping transcript capture")

    # Start the session with dynamic instructions and greeting configuration
    agent = Tst0002Agent(
        instructions=instructions,
        greeting_message=greeting_message,
        greeting_enabled=greeting_enabled
    )
    await session.start(agent=agent, room=ctx.room)
