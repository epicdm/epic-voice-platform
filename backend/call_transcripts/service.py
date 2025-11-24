"""
Call Transcript Service

Business logic for creating, storing, and retrieving call transcripts.
Handles transcript segments, speaker identification, and timing synchronization.
"""

import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from database import CallTranscript, TranscriptSegment, CallLog

logger = logging.getLogger(__name__)


class CallTranscriptService:
    """
    Service for managing call transcripts.

    Responsibilities:
    - Create and update transcripts
    - Store transcript segments with timing
    - Retrieve transcripts with segments
    - Calculate transcript statistics
    """

    def create_transcript(
        self,
        db: Session,
        user_id: str,
        call_log_id: str,
        language: Optional[str] = None
    ) -> CallTranscript:
        """
        Create a new transcript for a call.

        Args:
            db: Database session
            user_id: User identifier
            call_log_id: Call log identifier
            language: Detected language (optional)

        Returns:
            Created CallTranscript instance
        """
        try:
            # Check if transcript already exists
            existing = db.query(CallTranscript).filter(
                CallTranscript.callLogId == call_log_id
            ).first()

            if existing:
                logger.info(f"Transcript already exists for call {call_log_id}")
                return existing

            # Create new transcript
            transcript = CallTranscript(
                id=str(uuid.uuid4()),
                userId=user_id,
                callLogId=call_log_id,
                language=language,
                status='processing',
                createdAt=datetime.utcnow()
            )

            db.add(transcript)
            db.commit()
            db.refresh(transcript)

            logger.info(f"Created transcript {transcript.id} for call {call_log_id}")
            return transcript

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating transcript: {e}", exc_info=True)
            raise

    def add_segment(
        self,
        db: Session,
        transcript_id: str,
        speaker: str,
        text: str,
        start_time: float,
        end_time: float,
        confidence: Optional[float] = None,
        speaker_id: Optional[str] = None,
        language: Optional[str] = None,
        is_final: bool = True,
        segment_metadata: Optional[Dict] = None
    ) -> TranscriptSegment:
        """
        Add a transcript segment to a transcript.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            speaker: Speaker role (agent/user/system)
            text: Transcript text
            start_time: Start time in seconds from call start
            end_time: End time in seconds from call start
            confidence: STT confidence score (0.0-1.0)
            speaker_id: Optional speaker identifier from STT
            language: Segment language (if different from transcript)
            is_final: True if final transcript, False if interim
            segment_metadata: Additional STT metadata

        Returns:
            Created TranscriptSegment instance
        """
        try:
            # Get current segment count to determine sequence number
            transcript = db.query(CallTranscript).filter(
                CallTranscript.id == transcript_id
            ).first()

            if not transcript:
                raise ValueError(f"Transcript {transcript_id} not found")

            sequence_number = transcript.segmentCount + 1

            # Create segment
            segment = TranscriptSegment(
                id=str(uuid.uuid4()),
                transcriptId=transcript_id,
                sequenceNumber=sequence_number,
                speaker=speaker,
                speakerId=speaker_id,
                startTime=start_time,
                endTime=end_time,
                text=text,
                confidence=confidence,
                language=language,
                isFinal=is_final,
                segment_metadata=segment_metadata,
                createdAt=datetime.utcnow()
            )

            db.add(segment)

            # Update transcript segment count and duration
            transcript.segmentCount = sequence_number
            if end_time > (transcript.duration or 0):
                transcript.duration = end_time
            transcript.updatedAt = datetime.utcnow()

            db.commit()
            db.refresh(segment)

            logger.debug(f"Added segment {segment.id} to transcript {transcript_id}")
            return segment

        except Exception as e:
            db.rollback()
            logger.error(f"Error adding segment: {e}", exc_info=True)
            raise

    def add_segments_batch(
        self,
        db: Session,
        transcript_id: str,
        segments: List[Dict[str, Any]]
    ) -> List[TranscriptSegment]:
        """
        Add multiple transcript segments in batch.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            segments: List of segment dictionaries with required fields

        Returns:
            List of created TranscriptSegment instances
        """
        try:
            transcript = db.query(CallTranscript).filter(
                CallTranscript.id == transcript_id
            ).first()

            if not transcript:
                raise ValueError(f"Transcript {transcript_id} not found")

            created_segments = []
            current_sequence = transcript.segmentCount
            max_end_time = transcript.duration or 0

            for seg_data in segments:
                current_sequence += 1

                segment = TranscriptSegment(
                    id=str(uuid.uuid4()),
                    transcriptId=transcript_id,
                    sequenceNumber=current_sequence,
                    speaker=seg_data['speaker'],
                    speakerId=seg_data.get('speakerId'),
                    startTime=seg_data['startTime'],
                    endTime=seg_data['endTime'],
                    text=seg_data['text'],
                    confidence=seg_data.get('confidence'),
                    language=seg_data.get('language'),
                    isFinal=seg_data.get('isFinal', True),
                    segment_metadata=seg_data.get('metadata'),
                    createdAt=datetime.utcnow()
                )

                db.add(segment)
                created_segments.append(segment)

                # Track max end time
                if segment.endTime > max_end_time:
                    max_end_time = segment.endTime

            # Update transcript
            transcript.segmentCount = current_sequence
            transcript.duration = max_end_time
            transcript.updatedAt = datetime.utcnow()

            db.commit()

            logger.info(f"Added {len(created_segments)} segments to transcript {transcript_id}")
            return created_segments

        except Exception as e:
            db.rollback()
            logger.error(f"Error adding segments batch: {e}", exc_info=True)
            raise

    def complete_transcript(
        self,
        db: Session,
        transcript_id: str,
        summary: Optional[str] = None,
        sentiment: Optional[str] = None,
        keywords: Optional[Dict] = None
    ) -> CallTranscript:
        """
        Mark transcript as completed and optionally add analysis.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            summary: AI-generated summary (optional)
            sentiment: Overall sentiment (optional)
            keywords: Extracted keywords/entities (optional)

        Returns:
            Updated CallTranscript instance
        """
        try:
            transcript = db.query(CallTranscript).filter(
                CallTranscript.id == transcript_id
            ).first()

            if not transcript:
                raise ValueError(f"Transcript {transcript_id} not found")

            transcript.status = 'completed'
            transcript.completedAt = datetime.utcnow()
            transcript.updatedAt = datetime.utcnow()

            if summary:
                transcript.summary = summary
            if sentiment:
                transcript.sentiment = sentiment
            if keywords:
                transcript.keywords = keywords

            db.commit()
            db.refresh(transcript)

            logger.info(f"Completed transcript {transcript_id}")
            return transcript

        except Exception as e:
            db.rollback()
            logger.error(f"Error completing transcript: {e}", exc_info=True)
            raise

    def mark_transcript_failed(
        self,
        db: Session,
        transcript_id: str,
        error_message: str
    ) -> CallTranscript:
        """
        Mark transcript as failed with error message.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            error_message: Error description

        Returns:
            Updated CallTranscript instance
        """
        try:
            transcript = db.query(CallTranscript).filter(
                CallTranscript.id == transcript_id
            ).first()

            if not transcript:
                raise ValueError(f"Transcript {transcript_id} not found")

            transcript.status = 'failed'
            transcript.errorMessage = error_message
            transcript.updatedAt = datetime.utcnow()

            db.commit()
            db.refresh(transcript)

            logger.warning(f"Marked transcript {transcript_id} as failed: {error_message}")
            return transcript

        except Exception as e:
            db.rollback()
            logger.error(f"Error marking transcript as failed: {e}", exc_info=True)
            raise

    def get_transcript_by_call(
        self,
        db: Session,
        call_log_id: str,
        user_id: str
    ) -> Optional[CallTranscript]:
        """
        Get transcript for a specific call with all segments.

        Args:
            db: Database session
            call_log_id: Call log identifier
            user_id: User identifier (for multi-tenant isolation)

        Returns:
            CallTranscript with segments, or None if not found
        """
        try:
            transcript = db.query(CallTranscript).filter(
                and_(
                    CallTranscript.callLogId == call_log_id,
                    CallTranscript.userId == user_id
                )
            ).first()

            return transcript

        except Exception as e:
            logger.error(f"Error getting transcript for call {call_log_id}: {e}", exc_info=True)
            return None

    def get_transcript_by_id(
        self,
        db: Session,
        transcript_id: str,
        user_id: str
    ) -> Optional[CallTranscript]:
        """
        Get transcript by ID with all segments.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            user_id: User identifier (for multi-tenant isolation)

        Returns:
            CallTranscript with segments, or None if not found
        """
        try:
            transcript = db.query(CallTranscript).filter(
                and_(
                    CallTranscript.id == transcript_id,
                    CallTranscript.userId == user_id
                )
            ).first()

            return transcript

        except Exception as e:
            logger.error(f"Error getting transcript {transcript_id}: {e}", exc_info=True)
            return None

    def get_transcripts_by_user(
        self,
        db: Session,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None
    ) -> Tuple[List[CallTranscript], int]:
        """
        Get transcripts for a user with pagination.

        Args:
            db: Database session
            user_id: User identifier
            limit: Maximum number of transcripts to return
            offset: Number of transcripts to skip
            status: Filter by status (optional)

        Returns:
            Tuple of (list of transcripts, total count)
        """
        try:
            query = db.query(CallTranscript).filter(
                CallTranscript.userId == user_id
            )

            if status:
                query = query.filter(CallTranscript.status == status)

            total_count = query.count()

            transcripts = query.order_by(
                desc(CallTranscript.createdAt)
            ).limit(limit).offset(offset).all()

            return transcripts, total_count

        except Exception as e:
            logger.error(f"Error getting transcripts for user {user_id}: {e}", exc_info=True)
            return [], 0

    def delete_transcript(
        self,
        db: Session,
        transcript_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a transcript and all its segments.

        Args:
            db: Database session
            transcript_id: Transcript identifier
            user_id: User identifier (for multi-tenant isolation)

        Returns:
            True if deleted, False if not found
        """
        try:
            transcript = db.query(CallTranscript).filter(
                and_(
                    CallTranscript.id == transcript_id,
                    CallTranscript.userId == user_id
                )
            ).first()

            if not transcript:
                logger.warning(f"Transcript {transcript_id} not found for user {user_id}")
                return False

            db.delete(transcript)
            db.commit()

            logger.info(f"Deleted transcript {transcript_id}")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting transcript {transcript_id}: {e}", exc_info=True)
            raise
