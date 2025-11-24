"""
Funnel Engine SQLAlchemy Models

Database models for funnel orchestration system.
Multi-tenant isolated with userId foreign keys.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
import enum
import sys
import os

# Import Base from main database module to share table metadata
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from database import Base


class FunnelStatus(str, enum.Enum):
    """Funnel lifecycle status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class NodeType(str, enum.Enum):
    """Funnel node types"""
    CALL = "call"
    DELAY = "delay"
    CONDITION = "condition"
    WEBHOOK = "webhook"
    EMAIL = "email"
    SMS = "sms"
    END = "end"


class ExecutionStatus(str, enum.Enum):
    """Funnel execution status"""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class QueueStatus(str, enum.Enum):
    """Queue entry status (copied from webhook_worker)"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Funnel(Base):
    """
    Funnel configuration table
    Stores funnel metadata and status
    """
    __tablename__ = "funnels"

    id = Column(String(36), primary_key=True)  # CUID from Prisma
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(FunnelStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=FunnelStatus.DRAFT, index=True)

    # Flow graph stored as JSON (nodes + edges)
    graph = Column(JSON, nullable=True)

    # Settings
    settings = Column(JSON, nullable=True)  # max_concurrent, timeout, etc.

    # n8n integration
    n8n_workflow_id = Column(String(100), nullable=True, index=True)  # n8n workflow ID for auto-sync
    n8n_webhook_url = Column(String(500), nullable=True)  # n8n webhook URL for triggering execution

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nodes = relationship("FunnelNode", back_populates="funnel", cascade="all, delete-orphan")
    edges = relationship("FunnelEdge", back_populates="funnel", cascade="all, delete-orphan")
    executions = relationship("FunnelExecution", back_populates="funnel", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_funnels_user_status", "user_id", "status"),
        Index("idx_funnels_created", "created_at"),
    )

    def __repr__(self):
        return f"<Funnel(id={self.id}, name={self.name}, status={self.status})>"


class FunnelNode(Base):
    """
    Funnel node/stage configuration
    Each node represents a stage in the funnel
    """
    __tablename__ = "funnel_nodes"

    id = Column(String(36), primary_key=True)  # CUID
    funnel_id = Column(String(36), ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Node configuration
    node_type = Column(SQLEnum(NodeType, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    label = Column(String(255), nullable=False)

    # Node-specific configuration (agent_id, delay_seconds, condition_logic, etc.)
    config = Column(JSON, nullable=True)

    # Position in visual editor
    position_x = Column(Integer, nullable=True)
    position_y = Column(Integer, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    funnel = relationship("Funnel", back_populates="nodes")

    # Indexes
    __table_args__ = (
        Index("idx_funnel_nodes_funnel", "funnel_id"),
        Index("idx_funnel_nodes_type", "node_type"),
    )

    def __repr__(self):
        return f"<FunnelNode(id={self.id}, type={self.node_type}, label={self.label})>"


class FunnelEdge(Base):
    """
    Funnel edge/transition configuration
    Defines transitions between nodes based on outcomes
    """
    __tablename__ = "funnel_edges"

    id = Column(String(36), primary_key=True)  # CUID
    funnel_id = Column(String(36), ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Edge configuration
    source_node_id = Column(String(36), ForeignKey("funnel_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_node_id = Column(String(36), ForeignKey("funnel_nodes.id", ondelete="CASCADE"), nullable=False, index=True)

    # Condition for this transition (e.g., "answered", "voicemail", "no_answer")
    condition = Column(String(100), nullable=True)

    # Edge label for visual editor
    label = Column(String(255), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    funnel = relationship("Funnel", back_populates="edges")

    # Indexes
    __table_args__ = (
        Index("idx_funnel_edges_funnel", "funnel_id"),
        Index("idx_funnel_edges_source", "source_node_id"),
        Index("idx_funnel_edges_target", "target_node_id"),
    )

    def __repr__(self):
        return f"<FunnelEdge(id={self.id}, {self.source_node_id} -> {self.target_node_id})>"


class FunnelExecution(Base):
    """
    Funnel execution instance
    Tracks a single lead/contact progressing through a funnel
    """
    __tablename__ = "funnel_executions"

    id = Column(String(36), primary_key=True)  # CUID
    funnel_id = Column(String(36), ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Lead/contact information
    lead_id = Column(String(36), nullable=True, index=True)  # Optional: link to leads table
    contact_data = Column(JSON, nullable=True)  # Store contact info (phone, email, name, etc.)

    # Execution state
    status = Column(SQLEnum(ExecutionStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ExecutionStatus.ACTIVE, index=True)
    current_node_id = Column(String(36), ForeignKey("funnel_nodes.id", ondelete="SET NULL"), nullable=True, index=True)

    # Execution metadata
    context = Column(JSON, nullable=True)  # Store execution-specific context
    last_outcome = Column(String(100), nullable=True)  # Last node outcome

    # Timestamps
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    funnel = relationship("Funnel", back_populates="executions")
    events = relationship("FunnelExecutionEvent", back_populates="execution", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_funnel_executions_funnel", "funnel_id"),
        Index("idx_funnel_executions_status", "status"),
        Index("idx_funnel_executions_user_status", "user_id", "status"),
        Index("idx_funnel_executions_started", "started_at"),
    )

    def __repr__(self):
        return f"<FunnelExecution(id={self.id}, funnel={self.funnel_id}, status={self.status})>"


class FunnelExecutionEvent(Base):
    """
    Funnel execution event log
    Audit trail of all events in a funnel execution (event sourcing pattern)
    """
    __tablename__ = "funnel_execution_events"

    id = Column(String(36), primary_key=True)  # CUID
    execution_id = Column(String(36), ForeignKey("funnel_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Event details
    event_type = Column(String(100), nullable=False, index=True)  # 'node_entered', 'node_completed', 'transition', 'failed'
    node_id = Column(String(36), ForeignKey("funnel_nodes.id", ondelete="SET NULL"), nullable=True, index=True)

    # Event data
    outcome = Column(String(100), nullable=True)  # Node outcome
    event_metadata = Column(JSON, nullable=True)  # Additional event data
    error_message = Column(Text, nullable=True)  # Error details if failed

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    execution = relationship("FunnelExecution", back_populates="events")

    # Indexes
    __table_args__ = (
        Index("idx_funnel_events_execution", "execution_id"),
        Index("idx_funnel_events_type", "event_type"),
        Index("idx_funnel_events_created", "created_at"),
    )

    def __repr__(self):
        return f"<FunnelExecutionEvent(id={self.id}, type={self.event_type}, node={self.node_id})>"


class FunnelStageQueue(Base):
    """
    Funnel stage processing queue
    COPIED FROM webhook_delivery_queue PATTERN
    Uses PostgreSQL SKIP LOCKED for concurrent worker processing
    """
    __tablename__ = "funnel_stage_queue"

    id = Column(String(36), primary_key=True)  # CUID
    execution_id = Column(String(36), ForeignKey("funnel_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    funnel_id = Column(String(36), ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False, index=True)

    # Stage to process
    node_id = Column(String(36), ForeignKey("funnel_nodes.id", ondelete="CASCADE"), nullable=False, index=True)

    # Queue status (COPIED FROM webhook_worker)
    status = Column(SQLEnum(QueueStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=QueueStatus.PENDING, index=True)

    # Retry logic (COPIED FROM webhook_worker)
    attempt_count = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    next_retry_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    last_error = Column(Text, nullable=True)

    # Payload for stage execution
    payload = Column(JSON, nullable=True)  # Contact data, context, etc.

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Indexes (CRITICAL: Optimized for SKIP LOCKED polling - COPIED FROM webhook_worker)
    __table_args__ = (
        Index(
            "idx_funnel_queue_poll",
            "status",
            "next_retry_at",
            postgresql_where=(Column("status").in_(["pending", "failed"])),
        ),
        Index("idx_funnel_queue_execution", "execution_id"),
        Index("idx_funnel_queue_user", "user_id"),
        Index("idx_funnel_queue_funnel", "funnel_id"),
        Index("idx_funnel_queue_node", "node_id"),
    )

    def __repr__(self):
        return f"<FunnelStageQueue(id={self.id}, execution={self.execution_id}, status={self.status})>"
