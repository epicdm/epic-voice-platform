"""
Database models and connection for multi-tenant voice agent platform.
"""

from sqlalchemy import create_engine, Column, String, Text, Float, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
import uuid
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./voice_agents.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    """User accounts."""
    __tablename__ = 'users'

    # Note: Prisma uses camelCase column names
    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    emailVerified = Column('emailVerified', DateTime, nullable=True)
    name = Column(String(255))
    image = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)  # nullable for OAuth users
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    isActive = Column('isActive', Boolean, default=True, nullable=False)
    onboardingCompleted = Column('onboardingCompleted', Boolean, default=False, nullable=False)

    # FusionPBX Integration
    fusionpbx_user_uuid = Column(UUID(as_uuid=False))
    fusionpbx_api_key = Column(String(255))

    # Relationships
    agents = relationship('AgentConfig', back_populates='user', cascade='all, delete-orphan')
    phone_numbers = relationship('PhoneMapping', back_populates='user', cascade='all, delete-orphan')
    call_logs = relationship('CallLog', back_populates='user')
    sip_configs = relationship('SIPConfig', back_populates='user', cascade='all, delete-orphan')

class AgentConfig(Base):
    """Agent configurations per user."""
    __tablename__ = 'agent_configs'

    # Core Identity - NOTE: Using camelCase to match Prisma database schema
    id = Column(String(36), primary_key=True)
    userId = Column('userId', String(36), ForeignKey('users.id'), nullable=False)
    agentId = Column('agentId', String(255), unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    instructions = Column(Text, nullable=False)
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    isActive = Column('isActive', Boolean, default=True, nullable=False)

    # Agent file management
    filePath = Column('filePath', String(512))
    status = Column(String(50), default='created')
    process_pid = Column(Integer, nullable=True)

    # Core Configuration
    agentMode = Column('agentMode', String(50), default='standard')
    language = Column(String(10), default='en-US')
    temperature = Column(Float, default=0.7)

    # LLM Configuration
    llmProvider = Column('llmProvider', String(100), default='openai')
    llmModel = Column('llmModel', String(100), default='gpt-4o-mini')

    # STT Configuration (Standard mode only)
    sttProvider = Column('sttProvider', String(100), default='deepgram')
    sttModel = Column('sttModel', String(100), default='nova-2')
    sttLanguage = Column('sttLanguage', String(10), default='en')

    # TTS Configuration (Standard mode only)
    ttsProvider = Column('ttsProvider', String(100), default='openai')
    ttsModel = Column('ttsModel', String(100))
    ttsVoiceId = Column('ttsVoiceId', String(100))
    voice = Column(String(50), default='alloy')  # Kept for backward compatibility

    # Realtime API Configuration
    realtimeVoice = Column('realtimeVoice', String(50), default='alloy')

    # VAD Configuration
    vadEnabled = Column('vadEnabled', Boolean, default=True, nullable=False)
    vadProvider = Column('vadProvider', String(50), default='silero')

    # Turn Detection
    turnDetectionModel = Column('turnDetectionModel', String(50), default='multilingual')

    # Noise Cancellation
    noiseCancellationEnabled = Column('noiseCancellationEnabled', Boolean, default=True, nullable=False)
    noiseCancellationType = Column('noiseCancellationType', String(50), default='BVC')

    # Advanced Session Options
    preemptiveGeneration = Column('preemptiveGeneration', Boolean, default=False, nullable=False)
    resumeFalseInterruption = Column('resumeFalseInterruption', Boolean, default=False, nullable=False)
    falseInterruptionTimeout = Column('falseInterruptionTimeout', Float, default=1.0)
    minInterruptionDuration = Column('minInterruptionDuration', Float, default=0.2)

    # Greeting Configuration
    greetingEnabled = Column('greetingEnabled', Boolean, default=True, nullable=False)
    greetingMessage = Column('greetingMessage', Text)

    # FusionPBX Integration
    fusionpbx_agent_uuid = Column(UUID(as_uuid=False))
    sip_username = Column(String(50))
    sip_password = Column(String(255))
    sip_extension = Column(String(10))
    sip_domain = Column(String(255))
    sip_server = Column(String(255))
    did_number = Column(String(20))
    fusionpbx_extension_uuid = Column(UUID(as_uuid=False))
    fusionpbx_did_uuid = Column(UUID(as_uuid=False))

    # Relationships
    user = relationship('User', back_populates='agents')
    phone_mappings = relationship('PhoneMapping', back_populates='agent')
    call_logs = relationship('CallLog', back_populates='agent')

class PhoneMapping(Base):
    """Phone number to agent mappings."""
    __tablename__ = 'phone_mappings'

    # NOTE: Using camelCase to match Prisma database schema
    id = Column(String(36), primary_key=True)
    userId = Column('userId', String(36), ForeignKey('users.id'), nullable=False)
    agentConfigId = Column('agentConfigId', String(36), ForeignKey('agent_configs.id'), nullable=False)
    phoneNumber = Column('phoneNumber', String(20), unique=True, nullable=False)
    sipTrunkId = Column('sipTrunkId', String(100))
    sipConfigId = Column('sipConfigId', String(36), ForeignKey('sip_configs.id'))
    isActive = Column('isActive', Boolean, default=True, nullable=False)
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship('User', back_populates='phone_numbers')
    agent = relationship('AgentConfig', back_populates='phone_mappings')
    sip_config = relationship('SIPConfig', back_populates='phone_mappings')

class CallLog(Base):
    """Call history and outcome records (enhanced version)."""
    __tablename__ = 'call_logs'

    # NOTE: Using camelCase to match Prisma database schema
    id = Column(String(36), primary_key=True)
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    agentConfigId = Column('agentConfigId', String(36), ForeignKey('agent_configs.id', ondelete='SET NULL'), nullable=True, index=True)

    # LiveKit Identifiers
    livekitRoomName = Column('livekitRoomName', String(255), nullable=True, index=True)
    livekitRoomSid = Column('livekitRoomSid', String(100), nullable=True, unique=True, index=True)

    # Call Direction
    direction = Column(String(20), nullable=True, index=True)  # 'inbound' or 'outbound'

    # Contact Information
    phoneNumber = Column('phoneNumber', String(20), nullable=True, index=True)

    # SIP Integration
    sipCallId = Column('sipCallId', String(255), nullable=True)

    # Legacy fields (kept for compatibility)
    roomName = Column('roomName', String(255), nullable=True)
    durationSeconds = Column('durationSeconds', Integer, nullable=True)

    # Duration and Timestamps
    duration = Column(Integer, nullable=True)  # Duration in seconds
    startedAt = Column('startedAt', DateTime, default=datetime.utcnow, nullable=False, index=True)
    endedAt = Column('endedAt', DateTime, nullable=True, index=True)

    # Call Status and Outcome
    status = Column(String(50), default='active', nullable=False, index=True)  # 'active' or 'ended'
    outcome = Column(String(50), nullable=True, index=True)  # 'completed', 'no_answer', 'busy', 'failed', 'voicemail'

    # Recording and Metadata
    recordingUrl = Column('recordingUrl', String(512), nullable=True)
    call_metadata = Column('call_metadata', JSONB, nullable=True)  # Additional call metadata

    # Billing
    cost = Column('cost', String(20), nullable=True)  # Decimal stored as string

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False, index=True)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship('User', back_populates='call_logs')
    agent = relationship('AgentConfig', back_populates='call_logs')
    events = relationship('LiveKitCallEvent', back_populates='call_log', cascade='all, delete-orphan')

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'userId': self.userId,
            'agentConfigId': self.agentConfigId,
            'livekitRoomName': self.livekitRoomName,
            'livekitRoomSid': self.livekitRoomSid,
            'direction': self.direction,
            'phoneNumber': self.phoneNumber,
            'sipCallId': self.sipCallId,
            'duration': self.duration or self.durationSeconds,
            'startedAt': self.startedAt.isoformat() if self.startedAt else None,
            'endedAt': self.endedAt.isoformat() if self.endedAt else None,
            'status': self.status,
            'outcome': self.outcome,
            'recordingUrl': self.recordingUrl,
            'metadata': self.call_metadata,
            'cost': self.cost,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'updatedAt': self.updatedAt.isoformat() if self.updatedAt else None
        }

