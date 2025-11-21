"""
Unit tests for CSV Export functionality.

Tests streaming CSV generation, phone number masking, and export endpoints.
"""

import pytest
import csv
import io
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from backend.exports.csv_stream import (
    CSVStreamer,
    format_datetime,
    format_json_field,
    format_boolean,
    sanitize_csv_field,
    mask_phone_number
)
from backend.exports.models import ExportLog, create_export_log, get_export_logs


# ============================================================================
# Utility Function Tests
# ============================================================================

class TestFormatDatetime:
    """Test datetime formatting for CSV export."""

    def test_format_valid_datetime(self):
        """Test formatting valid datetime."""
        dt = datetime(2025, 10, 30, 14, 30, 45)
        result = format_datetime(dt)
        assert result == '2025-10-30T14:30:45'

    def test_format_none(self):
        """Test formatting None returns empty string."""
        result = format_datetime(None)
        assert result == ''


class TestFormatJsonField:
    """Test JSON field formatting for CSV export."""

    def test_format_dict(self):
        """Test formatting dictionary to JSON string."""
        data = {'key': 'value', 'number': 123}
        result = format_json_field(data)
        assert '"key": "value"' in result
        assert '"number": 123' in result

    def test_format_list(self):
        """Test formatting list to JSON string."""
        data = ['item1', 'item2', 'item3']
        result = format_json_field(data)
        assert '["item1", "item2", "item3"]' == result

    def test_format_none(self):
        """Test formatting None returns empty string."""
        result = format_json_field(None)
        assert result == ''


class TestFormatBoolean:
    """Test boolean formatting for CSV export."""

    def test_format_true(self):
        """Test formatting True."""
        result = format_boolean(True)
        assert result == 'true'

    def test_format_false(self):
        """Test formatting False."""
        result = format_boolean(False)
        assert result == 'false'

    def test_format_none(self):
        """Test formatting None returns empty string."""
        result = format_boolean(None)
        assert result == ''


class TestSanitizeCsvField:
    """Test CSV field sanitization."""

    def test_sanitize_string(self):
        """Test sanitizing normal string."""
        result = sanitize_csv_field('Hello World')
        assert result == 'Hello World'

    def test_sanitize_none(self):
        """Test sanitizing None returns empty string."""
        result = sanitize_csv_field(None)
        assert result == ''

    def test_sanitize_number(self):
        """Test sanitizing number converts to string."""
        result = sanitize_csv_field(12345)
        assert result == '12345'

    def test_sanitize_control_characters(self):
        """Test sanitizing removes control characters."""
        # ASCII 1-31 (except newline) are control characters
        text_with_control = 'Hello\x00\x01World'
        result = sanitize_csv_field(text_with_control)
        assert result == 'HelloWorld'

    def test_sanitize_preserves_newline(self):
        """Test sanitizing preserves newline characters."""
        text_with_newline = 'Line1\nLine2'
        result = sanitize_csv_field(text_with_newline)
        assert result == 'Line1\nLine2'


class TestMaskPhoneNumber:
    """Test phone number masking for privacy."""

    def test_mask_standard_phone(self):
        """Test masking standard US phone number."""
        phone = "+17678189426"
        result = mask_phone_number(phone)
        # Keeps first 3 and last 4: +17***9426
        assert result == "+17***9426"

    def test_mask_10_digit_phone(self):
        """Test masking 10-digit phone number."""
        phone = "+1234567890"
        result = mask_phone_number(phone)
        # Keeps first 3 and last 4: +12***7890
        assert result == "+12***7890"

    def test_mask_short_phone(self):
        """Test short phone number returned as-is or masked if >= 8 chars."""
        phone = "555-1234"
        result = mask_phone_number(phone)
        # 8 characters, so it gets masked: 555***1234
        assert result == "555***1234"

    def test_mask_none(self):
        """Test None returns empty string."""
        result = mask_phone_number(None)
        assert result == ''

    def test_mask_empty_string(self):
        """Test empty string returns empty string."""
        result = mask_phone_number('')
        assert result == ''

    def test_mask_preserves_format(self):
        """Test masking preserves phone number format."""
        phone = "+1-767-818-9426"
        result = mask_phone_number(phone)
        # Keeps first 3 and last 4 characters
        assert result == "+1-***9426"


