# Odoo CRM Integration - Contact Sync

One-way contact sync from Odoo CRM to Epic Voice Platform.

## Overview

This integration pulls contacts from Odoo CRM and imports them into the Epic Voice leads database, enabling users to:
- Import existing CRM contacts automatically
- Sync contacts on-demand or scheduled
- Maintain Odoo metadata for future two-way sync
- Track sync history and status

## Architecture

### Components

1. **Odoo Client** (`integrations/odoo_client.py`)
   - XML-RPC API connection to Odoo
   - Contact fetching with pagination
   - Phone number normalization
   - Support for Odoo 13+ (API key or password auth)

2. **Sync Service** (`integrations/odoo_sync.py`)
   - Batch contact processing
   - Duplicate detection via phone number
   - Metadata preservation (Odoo ID, timestamps)
   - Sync status tracking

3. **API Endpoints** (`odoo_api_endpoints.py`)
   - Configuration management
   - Connection testing
   - Sync triggering and status monitoring

### Data Flow

```
┌─────────────────┐
│   Odoo CRM      │
│ (res.partner)   │
└────────┬────────┘
         │ XML-RPC API
         │
         ▼
┌─────────────────┐
│  Odoo Client    │
│ (fetch contacts)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync Service   │
│ (map + upsert)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  leads table    │
│ (Epic Voice DB) │
└─────────────────┘
```

## Configuration

### Database Schema

**crm_connections** table stores Odoo credentials:

| Column | Type | Description |
|--------|------|-------------|
| user_id | text | Epic Voice user ID |
| provider | varchar(50) | "odoo" |
| access_token | text | Odoo API key |
| settings | jsonb | URL, database, username, etc. |
| active | boolean | Connection active status |
| last_synced_at | timestamp | Last successful sync |

**Example settings JSON:**
```json
{
  "odoo_url": "https://mycompany.odoo.com",
  "odoo_database": "mycompany_prod",
  "odoo_username": "integration@company.com",
  "odoo_password": "optional_if_using_api_key"
}
```

### Odoo Contact Mapping

| Odoo Field (res.partner) | Epic Voice Field (leads) | Notes |
|--------------------------|--------------------------|-------|
| id | metadata.odoo_id | Preserved for future sync |
| name | first_name + last_name | Split on first space |
| phone / mobile | phone_number | Normalized to E.164 |
| email | email | Direct mapping |
| company_name | company | Direct mapping |
| comment | metadata.odoo_comment | Notes field |
| create_date | metadata.odoo_created_at | Timestamp |
| write_date | metadata.odoo_updated_at | Timestamp |

### Contact Upsert Logic

- **Match by**: `user_id` + `phone_number`
- **If exists**: Update fields only if current value is NULL (preserves local changes)
- **If new**: Create lead with `source = 'odoo'` and `status = 'new'`
- **Metadata**: Always merged with existing metadata (never overwrites)

## API Endpoints

### 1. Test Connection

**POST** `/api/odoo/test-connection`

Test Odoo credentials before saving.

**Request Body:**
```json
{
  "odoo_url": "https://mycompany.odoo.com",
  "odoo_database": "mycompany_prod",
  "odoo_username": "integration@company.com",
  "odoo_api_key": "your_api_key_here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "contact_count": 150,
  "message": "Connection successful! Found 150 contacts."
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Authentication failed. Please check your credentials."
}
```

### 2. Save Configuration

**POST** `/api/odoo/config`

Save Odoo connection settings.

