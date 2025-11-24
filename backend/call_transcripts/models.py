"""
SQLAlchemy Models for Call Transcripts

Models are now defined in database.py to avoid duplicate table definitions.
This module imports them for backwards compatibility.
"""

from database import CallTranscript, TranscriptSegment

__all__ = ['CallTranscript', 'TranscriptSegment']