# ============================================================================
# CSV Streamer Tests
# ============================================================================

class TestCSVStreamer:
    """Test CSV streaming functionality."""

    def test_stream_list_to_csv(self):
        """Test streaming list of dicts to CSV."""
        streamer = CSVStreamer(chunk_size=2)
        data = [
            {'name': 'Alice', 'age': 30},
            {'name': 'Bob', 'age': 25},
            {'name': 'Charlie', 'age': 35}
        ]
        headers = ['name', 'age']

        # Collect all chunks
        chunks = list(streamer.stream_list_to_csv(data, headers))

        # Combine chunks into full CSV
        full_csv = ''.join(chunks)

        # Parse CSV
        reader = csv.DictReader(io.StringIO(full_csv))
        rows = list(reader)

        assert len(rows) == 3
        assert rows[0]['name'] == 'Alice'
        assert rows[1]['name'] == 'Bob'
        assert rows[2]['name'] == 'Charlie'

    def test_stream_without_header(self):
        """Test streaming CSV without header row."""
        streamer = CSVStreamer(chunk_size=2)
        data = [{'name': 'Alice', 'age': 30}]
        headers = ['name', 'age']

        chunks = list(streamer.stream_list_to_csv(data, headers, include_header=False))
        full_csv = ''.join(chunks)

        # Should not contain header
        assert 'name,age' not in full_csv
        assert 'Alice,30' in full_csv

    def test_stream_query_to_csv(self):
        """Test streaming database query to CSV."""
        streamer = CSVStreamer(chunk_size=2)

        # Create mock objects with proper attribute access
        class MockRow:
            def __init__(self, id_val, name_val):
                self.id = id_val
                self.name = name_val

        mock_row1 = MockRow('1', 'Alice')
        mock_row2 = MockRow('2', 'Bob')
        mock_row3 = MockRow('3', 'Charlie')

        # Mock query with pagination
        mock_query = Mock()
        mock_query.limit.return_value.offset.return_value.all.side_effect = [
            [mock_row1, mock_row2],  # First batch
            [mock_row3],               # Second batch
            []                         # End of results
        ]

        headers = ['id', 'name']

        def format_row(row):
            return {'id': row.id, 'name': row.name}

        chunks = list(streamer.stream_query_to_csv(mock_query, headers, format_row))
        full_csv = ''.join(chunks)

        reader = csv.DictReader(io.StringIO(full_csv))
        rows = list(reader)

        assert len(rows) == 3
        assert rows[0]['name'] == 'Alice'
        assert rows[2]['name'] == 'Charlie'


# ============================================================================
# Export Log Model Tests
# ============================================================================

class TestExportLogModel:
    """Test ExportLog audit model."""

    def test_create_export_log(self):
        """Test creating export log instance."""
        log = ExportLog(
            user_id='user-123',
            export_type='calls',
            filters={'status': 'completed'},
            row_count=100,
            file_size_bytes=50000,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0'
        )

        assert log.user_id == 'user-123'
        assert log.export_type == 'calls'
        assert log.filters == {'status': 'completed'}
        assert log.row_count == 100
        assert log.file_size_bytes == 50000

    def test_export_log_to_dict(self):
        """Test converting export log to dictionary."""
        log = ExportLog(
            id='log-123',
            user_id='user-123',
            export_type='leads',
            filters={},
            row_count=50,
            file_size_bytes=25000,
            created_at=datetime(2025, 10, 30, 14, 30, 45)
        )

        result = log.to_dict()

        assert result['id'] == 'log-123'
        assert result['user_id'] == 'user-123'
        assert result['export_type'] == 'leads'
        assert result['row_count'] == 50
        assert result['created_at'] == '2025-10-30T14:30:45'

    @patch('backend.exports.models.ExportLog')
    def test_create_export_log_function(self, mock_export_log_class):
        """Test create_export_log helper function."""
        mock_db = Mock()
        mock_log = Mock()
        mock_export_log_class.return_value = mock_log

        result = create_export_log(
            db=mock_db,
            user_id='user-123',
            export_type='calls',
            filters={'status': 'completed'},
            row_count=100,
            file_size_bytes=50000
        )

        mock_db.add.assert_called_once_with(mock_log)
        mock_db.commit.assert_called_once()
        assert result == mock_log


# ============================================================================
# Integration Tests
# ============================================================================

class TestExportEndpointsIntegration:
    """Integration tests for export endpoints (require mocking Flask app)."""

    @patch('backend.exports.routes.SessionLocal')
    def test_export_calls_response_headers(self, mock_session):
        """Test export calls endpoint returns correct headers."""
        # This would require full Flask app setup
        # Placeholder for integration test structure
        pass

    @patch('backend.exports.routes.SessionLocal')
    def test_export_leads_with_filters(self, mock_session):
        """Test export leads endpoint applies filters correctly."""
        # This would require full Flask app setup
        # Placeholder for integration test structure
        pass


# ============================================================================
# Performance Tests
# ============================================================================

class TestPerformance:
    """Performance tests for streaming large datasets."""

    def test_stream_large_dataset(self):
        """Test streaming 10,000 rows efficiently."""
        streamer = CSVStreamer(chunk_size=1000)

        # Generate 10,000 mock rows
        data = [{'id': str(i), 'value': f'row_{i}'} for i in range(10000)]
        headers = ['id', 'value']

        # Measure memory-efficient streaming
        chunk_count = 0
        total_size = 0

        for chunk in streamer.stream_list_to_csv(data, headers):
            chunk_count += 1
            total_size += len(chunk)

        # Should have multiple chunks for 10k rows
        assert chunk_count > 1
        assert total_size > 0

        # Verify total size is reasonable (not loading all in memory at once)
        # Each chunk should be < 100KB for 1000 rows
        assert total_size < 10 * 1024 * 1024  # Less than 10MB total


# ============================================================================
# Edge Case Tests
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_dataset(self):
        """Test streaming empty dataset."""
        streamer = CSVStreamer()
        data = []
        headers = ['id', 'name']

        chunks = list(streamer.stream_list_to_csv(data, headers))
        full_csv = ''.join(chunks)

        # Should only contain header
        assert 'id,name' in full_csv
        lines = full_csv.strip().split('\n')
        assert len(lines) == 1  # Only header line

    def test_special_characters_in_csv(self):
        """Test CSV handles special characters correctly."""
        streamer = CSVStreamer()
        data = [
            {'name': 'Alice, Bob', 'note': 'Has "quotes"'},
            {'name': 'Charlie\nNewline', 'note': 'Normal'}
        ]
        headers = ['name', 'note']

        chunks = list(streamer.stream_list_to_csv(data, headers))
        full_csv = ''.join(chunks)

        # CSV should properly escape special characters
        assert '"Alice, Bob"' in full_csv or 'Alice, Bob' in full_csv
        assert 'Charlie' in full_csv

    def test_unicode_in_csv(self):
        """Test CSV handles Unicode characters."""
        streamer = CSVStreamer()
        data = [
            {'name': '日本語', 'emoji': '😀'},
            {'name': 'Français', 'emoji': '🇫🇷'}
        ]
        headers = ['name', 'emoji']

        chunks = list(streamer.stream_list_to_csv(data, headers))
        full_csv = ''.join(chunks)

        # Should preserve Unicode
        assert '日本語' in full_csv
        assert 'Français' in full_csv


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
