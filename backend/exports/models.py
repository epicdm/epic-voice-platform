"""
Export Audit Models

Provides audit logging for CSV export operations to track who exported what data and when.
"""

from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class ExportLog(Base):
    """
    Audit log for CSV export operations.

    Tracks all export requests for security, compliance, and debugging purposes.

    Attributes:
        id: Unique export log identifier (UUID)
        user_id: User who requested the export
        export_type: Type of export (calls, leads, agents, phone_numbers, events)
        filters: JSON object containing filter parameters used
        row_count: Number of rows exported
        file_size_bytes: Size of generated CSV file in bytes
        created_at: Timestamp when export was requested
        ip_address: IP address of requesting client
        user_agent: User agent string of requesting client
    """
    __tablename__ = 'export_logs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    export_type = Column(String(50), nullable=False, index=True)
    filters = Column(JSON, default=dict)
    row_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String(45))  # IPv6 max length
    user_agent = Column(String(512))

    def __repr__(self):
        return f"<ExportLog(id='{self.id}', user_id='{self.user_id}', type='{self.export_type}', rows={self.row_count})>"

    def to_dict(self):
        """Convert export log to dictionary for API responses."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'export_type': self.export_type,
            'filters': self.filters,
            'row_count': self.row_count,
            'file_size_bytes': self.file_size_bytes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }


def create_export_log(
    db,
    user_id: str,
    export_type: str,
    filters: dict,
    row_count: int = 0,
    file_size_bytes: int = 0,
    ip_address: str = None,
    user_agent: str = None
) -> ExportLog:
    """
    Create and persist export audit log.

    Args:
        db: Database session
        user_id: User who requested export
        export_type: Type of export (calls, leads, agents, etc.)
        filters: Dictionary of filter parameters
        row_count: Number of rows exported
        file_size_bytes: Size of CSV file in bytes
        ip_address: Client IP address
        user_agent: Client user agent string

    Returns:
        ExportLog: Created export log instance
    """
    log = ExportLog(
        user_id=user_id,
        export_type=export_type,
        filters=filters,
        row_count=row_count,
        file_size_bytes=file_size_bytes,
        ip_address=ip_address,
        user_agent=user_agent
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def get_export_logs(
    db,
    user_id: str = None,
    export_type: str = None,
    limit: int = 100,
    offset: int = 0
) -> list:
    """
    Query export logs with filtering.

    Args:
        db: Database session
        user_id: Filter by user (optional)
        export_type: Filter by export type (optional)
        limit: Maximum rows to return (default: 100)
        offset: Pagination offset (default: 0)

    Returns:
        list: List of ExportLog instances
    """
    query = db.query(ExportLog)

    if user_id:
        query = query.filter(ExportLog.user_id == user_id)
    if export_type:
        query = query.filter(ExportLog.export_type == export_type)

    query = query.order_by(ExportLog.created_at.desc())
    query = query.limit(limit).offset(offset)

    return query.all()
