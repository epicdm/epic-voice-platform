"""
Agent Creator - Converts frontend agent config to LiveKit agent files
"""
import os
import json
from pathlib import Path
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class AgentCreator:
    """Creates LiveKit agent files from frontend configuration"""
    
    def __init__(self, agents_dir: str = "/opt/livekit1/agents"):
        self.agents_dir = Path(agents_dir)
        self.agents_dir.mkdir(exist_ok=True)
    
    def create_agent(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a LiveKit agent from frontend configuration
        
        Args:
            config: Agent configuration from frontend
                {
                    "name": "Customer Support",
                    "description": "...",
                    "instructions": "You are helpful...",
                    "personality": "friendly",
                    "llm": {"model": "gpt-4o-mini", "temperature": 0.7},
                    "stt": {"model": "deepgram-nova-3"},
                    "tts": {"voice": "openai-ash"},
                    "features": {
                        "preemptiveGeneration": true,
                        "resumeFalseInterruption": true,
                        "transcriptionEnabled": true
                    }
                }
        
        Returns:
            {"agent_id": "...", "path": "...", "status": "created"}
        """
        try:
            # Generate agent ID from name
            agent_id = self._generate_agent_id(config['name'])
            agent_path = self.agents_dir / agent_id
            agent_path.mkdir(exist_ok=True)
            
            # Create agent files
            self._create_config_file(agent_path, config)
            self._create_agent_logic(agent_path, config)
            self._create_main_file(agent_path, config)
            self._create_env_template(agent_path)
            self._create_requirements(agent_path)
            
            logger.info(f"Created agent {agent_id} at {agent_path}")
            
            return {
                "agent_id": agent_id,
                "path": str(agent_path),
                "status": "created",
                "files_created": [
                    "config.py",
                    "agent_logic.py", 
                    "main.py",
                    ".env.template",
                    "requirements.txt"
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise
    
    def _generate_agent_id(self, name: str) -> str:
        """Generate safe agent ID from name"""
        import re
        # Convert to lowercase, replace spaces with underscores, remove special chars
        agent_id = re.sub(r'[^a-z0-9_]', '', name.lower().replace(' ', '_'))
        return agent_id or 'agent'
    
    def _create_config_file(self, agent_path: Path, config: Dict[str, Any]):
        """Create config.py file"""
        content = f'''"""
Agent Configuration
Auto-generated from Epic.ai agent builder
"""
import os
from dotenv import load_dotenv

load_dotenv()

# LiveKit Connection
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# Agent Configuration
AGENT_NAME = "{config['name']}"
AGENT_DESCRIPTION = "{config.get('description', '')}"

# AI Models
LLM_MODEL = "{config['llm']['model']}"
LLM_TEMPERATURE = {config['llm'].get('temperature', 0.7)}

STT_MODEL = "{config['stt']['model'].split('-', 1)[1] if '-' in config['stt']['model'] else config['stt']['model']}"
STT_PROVIDER = "{config['stt']['model'].split('-')[0] if '-' in config['stt']['model'] else 'deepgram'}"

TTS_VOICE = "{config['tts']['voice'].split('-', 1)[1] if '-' in config['tts']['voice'] else config['tts']['voice']}"
TTS_PROVIDER = "{config['tts']['voice'].split('-')[0] if '-' in config['tts']['voice'] else 'openai'}"

# Features
PREEMPTIVE_GENERATION = {config['features'].get('preemptiveGeneration', True)}
RESUME_FALSE_INTERRUPTION = {config['features'].get('resumeFalseInterruption', True)}
TRANSCRIPTION_ENABLED = {config['features'].get('transcriptionEnabled', True)}

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
'''
        
        (agent_path / "config.py").write_text(content)
    
    def _create_agent_logic(self, agent_path: Path, config: Dict[str, Any]):
        """Create agent_logic.py file"""
        
        # Extract instructions and clean them
        instructions = config['instructions'].replace('"', '\\"').replace('\n', '\\n')
        
        content = f'''"""
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


class {self._generate_class_name(config['name'])}(Agent):
    """
    {config.get('description', 'AI Agent created with Epic.ai')}
    Personality: {config.get('personality', 'friendly')}
    """
    
    def __init__(self) -> None:
        super().__init__(
            instructions="{instructions}"
        )
    
    async def on_enter(self):
        """Called when agent enters the session"""
        # Generate initial greeting
        self.session.generate_reply()
    
    # Add your custom tools here using @function_tool decorator
    # Example:
    # @function_tool
    # async def my_custom_tool(self, context: RunContext, arg: str):
    #     \"\"\"Description of what this tool does\"\"\"
    #     return "tool result"


async def entrypoint(ctx: JobContext):
    """
    Main entrypoint for the agent worker
    """
    # Log context
    ctx.log_context_fields = {{
        "room": ctx.room.name,
        "agent": AGENT_NAME,
    }}
    
    logger.info(f"Starting agent: {{AGENT_NAME}}")
    
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
        logger.info(f"Session usage: {{summary}}")
    
    ctx.add_shutdown_callback(log_usage)
    
    # Start the session
    agent = {self._generate_class_name(config['name'])}()
    await session.start(agent=agent, room=ctx.room)
'''
        
        (agent_path / "agent_logic.py").write_text(content)
    
    def _create_main_file(self, agent_path: Path, config: Dict[str, Any]):
        """Create main.py file"""
        content = f'''"""
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
    logger.info(f"Starting {{AGENT_NAME}} worker...")
    
    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        # Add prewarm function if needed
        # prewarm_fnc=prewarm
    )
    
    cli.run_app(options)


if __name__ == "__main__":
    main()
'''
        
        (agent_path / "main.py").write_text(content)
    
    def _create_env_template(self, agent_path: Path):
        """Create .env.template file"""
        content = '''# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key

# Optional
LOG_LEVEL=INFO
'''
        
        (agent_path / ".env.template").write_text(content)
    
    def _create_requirements(self, agent_path: Path):
        """Create requirements.txt file"""
        content = '''# LiveKit Agents Framework
livekit-agents[openai,deepgram,silero]>=1.0.0
python-dotenv>=1.0.0

# Additional dependencies (uncomment as needed)
# livekit-plugins-elevenlabs
# livekit-plugins-cartesia
# livekit-plugins-anthropic
'''
        
        (agent_path / "requirements.txt").write_text(content)
    
    def _generate_class_name(self, name: str) -> str:
        """Generate PascalCase class name from agent name"""
        import re
        # Remove special chars, split by spaces/underscores
        words = re.sub(r'[^a-zA-Z0-9\s_]', '', name).split()
        # Capitalize each word
        class_name = ''.join(word.capitalize() for word in words if word)
        return class_name + 'Agent' if class_name else 'CustomAgent'


# CLI usage for testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python agent_creator.py <config.json>")
        sys.exit(1)
    
    with open(sys.argv[1]) as f:
        config = json.load(f)
    
    creator = AgentCreator()
    result = creator.create_agent(config)
    print(f"Agent created: {json.dumps(result, indent=2)}")
