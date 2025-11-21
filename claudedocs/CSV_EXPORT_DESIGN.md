# CSV Export Feature - Design Specification

## Overview

Multi-tenant CSV export system for LiveKit voice agent platform, enabling users to export call logs, agents, phone numbers, and analytics data.

## Architecture

### Backend (Flask + PostgreSQL)

#### Export Endpoints

**1. Call Logs Export**
```python
@app.route('/api/user/export/calls', methods=['GET'])
def export_calls():
    """
    Export call logs to CSV with filtering.

    Query Parameters:
    - start_date: ISO datetime (optional, default: 30 days ago)
    - end_date: ISO datetime (optional, default: now)
    - agent_id: Filter by agent (optional)
    - status: Filter by status (optional)
    - format: csv (default)

    Returns: Streaming CSV response
    """
```

**Fields Exported:**
- Call ID
- Start Time
- End Time
- Duration (seconds)
- Agent Name
- Phone Number (masked: +1***9426)
- Direction (inbound/outbound)
- Status (completed/failed/in_progress)
- Total Cost USD
- LLM Cost USD
- STT Cost USD
- TTS Cost USD
- Has Transcript (yes/no)

**2. Agents Export**
```python
@app.route('/api/user/export/agents', methods=['GET'])
def export_agents():
    """
    Export agents list to CSV.

    Query Parameters:
    - format: csv (default)

    Returns: Streaming CSV response
    """
```

**Fields Exported:**
- Agent ID
- Agent Name
- Description
- Voice Provider
- Voice ID
- Instructions (truncated to 200 chars)
- Created At
- Updated At
- Phone Numbers Assigned (count)
- Total Calls (count)

**3. Phone Numbers Export**
```python
@app.route('/api/user/export/phone-numbers', methods=['GET'])
def export_phone_numbers():
    """
    Export phone numbers to CSV.

    Query Parameters:
    - status: Filter by status (optional)
    - format: csv (default)

    Returns: Streaming CSV response
    """
```

**Fields Exported:**
- Phone Number
- Status (assigned/available/released)
- Agent Name (if assigned)
- LiveKit Inbound Trunk ID
- LiveKit Outbound Trunk ID
- Magnus DID ID
- Assigned At
- Released At

**4. Analytics Export**
```python
@app.route('/api/user/export/analytics', methods=['GET'])
def export_analytics():
    """
    Export aggregated analytics to CSV.

    Query Parameters:
    - period: 24h|7d|30d|90d (default: 30d)
    - format: csv (default)

    Returns: Streaming CSV response
    """
```

**Fields Exported (Daily Aggregation):**
- Date
- Total Calls
- Completed Calls
- Failed Calls
- Total Duration (minutes)
- Total Cost USD
- LLM Cost USD
- STT Cost USD
- TTS Cost USD
- Avg Call Duration (seconds)

#### Implementation Pattern

```python
import csv
from io import StringIO
from flask import Response, stream_with_context

def generate_csv(rows, fieldnames):
    """
    Generator function for streaming CSV.

    Args:
        rows: Iterable of dict rows
        fieldnames: List of CSV column names

    Yields:
        CSV rows as strings
    """
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasep='')

    # Write header
    writer.writeheader()
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate(0)

    # Write rows in batches
    for row in rows:
        writer.writerow(row)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

@app.route('/api/user/export/calls', methods=['GET'])
@auth_required
def export_calls():
    user = get_user_from_context()

    # Parse filters
    start_date = request.args.get('start_date', (datetime.utcnow() - timedelta(days=30)).isoformat())
    end_date = request.args.get('end_date', datetime.utcnow().isoformat())
    agent_id = request.args.get('agent_id')
    status = request.args.get('status')

    # Query with pagination (stream in batches)
    query = CallLog.query.filter_by(user_id=user.id)
    query = query.filter(CallLog.start_time >= start_date)
    query = query.filter(CallLog.start_time <= end_date)

    if agent_id:
        query = query.filter_by(agent_config_id=agent_id)
    if status:
        query = query.filter_by(status=status)

    query = query.order_by(CallLog.start_time.desc())

    # Generator function for rows
    def row_generator():
        for call in query.yield_per(100):  # Batch size 100
            yield {
                'call_id': call.id,
                'start_time': call.start_time.isoformat() if call.start_time else '',
                'end_time': call.end_time.isoformat() if call.end_time else '',
                'duration_seconds': call.duration or 0,
                'agent_name': call.agent_config.name if call.agent_config else '',
                'phone_number': mask_phone_number(call.phone_number),
                'direction': call.direction or 'inbound',
                'status': call.status or 'unknown',
                'total_cost_usd': round(call.total_cost or 0, 4),
                'llm_cost_usd': round(call.llm_cost or 0, 4),
                'stt_cost_usd': round(call.stt_cost or 0, 4),
                'tts_cost_usd': round(call.tts_cost or 0, 4),
                'has_transcript': 'yes' if call.transcript else 'no'
            }

    fieldnames = [
        'call_id', 'start_time', 'end_time', 'duration_seconds',
        'agent_name', 'phone_number', 'direction', 'status',
        'total_cost_usd', 'llm_cost_usd', 'stt_cost_usd', 'tts_cost_usd',
        'has_transcript'
    ]

    filename = f"calls_{user.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        stream_with_context(generate_csv(row_generator(), fieldnames)),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename={filename}',
            'Cache-Control': 'no-cache'
        }
    )

def mask_phone_number(phone: str) -> str:
    """Mask middle digits of phone number for privacy."""
    if not phone or len(phone) < 8:
        return phone
    return f"{phone[:3]}***{phone[-4:]}"
```

#### Security & Performance

**Rate Limiting:**
```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: get_user_from_context().id
)

@app.route('/api/user/export/calls')
@limiter.limit("10/hour")  # 10 exports per hour per user
def export_calls():
    ...
```

**Audit Logging:**
```python
class ExportLog(db.Model):
    id = db.Column(db.String, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    export_type = db.Column(db.String, nullable=False)  # calls|agents|phone_numbers|analytics
    filters = db.Column(db.JSON)  # Store filter parameters
    row_count = db.Column(db.Integer)
    file_size_bytes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String)
    user_agent = db.Column(db.String)

def log_export(user_id, export_type, filters, row_count, file_size):
    """Log export operation for audit trail."""
    log = ExportLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        export_type=export_type,
        filters=filters,
        row_count=row_count,
        file_size_bytes=file_size,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    db.session.add(log)
    db.session.commit()
```

### Frontend (Next.js + TypeScript)

#### Export Configuration Modal

```typescript
// frontend/components/export/ExportModal.tsx
import { Modal, Button, DatePicker, Select } from "@heroui/react";
import { useState } from "react";
import { api } from "@/lib/api-client";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: "calls" | "agents" | "phone-numbers" | "analytics";
}

export function ExportModal({ isOpen, onClose, exportType }: ExportModalProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [agentId, setAgentId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate.toISOString());
      if (endDate) params.append("end_date", endDate.toISOString());
      if (agentId) params.append("agent_id", agentId);
      if (status) params.append("status", status);

      // Fetch CSV as blob
      const response = await fetch(
        `/api/user/export/${exportType}?${params.toString()}`,
        {
          headers: {
            "X-User-Email": localStorage.getItem("user_email") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers
        .get("Content-Disposition")
        ?.split("filename=")[1] || `export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      // Show error toast
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header>Export {exportType}</Modal.Header>
      <Modal.Body>
        {exportType === "calls" && (
          <>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
            />
            <Select
              label="Agent (Optional)"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              {/* Agent options */}
            </Select>
            <Select
              label="Status (Optional)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </>
        )}

        {exportType === "analytics" && (
          <Select
            label="Period"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </Select>
        )}

        <p className="text-sm text-muted-foreground">
          Export will include all data within selected filters. Large exports may take a few moments.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="flat" onPress={onClose}>
          Cancel
        </Button>
        <Button
          color="primary"
          onPress={handleExport}
          isLoading={isExporting}
        >
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
```

#### Export Buttons Integration

**Calls Page:**
```typescript
// frontend/app/dashboard/calls/page.tsx
import { ExportModal } from "@/components/export/ExportModal";

export default function CallsPage() {
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1>Call History</h1>
        <Button
          color="primary"
          variant="flat"
          startContent={<DownloadIcon />}
          onPress={() => setShowExportModal(true)}
        >
          Export CSV
        </Button>
      </div>

      {/* Call logs table */}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="calls"
      />
    </>
  );
}
```

**Agents Page:**
```typescript
// frontend/app/dashboard/agents/page.tsx
<Button
  startContent={<DownloadIcon />}
  onPress={() => setShowExportModal(true)}
>
  Export Agents
</Button>
```

**Phone Numbers Page:**
```typescript
// frontend/app/dashboard/phone-numbers/page.tsx
<Button
  startContent={<DownloadIcon />}
  onPress={() => setShowExportModal(true)}
>
  Export Numbers
</Button>
```

**Analytics Page:**
```typescript
// frontend/app/dashboard/analytics/page.tsx
<Button
  startContent={<DownloadIcon />}
  onPress={() => setShowExportModal(true)}
>
  Export Analytics
</Button>
```

## File Naming Convention

```
Pattern: {entity}_{user_id}_{timestamp}.csv

Examples:
- calls_usr_abc123_20251030_143022.csv
- agents_usr_abc123_20251030_143045.csv
- phone_numbers_usr_abc123_20251030_143102.csv
- analytics_usr_abc123_20251030_143125.csv
```

## CSV Format Specification

**Encoding:** UTF-8 with BOM for Excel compatibility
**Line Endings:** CRLF (\r\n) for Windows/Excel compatibility
**Delimiter:** Comma (,)
**Quote Character:** Double quote (")
**Escaping:** Double quotes escaped as ""

**Example Output:**
```csv
call_id,start_time,end_time,duration_seconds,agent_name,phone_number,direction,status,total_cost_usd,llm_cost_usd,stt_cost_usd,tts_cost_usd,has_transcript
call_abc123,2025-10-30T14:23:15Z,2025-10-30T14:25:30Z,135,Sales Agent,+1***9426,inbound,completed,0.0245,0.0120,0.0075,0.0050,yes
call_def456,2025-10-30T13:45:22Z,2025-10-30T13:46:10Z,48,Support Agent,+1***9267,outbound,completed,0.0089,0.0045,0.0024,0.0020,yes
```

## Error Handling

**Backend Errors:**
```python
@app.errorhandler(Exception)
def handle_export_error(error):
    if 'export' in request.path:
        return jsonify({
            'success': False,
            'error': 'EXPORT_FAILED',
            'message': 'Failed to generate export. Please try again.'
        }), 500
```

**Frontend Error Handling:**
```typescript
try {
  const response = await fetch(...);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Export failed');
  }
} catch (error) {
  toast.error(`Export failed: ${error.message}`);
}
```

## Testing Requirements

**Backend Tests:**
```python
# test_exports.py
def test_export_calls_csv_format():
    """Test calls export returns valid CSV."""
    response = client.get('/api/user/export/calls', headers=auth_headers)
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'text/csv'

    csv_content = response.data.decode('utf-8')
    reader = csv.DictReader(StringIO(csv_content))
    rows = list(reader)
    assert len(rows) > 0
    assert 'call_id' in rows[0]
    assert 'total_cost_usd' in rows[0]

def test_export_calls_date_filtering():
    """Test calls export respects date filters."""
    start = '2025-10-01T00:00:00Z'
    end = '2025-10-31T23:59:59Z'
    response = client.get(
        f'/api/user/export/calls?start_date={start}&end_date={end}',
        headers=auth_headers
    )
    assert response.status_code == 200

def test_export_rate_limiting():
    """Test export endpoint rate limiting."""
    for i in range(11):
        response = client.get('/api/user/export/calls', headers=auth_headers)
        if i < 10:
            assert response.status_code == 200
        else:
            assert response.status_code == 429  # Too Many Requests

def test_export_multi_tenant_isolation():
    """Test user can only export their own data."""
    user1_response = client.get('/api/user/export/calls', headers=user1_headers)
    user2_response = client.get('/api/user/export/calls', headers=user2_headers)

    user1_csv = user1_response.data.decode('utf-8')
    user2_csv = user2_response.data.decode('utf-8')

    assert user1_csv != user2_csv  # Different users get different data