class LiveKitCallEvent(Base):
    """LiveKit webhook event log with idempotency protection."""
    __tablename__ = 'livekit_call_events'

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Multi-Tenant Foreign Key (CASCADE)
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Call Log Reference (CASCADE)
    callLogId = Column('callLogId', String(36), ForeignKey('call_logs.id', ondelete='CASCADE'), nullable=True, index=True)

    # Idempotency Key (UNIQUE constraint)
    eventId = Column('eventId', String(100), nullable=False, unique=True, index=True)

    # Event Details
    event = Column(String(50), nullable=False, index=True)
    roomName = Column('roomName', String(255), nullable=False, index=True)
    roomSid = Column('roomSid', String(100), nullable=True, index=True)

    # Participant Details
    participantIdentity = Column('participantIdentity', String(255), nullable=True)
    participantSid = Column('participantSid', String(100), nullable=True, index=True)

    # Event Timestamp (from LiveKit)
    timestamp = Column(Integer, nullable=False, index=True)

    # Full Payload (JSONB for flexible querying)
    rawPayload = Column('rawPayload', JSONB, nullable=False)

    # Processing Status
    processed = Column('processed', Integer, default=1, nullable=False)
    errorMessage = Column('errorMessage', Text, nullable=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False, index=True)
    processedAt = Column('processedAt', DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship('User')
    call_log = relationship('CallLog', back_populates='events')

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'userId': self.userId,
            'callLogId': self.callLogId,
            'eventId': self.eventId,
            'event': self.event,
            'roomName': self.roomName,
            'roomSid': self.roomSid,
            'participantIdentity': self.participantIdentity,
            'participantSid': self.participantSid,
            'timestamp': self.timestamp,
            'rawPayload': self.rawPayload,
            'processed': self.processed,
            'errorMessage': self.errorMessage,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'processedAt': self.processedAt.isoformat() if self.processedAt else None
        }

