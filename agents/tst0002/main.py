"""
Main Entry Point
Auto-generated from Epic.ai agent builder
"""
import logging
from livekit.agents import WorkerOptions, cli
from agent_logic import entrypoint
from config import LOG_LEVEL, AGENT_NAME

# Setup logging
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    """Start the LiveKit agent worker"""
    logger.info(f"Starting {AGENT_NAME} worker...")
    
    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=AGENT_NAME,  # Register worker with agent name for dispatch routing
        # Add prewarm function if needed
        # prewarm_fnc=prewarm
    )
    
    cli.run_app(options)


if __name__ == "__main__":
    main()
