"""
Configuration management for webhook delivery worker.

Loads configuration from environment variables with sensible defaults.
"""

import os
from typing import Optional
import logging


class WorkerConfig:
    """Webhook worker configuration loaded from environment variables."""

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:password@localhost:5432/epic_voice_db'
    )

    # Worker Configuration
    WORKER_POLL_INTERVAL: int = int(os.getenv('WORKER_POLL_INTERVAL', '5'))
    WORKER_BATCH_SIZE: int = int(os.getenv('WORKER_BATCH_SIZE', '10'))
    WORKER_TIMEOUT: int = int(os.getenv('WORKER_TIMEOUT', '30'))

    # Retry Configuration
    RETRY_BASE_DELAY: int = int(os.getenv('RETRY_BASE_DELAY', '30'))
    RETRY_MAX_DELAY: int = int(os.getenv('RETRY_MAX_DELAY', '3600'))
    RETRY_MAX_ATTEMPTS: int = int(os.getenv('RETRY_MAX_ATTEMPTS', '5'))

    # HTTP Configuration
    HTTP_TIMEOUT: int = int(os.getenv('HTTP_TIMEOUT', '30'))
    HTTP_POOL_SIZE: int = int(os.getenv('HTTP_POOL_SIZE', '10'))
    HTTP_MAX_RETRIES: int = int(os.getenv('HTTP_MAX_RETRIES', '3'))

    # Logging Configuration
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: Optional[str] = os.getenv('LOG_FILE', '/opt/livekit1/logs/webhook-worker.log')
    LOG_FORMAT: str = os.getenv(
        'LOG_FORMAT',
        '%(asctime)s [%(levelname)s] [Worker-%(worker_id)s] %(message)s'
    )

    # Metrics Configuration
    METRICS_ENABLED: bool = os.getenv('METRICS_ENABLED', 'true').lower() == 'true'
    METRICS_PORT: int = int(os.getenv('METRICS_PORT', '9090'))
    METRICS_PATH: str = os.getenv('METRICS_PATH', '/metrics')

    # Security Configuration
    WEBHOOK_SECRET_ENCRYPTION_KEY: Optional[str] = os.getenv('WEBHOOK_SECRET_ENCRYPTION_KEY')

    # Feature Flags
    AUDIT_LOG_ENABLED: bool = os.getenv('AUDIT_LOG_ENABLED', 'true').lower() == 'true'
    DEAD_LETTER_NOTIFICATIONS: bool = os.getenv('DEAD_LETTER_NOTIFICATIONS', 'true').lower() == 'true'

    # Performance Tuning
    DB_POOL_SIZE: int = int(os.getenv('DB_POOL_SIZE', '10'))
    DB_POOL_TIMEOUT: int = int(os.getenv('DB_POOL_TIMEOUT', '30'))
    MAX_CONCURRENT_DELIVERIES: int = int(os.getenv('MAX_CONCURRENT_DELIVERIES', '10'))

    @classmethod
    def validate(cls) -> None:
        """
        Validate configuration and log warnings for missing required values.

        Raises:
            ValueError: If critical configuration is missing
        """
        logger = logging.getLogger(__name__)

        # Critical validation
        if not cls.DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is required")

        # Warning for missing optional values
        if not cls.WEBHOOK_SECRET_ENCRYPTION_KEY:
            logger.warning(
                "WEBHOOK_SECRET_ENCRYPTION_KEY not set - webhook secrets will not be encrypted"
            )

        # Log configuration summary
        logger.info(f"Worker configuration loaded:")
        logger.info(f"  Database: {cls._mask_database_url(cls.DATABASE_URL)}")
        logger.info(f"  Poll interval: {cls.WORKER_POLL_INTERVAL}s")
        logger.info(f"  Batch size: {cls.WORKER_BATCH_SIZE}")
        logger.info(f"  Max attempts: {cls.RETRY_MAX_ATTEMPTS}")
        logger.info(f"  Audit logging: {'enabled' if cls.AUDIT_LOG_ENABLED else 'disabled'}")
        logger.info(f"  Metrics: {'enabled' if cls.METRICS_ENABLED else 'disabled'}")

    @staticmethod
    def _mask_database_url(url: str) -> str:
        """Mask password in database URL for logging."""
        try:
            if '@' in url and ':' in url:
                parts = url.split('@')
                credentials = parts[0].split(':')
                if len(credentials) >= 3:
                    masked = f"{credentials[0]}:{credentials[1]}:***@{parts[1]}"
                    return masked
            return url
        except Exception:
            return "***"

    @classmethod
    def to_dict(cls) -> dict:
        """Get configuration as dictionary for debugging."""
        return {
            'database_url': cls._mask_database_url(cls.DATABASE_URL),
            'worker_poll_interval': cls.WORKER_POLL_INTERVAL,
            'worker_batch_size': cls.WORKER_BATCH_SIZE,
            'worker_timeout': cls.WORKER_TIMEOUT,
            'retry_base_delay': cls.RETRY_BASE_DELAY,
            'retry_max_delay': cls.RETRY_MAX_DELAY,
            'retry_max_attempts': cls.RETRY_MAX_ATTEMPTS,
            'http_timeout': cls.HTTP_TIMEOUT,
            'http_pool_size': cls.HTTP_POOL_SIZE,
            'log_level': cls.LOG_LEVEL,
            'metrics_enabled': cls.METRICS_ENABLED,
            'audit_log_enabled': cls.AUDIT_LOG_ENABLED,
            'dead_letter_notifications': cls.DEAD_LETTER_NOTIFICATIONS,
            'db_pool_size': cls.DB_POOL_SIZE,
            'max_concurrent_deliveries': cls.MAX_CONCURRENT_DELIVERIES,
        }


def setup_logging(worker_id: str) -> logging.Logger:
    """
    Setup logging configuration for worker instance.

    Args:
        worker_id: Worker instance identifier

    Returns:
        Configured logger instance

    Example:
        >>> logger = setup_logging("1")
        >>> logger.info("Worker started")
        2025-10-29 12:00:00 [INFO] [Worker-1] Worker started
    """
    # Create logger
    logger = logging.getLogger('webhook_worker')
    logger.setLevel(getattr(logging, WorkerConfig.LOG_LEVEL.upper()))

    # Remove existing handlers
    logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)

    # File handler (if configured)
    if WorkerConfig.LOG_FILE:
        try:
            os.makedirs(os.path.dirname(WorkerConfig.LOG_FILE), exist_ok=True)
            file_handler = logging.FileHandler(WorkerConfig.LOG_FILE)
            file_handler.setLevel(logging.DEBUG)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Could not create file handler: {e}")

    # Formatter with worker_id
    formatter = logging.Formatter(
        WorkerConfig.LOG_FORMAT,
        defaults={'worker_id': worker_id}
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger
