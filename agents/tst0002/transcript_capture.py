"""
Transcript Capture Integration for LiveKit Agents

Captures real-time transcript segments from STT and TTS and sends them to the
backend transcript API for storage and analysis.
"""

import logging
import asyncio
import aiohttp
from typing import Optional, Dict, Any
from datetime import datetime
from livekit.agents import JobContext
from livekit.agents.voice import UserInputTranscribedEvent, SpeechCreatedEvent

logger = logging.getLogger(__name__)

# Backend API configuration
BACKEND_URL = "http://localhost:5001"
TRANSCRIPT_API_ENDPOINT = f"{BACKEND_URL}/api/transcripts"


class TranscriptCapture:
    """
    Captures and uploads transcript segments to backend API
    """

    def __init__(self, call_log_id: str, user_id: str, language: str = "en"):
        """
        Initialize transcript capture for a call

        Args:
            call_log_id: ID of the call log entry
            user_id: User ID for multi-tenant isolation
            language: Primary language for transcription
        """
        self.call_log_id = call_log_id
        self.user_id = user_id
        self.language = language
        self.transcript_id: Optional[str] = None
        self.segment_buffer: list = []
        self.buffer_lock = asyncio.Lock()
        self.start_time: Optional[float] = None
        self.sequence_number = 0

        # HTTP session for API calls
        self.session: Optional[aiohttp.ClientSession] = None

    async def initialize(self) -> bool:
        """
        Create transcript record in backend

        Returns:
            True if successful, False otherwise
        """
        try:
            self.session = aiohttp.ClientSession()

            async with self.session.post(
                TRANSCRIPT_API_ENDPOINT,
                json={
                    "callLogId": self.call_log_id,
                    "language": self.language
                },
                headers={
                    "Content-Type": "application/json",
                    "X-User-ID": self.user_id
                }
            ) as response:
                if response.status == 201:
                    data = await response.json()
                    self.transcript_id = data.get("transcript", {}).get("id")
                    logger.info(f"✅ Transcript initialized: {self.transcript_id}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Failed to initialize transcript: {response.status} - {error_text}")
                    return False

        except Exception as e:
            logger.error(f"❌ Error initializing transcript: {e}", exc_info=True)
            return False

    async def add_user_segment(self, event: UserInputTranscribedEvent):
        """
        Capture user speech segment from STT

        Args:
            event: UserInputTranscribedEvent from LiveKit agent
        """
        if not self.transcript_id:
            logger.warning("Transcript not initialized, skipping user segment")
            return

        # Only process final transcriptions to avoid duplicates
        if not event.is_final:
            return

        # Set start time on first segment
        if self.start_time is None:
            self.start_time = event.created_at

        segment_data = {
            "speaker": "user",
            "text": event.transcript,
            "startTime": event.created_at - self.start_time,
            "endTime": event.created_at - self.start_time + len(event.transcript.split()) * 0.3,  # Estimate duration
            "confidence": 1.0,  # Deepgram provides confidence, default to 1.0
            "language": event.language or self.language,
            "isFinal": event.is_final,
            "speakerId": event.speaker_id
        }

        async with self.buffer_lock:
            self.segment_buffer.append(segment_data)

        # Flush buffer if it has 5+ segments (batch efficiency)
        if len(self.segment_buffer) >= 5:
            await self.flush_segments()

    async def add_agent_segment(self, text: str, created_at: float):
        """
        Capture agent speech segment from TTS

        Args:
            text: Agent's spoken text
            created_at: Timestamp when speech was created
        """
        if not self.transcript_id:
            logger.warning("Transcript not initialized, skipping agent segment")
            return

        # Set start time on first segment
        if self.start_time is None:
            self.start_time = created_at

        segment_data = {
            "speaker": "agent",
            "text": text,
            "startTime": created_at - self.start_time,
            "endTime": created_at - self.start_time + len(text.split()) * 0.3,  # Estimate duration
            "confidence": 1.0,
            "language": self.language,
            "isFinal": True
        }

        async with self.buffer_lock:
            self.segment_buffer.append(segment_data)

        # Flush buffer if it has 5+ segments
        if len(self.segment_buffer) >= 5:
            await self.flush_segments()

    async def flush_segments(self):
        """
        Send buffered segments to backend API
        """
        if not self.transcript_id or not self.segment_buffer:
            return

        async with self.buffer_lock:
            segments_to_send = self.segment_buffer.copy()
            self.segment_buffer.clear()

        if not segments_to_send:
            return

        try:
            async with self.session.post(
                f"{TRANSCRIPT_API_ENDPOINT}/{self.transcript_id}/segments",
                json={"segments": segments_to_send},
                headers={
                    "Content-Type": "application/json",
                    "X-User-ID": self.user_id
                }
            ) as response:
                if response.status == 201:
                    data = await response.json()
                    count = data.get("count", 0)
                    logger.info(f"✅ Uploaded {count} transcript segments")
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Failed to upload segments: {response.status} - {error_text}")
                    # Put segments back in buffer for retry
                    async with self.buffer_lock:
                        self.segment_buffer.extend(segments_to_send)

        except Exception as e:
            logger.error(f"❌ Error uploading segments: {e}", exc_info=True)
            # Put segments back in buffer for retry
            async with self.buffer_lock:
                self.segment_buffer.extend(segments_to_send)

    async def complete(self, summary: Optional[str] = None, sentiment: Optional[str] = None):
        """
        Mark transcript as complete and optionally add AI analysis

        Args:
            summary: Optional AI-generated summary
            sentiment: Optional sentiment (positive/negative/neutral)
        """
        if not self.transcript_id:
            return

        # Flush any remaining segments
        await self.flush_segments()

        try:
            payload = {}
            if summary:
                payload["summary"] = summary
            if sentiment:
                payload["sentiment"] = sentiment

            async with self.session.put(
                f"{TRANSCRIPT_API_ENDPOINT}/{self.transcript_id}/complete",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-User-ID": self.user_id
                }
            ) as response:
                if response.status == 200:
                    logger.info(f"✅ Transcript completed: {self.transcript_id}")
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Failed to complete transcript: {response.status} - {error_text}")

        except Exception as e:
            logger.error(f"❌ Error completing transcript: {e}", exc_info=True)

    async def cleanup(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()


async def setup_transcript_capture(
    session,
    ctx: JobContext,
    call_log_id: str,
    user_id: str,
    language: str = "en"
) -> Optional[TranscriptCapture]:
    """
    Setup transcript capture for an agent session

    Args:
        session: AgentSession instance
        ctx: JobContext for the call
        call_log_id: ID of the call log entry
        user_id: User ID for multi-tenant isolation
        language: Primary language for transcription

    Returns:
        TranscriptCapture instance if successful, None otherwise
    """
    capture = TranscriptCapture(call_log_id, user_id, language)

    # Initialize transcript in backend
    if not await capture.initialize():
        logger.error("Failed to initialize transcript capture")
        return None

    @session.on("speech_created")
    def on_speech_created(event: SpeechCreatedEvent):
        """Capture when agent starts speaking"""
        async def _handle_speech():
            try:
                # Get the text being spoken from the speech handle
                speech_handle = event.speech_handle
                created_at = event.created_at

                # Wait for speech to collect text
                await speech_handle.wait_for_playout()

                # Get the text from the speech handle
                if hasattr(speech_handle, 'text') and speech_handle.text:
                    text = speech_handle.text
                    await capture.add_agent_segment(text, created_at)
                elif hasattr(speech_handle, 'source') and speech_handle.source:
                    # For streaming sources, collect text as it arrives
                    collected_text = []
                    async for chunk in speech_handle.source:
                        if hasattr(chunk, 'text'):
                            collected_text.append(chunk.text)

                    if collected_text:
                        full_text = ' '.join(collected_text)
                        await capture.add_agent_segment(full_text, created_at)

            except Exception as e:
                logger.error(f"Error capturing agent speech: {e}", exc_info=True)

        asyncio.create_task(_handle_speech())

    @session.on("user_input_transcribed")
    def on_user_transcribed(event: UserInputTranscribedEvent):
        """Capture user speech from STT"""
        async def _handle_user_speech():
            try:
                await capture.add_user_segment(event)
            except Exception as e:
                logger.error(f"Error capturing user speech: {e}", exc_info=True)

        asyncio.create_task(_handle_user_speech())

    # Add shutdown callback to complete transcript
    async def on_shutdown():
        """Complete transcript on call end"""
        await capture.complete()
        await capture.cleanup()

    ctx.add_shutdown_callback(on_shutdown)

    logger.info(f"✅ Transcript capture setup complete for call: {call_log_id}")
    return capture