```

**Frontend Tests:**
```typescript
// ExportModal.test.tsx
describe('ExportModal', () => {
  it('should download CSV on export', async () => {
    const { getByText } = render(
      <ExportModal isOpen={true} onClose={jest.fn()} exportType="calls" />
    );

    const exportButton = getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user/export/calls'),
        expect.any(Object)
      );
    });
  });

  it('should handle export errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <ExportModal isOpen={true} onClose={jest.fn()} exportType="calls" />
    );

    const exportButton = getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });
  });
});
```

## Implementation Phases

**Phase 1: Backend Foundation**
- [ ] Implement `generate_csv()` streaming function
- [ ] Create `/api/user/export/calls` endpoint
- [ ] Add rate limiting to export endpoints
- [ ] Implement audit logging with ExportLog model
- [ ] Add phone number masking utility
- [ ] Write backend unit tests

**Phase 2: Additional Export Endpoints**
- [ ] Create `/api/user/export/agents` endpoint
- [ ] Create `/api/user/export/phone-numbers` endpoint
- [ ] Create `/api/user/export/analytics` endpoint
- [ ] Add comprehensive field mapping for each export type

**Phase 3: Frontend Components**
- [ ] Create `ExportModal.tsx` component
- [ ] Add export buttons to Calls page
- [ ] Add export buttons to Agents page
- [ ] Add export buttons to Phone Numbers page
- [ ] Add export buttons to Analytics page
- [ ] Implement download progress indicator

**Phase 4: Testing & Polish**
- [ ] Write frontend component tests
- [ ] Test large dataset exports (10k+ rows)
- [ ] Test Excel compatibility on Windows/Mac
- [ ] Verify multi-tenant isolation
- [ ] Load testing for concurrent exports
- [ ] Add export history view (optional)

## Performance Considerations

**Memory Efficiency:**
- Use `yield_per()` for streaming database queries (100 rows at a time)
- Stream CSV generation with `StringIO` buffer clearing
- Avoid loading entire dataset into memory

**Database Optimization:**
- Add index on `call_logs.start_time` for date range queries
- Add index on `call_logs.user_id, agent_config_id` for filtered exports
- Use `EXPLAIN ANALYZE` to verify query performance

**Network Optimization:**
- Compress CSV response with gzip (automatic via Flask)
- Set `Cache-Control: no-cache` to prevent stale downloads
- Use chunked transfer encoding for streaming

## Security Considerations

**Data Privacy:**
- Mask phone numbers in exports (show only first 3 and last 4 digits)
- Exclude sensitive fields (API keys, internal IDs)
- Audit log all export operations

**Access Control:**
- Require authentication for all export endpoints
- Enforce user_id filtering (multi-tenant isolation)
- Rate limit to prevent abuse (10 exports/hour/user)

**File Handling:**
- Generate unique filenames to prevent overwrites
- Use secure blob URLs with auto-revoke
- Never store exported CSV files on server

## Future Enhancements

1. **Export History Dashboard**
   - Show list of recent exports
   - Re-download previous exports (cache for 24h)
   - Export statistics (file size, row count)

2. **Scheduled Exports**
   - Daily/weekly/monthly automated exports
   - Email delivery of scheduled exports
   - Configurable export templates

3. **Advanced Filtering**
   - Multiple agent selection
   - Call duration ranges
   - Cost threshold filtering
   - Custom date ranges with presets

4. **Alternative Formats**
   - JSON export option
   - Excel (.xlsx) with formatting
   - PDF reports with charts

5. **Column Selection**
   - Allow users to choose which columns to include
   - Save column preferences per user
   - Reorder columns in export

## Success Metrics

- **Export Completion Rate**: >95% of exports succeed
- **Performance**: <5 seconds for 1000 rows, <30 seconds for 10,000 rows
- **User Adoption**: >50% of users use export feature monthly
- **Error Rate**: <1% of exports fail
- **Multi-tenant Isolation**: 0 data leakage incidents
