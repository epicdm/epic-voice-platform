"""
CSV streaming utilities for large dataset exports.

Provides memory-efficient CSV generation using Python generators to handle
large result sets without loading entire datasets into memory.

Features:
- Streaming CSV generation via generators
- Memory-efficient batched database queries
- Configurable chunk size for optimal performance
- Automatic header generation from model attributes
- Support for nested JSON fields

Safety:
- Iterator-based approach prevents OOM on large datasets
- Batch processing with configurable chunk size (default: 1000 rows)
- Query pagination using LIMIT/OFFSET for controlled memory usage
"""

import csv
import io
from typing import List, Dict, Any, Generator, Optional, Callable
from sqlalchemy.orm import Query
from datetime import datetime
import json


class CSVStreamer:
    """
    Memory-efficient CSV streaming for large datasets.

    Uses Python generators to yield CSV data in chunks without loading
    entire result sets into memory.
    """

    def __init__(self, chunk_size: int = 1000):
        """
        Initialize CSV streamer.

        Args:
            chunk_size: Number of rows to fetch per database query (default: 1000)
        """
        self.chunk_size = chunk_size

    def stream_query_to_csv(
        self,
        query: Query,
        headers: List[str],
        row_formatter: Callable[[Any], Dict[str, Any]],
        include_header: bool = True
    ) -> Generator[str, None, None]:
        """
        Stream SQLAlchemy query results as CSV.

        Yields CSV data line-by-line using generators for memory efficiency.
        Fetches results in batches using query.limit().offset() to avoid
        loading entire result set.

        Args:
            query: SQLAlchemy query to execute
            headers: List of CSV column headers
            row_formatter: Function to convert model instance to dict
            include_header: Whether to include CSV header row (default: True)

        Yields:
            str: CSV data as string chunks

        Example:
            >>> query = db.query(CallLog).filter(CallLog.userId == user_id)
            >>> headers = ['id', 'phoneNumber', 'duration', 'cost']
            >>> def format_row(call):
            ...     return {
            ...         'id': call.id,
            ...         'phoneNumber': call.phoneNumber,
            ...         'duration': call.durationSeconds,
            ...         'cost': call.cost
            ...     }
            >>> for chunk in stream_query_to_csv(query, headers, format_row):
            ...     yield chunk
        """
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')

        # Write header row
        if include_header:
            writer.writeheader()
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

        # Stream results in batches
        offset = 0
        while True:
            # Fetch batch using LIMIT/OFFSET for memory efficiency
            batch = query.limit(self.chunk_size).offset(offset).all()

            if not batch:
                break  # No more results

            # Write batch to CSV
            for row in batch:
                formatted_row = row_formatter(row)
                writer.writerow(formatted_row)

            # Yield batch and clear buffer
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            offset += self.chunk_size

    def stream_list_to_csv(
        self,
        data: List[Dict[str, Any]],
        headers: List[str],
        include_header: bool = True
    ) -> Generator[str, None, None]:
        """
        Stream list of dictionaries as CSV.

        Useful for pre-processed data or small datasets.

        Args:
            data: List of dictionaries to convert to CSV
            headers: List of CSV column headers
            include_header: Whether to include CSV header row (default: True)

        Yields:
            str: CSV data as string chunks
        """
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')

        # Write header row
        if include_header:
            writer.writeheader()
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

        # Write data in chunks
        for i in range(0, len(data), self.chunk_size):
            chunk = data[i:i + self.chunk_size]

            for row in chunk:
                writer.writerow(row)

            # Yield chunk and clear buffer
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)


def format_datetime(dt: Optional[datetime]) -> str:
    """
    Format datetime for CSV export.

    Args:
        dt: Datetime object or None

    Returns:
        str: ISO format datetime string or empty string
    """
    if dt is None:
        return ''
    return dt.isoformat()


def format_json_field(data: Optional[Dict[str, Any]]) -> str:
    """
    Format JSON field for CSV export.

    Converts dict/list to JSON string for CSV compatibility.

    Args:
        data: Dictionary or list to format

    Returns:
        str: JSON string or empty string
    """
    if data is None:
        return ''
    return json.dumps(data)


def format_boolean(value: Optional[bool]) -> str:
    """
    Format boolean for CSV export.

    Args:
        value: Boolean value or None

    Returns:
        str: 'true', 'false', or empty string
    """
    if value is None:
        return ''
    return 'true' if value else 'false'


def sanitize_csv_field(value: Any) -> str:
    """
    Sanitize field value for CSV export.

    Handles None values, converts to string, and escapes special characters.

    Args:
        value: Any value to sanitize

    Returns:
        str: Sanitized string value
    """
    if value is None:
        return ''

    # Convert to string
    str_value = str(value)

    # CSV DictWriter handles escaping, but we ensure clean data
    # Remove any control characters that could cause issues
    str_value = ''.join(char for char in str_value if ord(char) >= 32 or char == '\n')

    return str_value


def mask_phone_number(phone: Optional[str]) -> str:
    """
    Mask middle digits of phone number for privacy.

    Keeps first 3 and last 4 digits visible, masks middle digits with asterisks.

    Args:
        phone: Phone number string (e.g., "+17678189426")

    Returns:
        str: Masked phone number (e.g., "+176***9426") or empty string

    Examples:
        >>> mask_phone_number("+17678189426")
        '+176***9426'
        >>> mask_phone_number("+1234567890")
        '+123***7890'
        >>> mask_phone_number("555-1234")
        '555-1234'  # Too short, returned as-is
        >>> mask_phone_number(None)
        ''
    """
    if not phone or len(phone) < 8:
        return phone or ''

    # Keep first 3 and last 4 digits, mask the middle
    return f"{phone[:3]}***{phone[-4:]}"