**Request Body:**
```json
{
  "odoo_url": "https://mycompany.odoo.com",
  "odoo_database": "mycompany_prod",
  "odoo_username": "integration@company.com",
  "odoo_api_key": "your_api_key_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

### 3. Get Configuration

**GET** `/api/odoo/config`

Retrieve current Odoo configuration (without sensitive fields).

**Response:**
```json
{
  "configured": true,
  "active": true,
  "odoo_url": "https://mycompany.odoo.com",
  "odoo_database": "mycompany_prod",
  "odoo_username": "integration@company.com",
  "has_api_key": true,
  "has_password": false,
  "last_synced_at": "2025-10-30T12:00:00"
}
```

### 4. Trigger Sync

**POST** `/api/odoo/sync`

Start background contact sync job.

**Request Body (Optional):**
```json
{
  "batch_size": 100,
  "max_contacts": null
}
```

**Response:**
```json
{
  "success": true,
  "sync_id": "sync_user123_1730000000",
  "message": "Sync started in background"
}
```

### 5. Get Sync Status

**GET** `/api/odoo/sync/status`

Check status of current or last sync.

**Response (In Progress):**
```json
{
  "sync_id": "sync_user123_1730000000",
  "status": "in_progress",
  "started_at": "2025-10-30T12:00:00"
}
```

**Response (Completed):**
```json
{
  "sync_id": "sync_user123_1730000000",
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

## Usage Examples

### Testing Connection (cURL)

```bash
curl -X POST http://localhost:5001/api/odoo/test-connection \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{
    "odoo_url": "https://mycompany.odoo.com",
    "odoo_database": "mycompany_prod",
    "odoo_username": "integration@company.com",
    "odoo_api_key": "your_api_key_here"
  }'
```

### Saving Configuration

```bash
curl -X POST http://localhost:5001/api/odoo/config \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{
    "odoo_url": "https://mycompany.odoo.com",
    "odoo_database": "mycompany_prod",
    "odoo_username": "integration@company.com",
    "odoo_api_key": "your_api_key_here"
  }'
```

### Triggering Sync

```bash
curl -X POST http://localhost:5001/api/odoo/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your_session_cookie" \
  -d '{
    "batch_size": 50,
    "max_contacts": 100
  }'
```

### Checking Status

```bash
curl -X GET http://localhost:5001/api/odoo/sync/status \
  -H "Cookie: session=your_session_cookie"
```

## Odoo Setup

### 1. Create Integration User

In Odoo, create a dedicated user for the integration:

1. Go to **Settings** → **Users & Companies** → **Users**
2. Click **New**
3. Fill in:
   - **Name**: Epic Voice Integration
   - **Email**: integration@yourcompany.com
   - **Access Rights**: CRM / User: Own Documents Only (minimum)
4. Save

### 2. Generate API Key (Odoo 15+)

1. Edit the integration user
2. Go to **Account Security** tab
3. Click **New API Key**
4. Copy the generated key (save it securely!)

### 3. Alternative: Username/Password (Legacy)

For Odoo 14 or earlier:
- Use the integration user's username and password
- **Note**: API keys are more secure and recommended

### 4. Required Permissions

The integration user needs:
- **CRM** module access
- **Read** permission on `res.partner` (contacts)
- **Optional**: Read permission on `crm.lead` (opportunities) for future two-way sync

## Security Considerations

1. **API Key Storage**: API keys are stored in `crm_connections.access_token` (encrypted at DB level)
2. **Password Storage**: Passwords (if used) are stored in `crm_connections.settings` JSONB
3. **TLS Required**: Always use HTTPS URLs for Odoo connections
4. **Minimal Permissions**: Integration user should have read-only access
5. **Audit Logging**: All sync operations are logged with timestamps

## Troubleshooting

### Connection Fails

**Symptom**: Test connection returns authentication error

**Solutions**:
- Verify Odoo URL (must include https://)
- Check database name is correct
- Verify API key or password
- Ensure integration user has CRM access

### No Contacts Synced

**Symptom**: Sync completes but 0 contacts created

**Possible Causes**:
1. Contacts in Odoo have no phone numbers
2. Contacts marked as companies (`is_company = true`)
3. All phone numbers already exist in leads table

**Solutions**:
- Check Odoo contacts have `phone` or `mobile` fields filled
- Verify contact type is "Person" not "Company"
- Check leads table for existing entries with same phone numbers

### Duplicate Contacts

**Symptom**: Multiple leads created for same contact

**Explanation**: Leads are matched by `user_id` + `phone_number`. If phone numbers are formatted differently in Odoo, duplicates may occur.

**Solutions**:
- Standardize phone number format in Odoo (E.164: +1XXXXXXXXXX)
- Re-sync after cleaning up duplicates manually
- Use metadata.odoo_id to identify and merge duplicates

### Sync Takes Too Long

**Symptom**: Sync times out or takes hours

**Solutions**:
- Reduce `batch_size` (default: 100)
- Set `max_contacts` to sync in smaller chunks
- Schedule syncs during off-peak hours
- Optimize Odoo database indexes on res.partner

## Future Enhancements

- [ ] Two-way sync (Epic Voice → Odoo)
- [ ] Scheduled automatic syncs (cron jobs)
- [ ] Webhook notifications on sync completion
- [ ] Opportunity (crm.lead) sync
- [ ] Activity logging (call outcomes → Odoo)
- [ ] Custom field mapping configuration
- [ ] Incremental sync (only changed records)
- [ ] Multi-user sync support (admin triggers for all users)

## Support

For issues or questions:
- Check logs: `journalctl -u user-dashboard -f | grep odoo`
- Review sync status via API
- Contact Epic Voice support with sync_id for troubleshooting

## License

Proprietary - Epic Voice Platform