class SIPConfig(Base):
    """SIP server configurations per user."""
    __tablename__ = 'sip_configs'

    # NOTE: Using camelCase to match Prisma database schema
    id = Column(String(36), primary_key=True)
    userId = Column('userId', String(36), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    sipUrl = Column('sipUrl', String(255), nullable=False)
    sipUsername = Column('sipUsername', String(255))
    sipPassword = Column('sipPassword', String(255))
    sipTransport = Column('sipTransport', String(50), default='tcp', nullable=False)
    trunkId = Column('trunkId', String(100))
    isDefault = Column('isDefault', Boolean, default=False, nullable=False)
    inboundEnabled = Column('inboundEnabled', Boolean, default=True, nullable=False)
    outboundEnabled = Column('outboundEnabled', Boolean, default=True, nullable=False)
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='sip_configs')
    phone_mappings = relationship('PhoneMapping', back_populates='sip_config')

class LiveKitAgent(Base):
    """LiveKit infrastructure agents (physical processes)."""
    __tablename__ = 'livekit_agents'

    id = Column(String(36), primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), default='stopped', nullable=False)
    filepath = Column(String(500), nullable=False)
    pid = Column(Integer, nullable=True)
    port = Column(Integer, nullable=True)
    livekit_url = Column(String(255), nullable=True)
    region = Column(String(50), default='us-east', nullable=True)
    capacity = Column(Integer, default=100, nullable=False)
    current_load = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_health_check = Column(DateTime, nullable=True)
    version = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)


