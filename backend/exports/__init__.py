"""
CSV Export Module for LiveKit Voice Agent Platform.

Provides authenticated, streaming CSV export endpoints for:
- Call logs with outcomes
- Agent configurations
- Phone number mappings
- LiveKit call events

Features:
- Memory-efficient streaming for large datasets
- Multi-tenant data isolation
- Date range and status filtering
- JWT/session-based authentication
- Automatic chunking and pagination

Usage:
    from backend.exports.routes import exports_bp
    app.register_blueprint(exports_bp)

Security:
    - All endpoints require authentication
    - User data isolated via userId foreign keys
    - Rate limiting recommended for production
"""

from backend.exports.routes import exports_bp
from backend.exports.csv_stream import CSVStreamer, mask_phone_number

__all__ = ['exports_bp', 'CSVStreamer', 'mask_phone_number']
__version__ = '1.0.0'
