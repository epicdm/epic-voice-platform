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

logger = logging.getLogger(__name__)


class LoggingTestAgentAgent(Agent):
    """
    
    Personality: friendly
    """
    
    def __init__(self) -> None:
        super().__init__(
            instructions="Test logging"
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
        vad=silero.VAD.load(),
        llm=openai.LLM(model=LLM_MODEL, temperature=LLM_TEMPERATURE),
        stt=deepgram.STT(model=STT_MODEL, language="multi"),
        tts=openai.TTS(voice=TTS_VOICE),
        preemptive_generation=PREEMPTIVE_GENERATION,
        resume_false_interruption=RESUME_FALSE_INTERRUPTION,
        transcription_enabled=TRANSCRIPTION_ENABLED,
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
    agent = LoggingTestAgentAgent()
    await session.start(agent=agent, room=ctx.room)
