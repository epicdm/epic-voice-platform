# Asterisk CDR Integration - Magnus Billing Call Detail Records

Automated Call Detail Record (CDR) ingestion from Magnus Billing/Asterisk to Epic Voice Platform.

## Overview

This integration pulls Call Detail Records from Magnus Billing (Asterisk-based telephony backend) and stores them in the Epic Voice database for:
- Historical call record archival
- Billing reconciliation
- Analytics and reporting
- Compliance and auditing

## Architecture

### Components

1. **CDR Client** (`integrations/cdr_client.py`)
   - Magnus Billing API connection
   - CDR fetching with filters and pagination
   - Disposition normalization

2. **Sync Service** (`integrations/cdr_sync.py`)
   - Incremental sync (only new CDRs since last sync)
   - Batch processing
   - Duplicate detection via uniqueid
   - Automatic scheduling capability

3. **API Endpoints** (`cdr_api_endpoints.py`)
   - Sync triggering and monitoring
   - CDR querying with filters
   - Statistics and reporting

### Data Flow

```
┌──────────────────┐
│ Magnus Billing   │
│ (Asterisk CDR)   │
│  pkg_cdr table   │
└────────┬─────────┘
         │ Magnus API
         │
         ▼
┌──────────────────┐
│   CDR Client     │
│ (fetch CDRs)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Sync Service   │
│ (map + upsert)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ asterisk_cdrs    │
│ (Epic Voice DB)  │
└──────────────────┘
```

## Database Schema

**asterisk_cdrs** table stores imported CDR records:

| Column | Type | Description |
|--------|------|-------------|
| id | text (UUID) | Primary key |
| user_id | text | Epic Voice user (FK to users) |
| uniqueid | varchar(255) | Asterisk call unique ID |
| accountcode | varchar(255) | Magnus account code |
| calldate | timestamp | Call start timestamp |
| src | varchar(80) | Source number (caller) |
| dst | varchar(80) | Destination number (called) |
| duration | integer | Total call duration (seconds) |
| billsec | integer | Billable duration (seconds) |
| disposition | varchar(45) | Asterisk disposition |
| outcome | varchar(50) | Normalized outcome |
| cost | decimal(10,4) | Call cost |
| raw_data | jsonb | Complete CDR from Magnus |
| synced_at | timestamp | Sync timestamp |

**Unique Constraint**: (user_id, uniqueid)

### CDR Field Mapping

| Asterisk/Magnus Field | Epic Voice Field | Notes |
|-----------------------|------------------|-------|
| uniqueid | uniqueid | Unique call identifier |
| accountcode | accountcode | Magnus user account |
| calldate | calldate | Call start time |
| src | src | Caller number |
| dst | dst | Called number |
| sessiontime/duration | duration | Total duration |
| sessionbill/billsec | billsec | Billable seconds |
| disposition | disposition | Raw disposition |
| - | outcome | Normalized (see below) |
| sessionprice/cost | cost | Call cost |

### Disposition Normalization

Asterisk dispositions are normalized to standard outcomes:

| Asterisk Disposition | Normalized Outcome |
|---------------------|-------------------|
| ANSWERED | completed |
| NO ANSWER | no_answer |
| BUSY | busy |
| FAILED | failed |
| CONGESTION | failed |

## API Endpoints

### 1. Trigger CDR Sync

**POST** `/api/cdr/sync`

Start background CDR sync job.

**Request Body (Optional):**
```json
{
  "start_date": "2025-10-20T00:00:00Z",
  "end_date": "2025-10-30T23:59:59Z",
  "batch_size": 100,
  "max_records": null
}
```

**Response:**
```json
{
  "success": true,
  "sync_id": "cdr_sync_user123_1730000000",
  "message": "CDR sync started in background"
}
```

### 2. Get Sync Status

**GET** `/api/cdr/sync/status`

Check status of current or last sync.

**Response (In Progress):**
```json
{
  "sync_id": "cdr_sync_user123_1730000000",
  "status": "in_progress",
  "started_at": "2025-10-30T12:00:00"
}
```

**Response (Completed):**
```json
{
  "sync_id": "cdr_sync_user123_1730000000",
  "status": "completed",
  "started_at": "2025-10-30T12:00:00",
  "completed_at": "2025-10-30T12:05:30",
  "results": {
    "total_fetched": 150,
    "created": 120,
    "updated": 25,
    "skipped": 5,
    "errors": 0,
    "error_details": []
  }
}
```

### 3. Query CDRs

**GET** `/api/cdr`

Query CDR records with filters.

**Query Parameters:**
- `limit`: Maximum records (default: 50, max: 500)
- `offset`: Records to skip (default: 0)
- `start_date`: Filter calldate >= start_date
- `end_date`: Filter calldate <= end_date
- `outcome`: Filter by outcome (completed, no_answer, busy, failed)
- `src`: Filter by source number
- `dst`: Filter by destination number

**Example:**
```
GET /api/cdr?start_date=2025-10-01&outcome=completed&limit=100
```

**Response:**
```json
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "cdrs": [
    {
      "id": "...",
      "uniqueid": "1730000000.123",
      "calldate": "2025-10-30T12:34:56",
      "src": "+17678189426",
      "dst": "+15551234567",
      "duration": 120,
      "billsec": 115,
      "disposition": "ANSWERED",
      "outcome": "completed",
      "cost": 0.50,
      "accountcode": "user123",
      "created_at": "2025-10-30T12:35:00"
    }
  ]
}
```

### 4. Get Single CDR

**GET** `/api/cdr/:id`

Retrieve single CDR by ID.

