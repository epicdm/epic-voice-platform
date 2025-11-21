"""
Database Configuration Loader
Loads agent configuration from PostgreSQL database
"""
import os
import asyncpg
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")


async def load_agent_config(agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Load agent configuration from database by agent name
    Returns dict with agent configuration or None if not found
    """
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set in environment")
        return None

    try:
        conn = await asyncpg.connect(DATABASE_URL)

        # Query agent config - use agentId field to match agent_name
        query = """
            SELECT
                id,
                name,
                "userId",
                status,
                instructions,
                "llmModel" as llm_model,
                temperature,
                "sttModel" as stt_model,
                "sttLanguage" as stt_language,
                voice,
                "realtimeVoice" as realtime_voice,
                "greetingEnabled" as greeting_enabled,
                "greetingMessage" as greeting_message,
                "preemptiveGeneration" as preemptive_generation,
                "resumeFalseInterruption" as resume_false_interruption
            FROM agent_configs
            WHERE "agentId" = $1 AND "isActive" = true
            LIMIT 1
        """

        row = await conn.fetchrow(query, agent_name)
        await conn.close()

        if not row:
            logger.warning(f"No active agent config found for agent_name: {agent_name}")
            return None

        config = dict(row)
        logger.info(f"Loaded agent config from database: {config.get('name')}")
        return config

    except Exception as e:
        logger.error(f"Failed to load agent config from database: {e}")
        return None


async def load_agent_config_by_phone(phone_number: str) -> Optional[Dict[str, Any]]:
    """
    Load agent configuration based on phone number mapping
    Used for dynamic routing based on which phone number received the call
    """
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set in environment")
        return None

    try:
        conn = await asyncpg.connect(DATABASE_URL)

        # Query: phone_number_pool → assignedToAgentId → agent_configs
        query = """
            SELECT
                ac.id,
                ac.name,
                ac."userId",
                ac.status,
                ac.instructions,
                ac."llmModel" as llm_model,
                ac.temperature,
                ac."sttModel" as stt_model,
                ac."sttLanguage" as stt_language,
                ac.voice,
                ac."realtimeVoice" as realtime_voice,
                ac."greetingEnabled" as greeting_enabled,
                ac."greetingMessage" as greeting_message,
                ac."preemptiveGeneration" as preemptive_generation,
                ac."resumeFalseInterruption" as resume_false_interruption,
                pn."phoneNumber" as phone_number
            FROM phone_number_pool pn
            JOIN agent_configs ac ON pn."assignedToAgentId" = ac.id
            WHERE pn."phoneNumber" = $1 AND pn.status = 'assigned' AND ac."isActive" = true
            LIMIT 1
        """

        row = await conn.fetchrow(query, phone_number)
        await conn.close()

        if not row:
            logger.warning(f"No agent config found for phone number: {phone_number}")
            return None

        config = dict(row)
        logger.info(f"🔀 Routing call from {phone_number} to agent: {config.get('name')}")
        return config

    except Exception as e:
        logger.error(f"Failed to load agent config by phone: {e}")
        return None


async def load_agent_config_by_id(agent_config_id: str) -> Optional[Dict[str, Any]]:
    """
    Load agent configuration by ID
    Used for outbound calls where agent_config_id is passed in metadata
    """
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set in environment")
        return None

    try:
        conn = await asyncpg.connect(DATABASE_URL)

        query = """
            SELECT
                id,
                name,
                "userId",
                status,
                instructions,
                "llmModel" as llm_model,
                temperature,
                "sttModel" as stt_model,
                "sttLanguage" as stt_language,
                voice,
                "realtimeVoice" as realtime_voice,
                "greetingEnabled" as greeting_enabled,
                "greetingMessage" as greeting_message,
                "preemptiveGeneration" as preemptive_generation,
                "resumeFalseInterruption" as resume_false_interruption
            FROM agent_configs
            WHERE id = $1 AND "isActive" = true
            LIMIT 1
        """

        row = await conn.fetchrow(query, agent_config_id)
        await conn.close()

        if not row:
            logger.warning(f"No agent config found for ID: {agent_config_id}")
            return None

        config = dict(row)
        logger.info(f"Loaded agent config by ID: {config.get('name')}")
        return config

    except Exception as e:
        logger.error(f"Failed to load agent config by ID: {e}")
        return None
