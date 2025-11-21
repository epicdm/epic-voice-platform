"""
Agent Logic
Auto-generated from Epic.ai agent builder
"""
import logging
from livekit.agents import Agent, AgentSession, JobContext, RunContext
from livekit.agents.voice import MetricsCollectedEvent
from livekit.agents import metrics
from livekit.plugins import deepgram, openai, silero

from db_config import (
    AGENT_NAME,
    INSTRUCTIONS,
    LLM_MODEL,
    TEMPERATURE,
    STT_MODEL,
    STT_LANGUAGE,
    TTS_VOICE,
    VAD_ENABLED,
    VAD_PROVIDER,
    PREEMPTIVE_GENERATION,
    RESUME_FALSE_INTERRUPTION,
    TRANSCRIPTION_ENABLED,
    GREETING_ENABLED,
    GREETING_MESSAGE,
)

logger = logging.getLogger(__name__)


class SalesAgentAgent(Agent):
    """
    
    Personality: friendly
    """
    
    def __init__(self) -> None:
        super().__init__(
            instructions=INSTRUCTIONS
        )
    
    async def on_enter(self):
        """Called when agent enters the session"""
        # Generate initial greeting
        self.session.generate_reply()
    
    # Add your custom tools here using @function_tool decorator
    # Example:
    # @function_tool
    # async def my_custom_tool(self, context: RunContext, arg: str):
    #     """Description of what this tool does"""
    #     return "tool result"


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for the agent worker
    """
    # Log context
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "agent": AGENT_NAME,
    }
    
    logger.info(f"Starting agent: {AGENT_NAME}")
    
    # Create agent session
    session = AgentSession(
        vad=silero.VAD.load() if VAD_ENABLED else None,
        llm=openai.LLM(model=LLM_MODEL, temperature=TEMPERATURE),
        stt=deepgram.STT(model=STT_MODEL, language=STT_LANGUAGE),
        tts=openai.TTS(voice=TTS_VOICE),
        preemptive_generation=PREEMPTIVE_GENERATION,
        resume_false_interruption=RESUME_FALSE_INTERRUPTION,
        # transcription_enabled parameter removed - not supported in current SDK version
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
    
    # Start the session
    agent = SalesAgentAgent()
    await session.start(agent=agent, room=ctx.room)