class CallTranscript(Base):
    """
    Call transcript metadata and summary.
    One transcript per call_log.
    """
    __tablename__ = 'call_transcripts'

    # Primary key
    id = Column(String(36), primary_key=True)

    # Foreign keys
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    callLogId = Column('callLogId', String(36), ForeignKey('call_logs.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Transcript metadata
    language = Column(String(10), nullable=True)
    duration = Column(Float, nullable=True)
    segmentCount = Column('segmentCount', Integer, default=0)

    # Analysis fields
    sentiment = Column(String(20), nullable=True)
    summary = Column(Text, nullable=True)
    keywords = Column(JSONB, nullable=True)

    # Status tracking
    status = Column(String(20), default='processing')
    errorMessage = Column('errorMessage', Text, nullable=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False, index=True)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completedAt = Column('completedAt', DateTime, nullable=True)

    # Relationships
    segments = relationship('TranscriptSegment', back_populates='transcript', cascade='all, delete-orphan', order_by='TranscriptSegment.startTime')
    call_log = relationship('CallLog', foreign_keys=[callLogId])

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'userId': self.userId,
            'callLogId': self.callLogId,
            'language': self.language,
            'duration': self.duration,
            'segmentCount': self.segmentCount,
            'sentiment': self.sentiment,
            'summary': self.summary,
            'keywords': self.keywords,
            'status': self.status,
            'errorMessage': self.errorMessage,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'updatedAt': self.updatedAt.isoformat() if self.updatedAt else None,
            'completedAt': self.completedAt.isoformat() if self.completedAt else None,
            'segments': [seg.to_dict() for seg in self.segments] if self.segments else []
        }


class TranscriptSegment(Base):
    """
    Individual transcript segment (utterance).
    Multiple segments per transcript.
    """
    __tablename__ = 'transcript_segments'

    # Primary key
    id = Column(String(36), primary_key=True)

    # Foreign key
    transcriptId = Column('transcriptId', String(36), ForeignKey('call_transcripts.id', ondelete='CASCADE'), nullable=False, index=True)

    # Segment identification
    sequenceNumber = Column('sequenceNumber', Integer, nullable=False)
    speaker = Column(String(20), nullable=False)
    speakerId = Column('speakerId', String(100), nullable=True)

    # Timing
    startTime = Column('startTime', Float, nullable=False)
    endTime = Column('endTime', Float, nullable=False)

    # Content
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)

    # Metadata
    language = Column(String(10), nullable=True)
    isFinal = Column('isFinal', Boolean, default=True)
    segment_metadata = Column('segment_metadata', JSONB, nullable=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    transcript = relationship('CallTranscript', back_populates='segments')

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'transcriptId': self.transcriptId,
            'sequenceNumber': self.sequenceNumber,
            'speaker': self.speaker,
            'speakerId': self.speakerId,
            'startTime': self.startTime,
            'endTime': self.endTime,
            'text': self.text,
            'confidence': self.confidence,
            'language': self.language,
            'isFinal': self.isFinal,
            'metadata': self.segment_metadata,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None
        }

class BrandKit(Base):
    """Brand Kits for consistent branding across landing pages, messages, emails, and agents."""
    __tablename__ = 'brand_kits'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    userId = Column('userId', String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    isDefault = Column('isDefault', Boolean, default=False)

    # Source Information
    sourceType = Column('sourceType', String(50))  # 'facebook', 'instagram', 'website', 'manual'
    sourceUrl = Column('sourceUrl', Text)

    # Brand Assets
    logoUrl = Column('logoUrl', Text)
    logoSvg = Column('logoSvg', Text)

    # Brand Colors and Fonts
    brandColors = Column('brandColors', JSONB, default=[])
    fonts = Column(JSONB, default=[])

    # Company Info
    companyName = Column('companyName', String(255))
    tagline = Column(Text)
    industry = Column(String(100))
    description = Column(Text)

    # Contact Info
    phone = Column(String(50))
    email = Column(String(255))
    websiteUrl = Column('websiteUrl', Text)

    # Social Media Links
    socialLinks = Column('socialLinks', JSONB, default={})

    # Metadata
    extractionStatus = Column('extractionStatus', String(50), default='pending')
    extractionMetadata = Column('extractionMetadata', JSONB, default={})
    lastSyncedAt = Column('lastSyncedAt', DateTime)

    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert brand kit to dictionary."""
        return {
            'id': str(self.id),
            'userId': self.userId,
            'name': self.name,
            'isDefault': self.isDefault,
            'sourceType': self.sourceType,
            'sourceUrl': self.sourceUrl,
            'logoUrl': self.logoUrl,
            'logoSvg': self.logoSvg,
            'brandColors': self.brandColors,
            'fonts': self.fonts,
            'companyName': self.companyName,
            'tagline': self.tagline,
            'industry': self.industry,
            'description': self.description,
            'phone': self.phone,
            'email': self.email,
            'websiteUrl': self.websiteUrl,
            'socialLinks': self.socialLinks,
            'extractionStatus': self.extractionStatus,
            'extractionMetadata': self.extractionMetadata,
            'lastSyncedAt': self.lastSyncedAt.isoformat() if self.lastSyncedAt else None,
            'createdAt': self.createdAt.isoformat() if self.createdAt else None,
            'updatedAt': self.updatedAt.isoformat() if self.updatedAt else None,
        }


def init_db():
    """Initialize database and create tables."""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        return db
    finally:
        pass

if __name__ == '__main__':
    init_db()
