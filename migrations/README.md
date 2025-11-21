# Database Migrations

This directory contains database migrations for Phase 2 (CRM Integration) and beyond.

## Migration Files

### Phase 2: CRM Integration

1. **001_crm_connections.sql**
   - Purpose: OAuth connections to external CRMs
   - Tables: `crm_connections`
   - Features: Encrypted tokens, provider management, sync tracking

2. **002_webhook_events_queue.sql**
   - Purpose: Async webhook event processing
   - Tables: `webhook_events_queue`
   - Features: Event queue, retry logic, idempotency

3. **003_enhance_webhooks.sql**
   - Purpose: Enhance existing webhook infrastructure
   - Tables: Enhances `partner_webhooks`, `webhook_deliveries`
   - Features: Custom headers, retry config, delivery metrics

## Running Migrations

### Option 1: Manual Execution (PostgreSQL)

```bash
# Run all migrations in order
for file in /opt/livekit1/migrations/*.sql; do
  echo "Running $(basename $file)..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -f "$file"
done
```

### Option 2: Single Migration

```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -f /opt/livekit1/migrations/001_crm_connections.sql
```

### Option 3: Apply Specific Migration

```bash
# CRM connections only
psql -U postgres -d epic_voice_db -f migrations/001_crm_connections.sql

# Webhook queue only
psql -U postgres -d epic_voice_db -f migrations/002_webhook_events_queue.sql

# Webhook enhancements only
psql -U postgres -d epic_voice_db -f migrations/003_enhance_webhooks.sql
```

## Rollback

To rollback migrations, use the corresponding rollback files (if provided) or manually drop tables:

```sql
-- Rollback 001
DROP TABLE IF EXISTS crm_connections CASCADE;

-- Rollback 002
DROP TABLE IF EXISTS webhook_events_queue CASCADE;

-- Rollback 003
-- (Only column additions, manual ALTER TABLE DROP COLUMN if needed)
```

## Migration Status Check

```bash
# Check if tables exist
psql -U postgres -d epic_voice_db -c "\dt crm_connections"
psql -U postgres -d epic_voice_db -c "\dt webhook_events_queue"

# Check table schemas
psql -U postgres -d epic_voice_db -c "\d crm_connections"
psql -U postgres -d epic_voice_db -c "\d webhook_events_queue"
psql -U postgres -d epic_voice_db -c "\d partner_webhooks"
```

## Best Practices

1. **Always backup before migrating**:
   ```bash
   pg_dump -U postgres epic_voice_db > backup_$(date +%Y%m%d).sql
   ```

2. **Test in development first**: Never run migrations directly in production without testing

3. **Review migration**: Read each SQL file before executing

4. **Monitor after migration**: Check application logs for any issues

## Future Migrations

When adding new migrations:

1. Use sequential numbering: `00X_description.sql`
2. Include comments and table/column documentation
3. Add appropriate indexes
4. Include rollback instructions in this README
5. Test thoroughly before committing