**Response:**
```json
{
  "id": "...",
  "uniqueid": "1730000000.123",
  "accountcode": "user123",
  "calldate": "2025-10-30T12:34:56",
  "src": "+17678189426",
  "dst": "+15551234567",
  "dcontext": "default",
  "clid": "\"John Doe\" <+17678189426>",
  "channel": "SIP/user123-00000001",
  "dstchannel": "SIP/carrier-00000002",
  "duration": 120,
  "billsec": 115,
  "disposition": "ANSWERED",
  "outcome": "completed",
  "cost": 0.50,
  "description": null,
  "magnus_cdr_id": "12345",
  "synced_at": "2025-10-30T12:35:00",
  "created_at": "2025-10-30T12:35:00",
  "updated_at": "2025-10-30T12:35:00"
}
```

### 5. Get CDR Statistics

**GET** `/api/cdr/stats`

Get aggregate CDR statistics.

**Query Parameters:**
- `start_date`: Filter start date
- `end_date`: Filter end date

**Response:**
```json
{
  "total_calls": 150,
  "total_duration": 45000,
  "total_cost": 12.50,
  "by_outcome": {
    "completed": 120,
    "no_answer": 20,
    "busy": 5,
    "failed": 5
  }
}
```

## Usage Examples

### Triggering Sync (cURL)

```bash
curl -X POST http://localhost:5001/api/cdr/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{
    "start_date": "2025-10-01T00:00:00Z",
    "end_date": "2025-10-30T23:59:59Z",
    "batch_size": 100
  }'
```

### Checking Status

```bash
curl -X GET http://localhost:5001/api/cdr/sync/status \
  -H "Cookie: session=your_session_cookie"
```

### Querying CDRs

```bash
curl -X GET "http://localhost:5001/api/cdr?start_date=2025-10-01&outcome=completed&limit=50" \
  -H "Cookie: session=your_session_cookie"
```

### Getting Statistics

```bash
curl -X GET "http://localhost:5001/api/cdr/stats?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Cookie: session=your_session_cookie"
```

## Configuration

### Environment Variables

CDR integration uses Magnus Billing credentials from environment:

```bash
MAGNUS_API_KEY='your_api_key_here'
MAGNUS_SECRET_KEY='your_secret_key_here'
MAGNUS_BASE_URL='https://voice.epic.dm'
```

These are configured server-side and not exposed to users.

## Sync Behavior

### Incremental Sync

- By default, sync starts from last successful sync timestamp
- Falls back to 24 hours ago if no previous sync exists
- Can override with explicit `start_date` parameter

### Duplicate Handling

- CDRs are matched by `(user_id, uniqueid)`
- If CDR exists, it's updated with latest data
- If CDR is new, it's inserted
- No duplicates are created

### User Mapping

Currently, all CDRs from Magnus are assigned to the requesting user. Future enhancement: map Magnus `accountcode` to Epic Voice `user_id` automatically.

## Scheduling

### Manual Sync

Users trigger sync manually via API endpoint.

### Automated Sync (Future)

Planned features:
- **Cron Jobs**: Daily automatic sync at specified time
- **Webhook Triggers**: Magnus Billing webhook on new CDR
- **Real-time Sync**: Event-driven CDR ingestion

## Performance

### Optimization Strategies

1. **Batch Processing**: Fetches 100 CDRs per API call (configurable)
2. **Pagination**: Handles large CDR volumes efficiently
3. **Indexing**: Database indexes on calldate, outcome, user_id
4. **Incremental Sync**: Only fetches new CDRs since last sync

### Expected Performance

- **Sync Speed**: ~500-1000 CDRs per minute
- **API Latency**: ~200ms per batch (network dependent)
- **Database Inserts**: ~1000 CDRs per second (PostgreSQL)

## Troubleshooting

### Sync Fails

**Symptom**: Sync status shows "failed"

**Solutions**:
1. Check Magnus Billing credentials in environment
2. Verify Magnus API is accessible
3. Check server logs: `journalctl -u user-dashboard -f | grep -i cdr`
4. Verify database connectivity

### No CDRs Synced

**Symptom**: Sync completes but 0 CDRs created

**Possible Causes**:
1. No CDRs in Magnus for specified date range
2. All CDRs already synced (check `synced_at` timestamps)
3. Magnus accountcode filter excludes all CDRs

**Solutions**:
- Verify CDRs exist in Magnus for date range
- Check last sync timestamp: `SELECT MAX(synced_at) FROM asterisk_cdrs`
- Remove accountcode filter if set

### Incorrect Outcomes

**Symptom**: CDR outcomes don't match expectations

**Explanation**: Outcomes are normalized from Asterisk dispositions. See disposition mapping table.

**Solutions**:
- Check raw `disposition` field in CDR
- Verify Magnus disposition values are standard
- Custom dispositions may need custom mapping logic

## Security Considerations

1. **API Keys**: Magnus credentials stored server-side only
2. **User Isolation**: CDRs scoped to requesting user_id
3. **Rate Limiting**: API endpoints respect global rate limits
4. **Audit Logging**: All sync operations logged with timestamps

## Future Enhancements

- [ ] Automatic user mapping (Magnus accountcode → Epic Voice user_id)
- [ ] Scheduled automatic syncs (cron jobs)
- [ ] Webhook-driven real-time CDR ingestion
- [ ] CDR export to CSV/Excel
- [ ] Advanced analytics and reporting
- [ ] Cost breakdown by campaign/agent
- [ ] Call quality metrics (MOS, jitter, packet loss)
- [ ] Multi-tenant Magnus support (different Magnus instances per user)

## Support

For issues or questions:
- Check sync status via API
- Review logs: `journalctl -u user-dashboard -f | grep cdr`
- Contact Epic Voice support with sync_id for troubleshooting

## License

Proprietary - Epic Voice Platform
