"""
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
AGENT_NAME = "Duplicate Fix Test"
AGENT_DESCRIPTION = ""

# AI Models
LLM_MODEL = "gpt-4o-mini"
LLM_TEMPERATURE = 0.7

STT_MODEL = "nova-2"
STT_PROVIDER = "deepgram"

TTS_VOICE = "alloy"
TTS_PROVIDER = "openai"

# Features
PREEMPTIVE_GENERATION = False
RESUME_FALSE_INTERRUPTION = False
TRANSCRIPTION_ENABLED = True

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
