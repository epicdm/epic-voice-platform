# PostgreSQL Database Error Handling Analysis - Critical Findings

**Analysis Date**: 2025-10-31
**Scope**: Connection management, transaction handling, concurrent access, NULL handling, query edge cases
**Files Analyzed**: 5 core database operation files

---

## 🔴 CRITICAL - DATA_LOSS SEVERITY

### 1. Session Cleanup Leak in database.py

**File**: `/opt/livekit1/database.py`
**Lines**: 429-435
**Severity**: **DATA_LOSS**

```python
def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # ⚠️ NEVER CLOSES SESSION
```

**Edge Case**: Every call to `get_db()` creates a session that never closes, causing connection pool exhaustion.

**Scenario**:
1. User with 100 call logs exports CSV → `get_db()` called 100+ times
2. Connection pool (typically 5-20 connections) fills up
3. New API requests hang waiting for connections
4. **RESULT**: Application becomes unresponsive, data operations fail silently

**Impact**:
- Connection pool exhaustion
- Database deadlocks
- Failed transactions with no error reporting
- Memory leaks from unclosed sessions

**Suggested Fix**:
```python
def get_db():
    """Get database session with context manager."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Usage pattern:
# with get_db() as db:
#     # perform operations
```

---

### 2. Rollback Without Session Close in call_outcomes/service.py

**File**: `/opt/livekit1/backend/call_outcomes/service.py`
**Lines**: 134-143
**Severity**: **DATA_LOSS**

```python
except Exception as e:
    if should_close_db:
        db.rollback()  # ⚠️ Rollback but never close on error path
    logger.error(f"❌ Error processing event {event_id}: {e}", exc_info=True)
    return False, str(e)
finally:
    if should_close_db:
        db.close()  # ✅ Only closes on success path if exception in finally
```

**Edge Case**: If exception occurs in the `finally` block itself, session never closes.

**Scenario**:
1. Webhook event processing encounters database error
2. Rollback executes successfully
3. `finally` block tries to close but hits another error (network timeout, etc.)
4. Session remains open and locked
5. **RESULT**: Related call_log record stays locked, blocking subsequent updates

**Impact**:
- Locked database rows preventing updates
- Transaction deadlocks for same call_log_id
- Cascading failures for related campaign operations

**Suggested Fix**:
```python
try:
    # ... processing logic ...
except Exception as e:
    if should_close_db:
        try:
            db.rollback()
        except Exception as rb_error:
            logger.error(f"Rollback failed: {rb_error}")
        finally:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Session close failed: {close_error}")
    return False, str(e)
finally:
    if should_close_db:
        try:
            db.close()
        except Exception:
            pass  # Already logged above
```

---

### 3. Missing Transaction in campaign_engine.py Database Operations

**File**: `/opt/livekit1/campaign_engine.py`
**Lines**: 246-289, 291-319, 321-353
**Severity**: **CORRUPTION**

```python
def update_call_status(self, db, campaign_call_id: str, status: str, ...):
    # ⚠️ Multiple UPDATE statements without BEGIN/COMMIT wrapper
    db.execute(text(f"""
        UPDATE campaign_calls
        SET {', '.join(update_fields)}
        WHERE id = :campaign_call_id
    """), params)
    db.commit()  # Individual commit per method

def update_lead_status(self, db, lead_id: str, ...):
    # ⚠️ Separate commit - not atomic with update_call_status
    db.execute(text(f"""
        UPDATE leads
        SET {', '.join(update_fields)}
        WHERE id = :lead_id
    """), params)
    db.commit()  # Another individual commit

# Called sequentially in process_scheduled_call:
self.update_call_status(db, campaign_call_id, 'calling')
self.update_lead_status(db, lead_id, 'calling')
# ⚠️ If lead update fails, campaign_call is already committed
```

**Edge Case**: Partial state corruption when related updates fail mid-sequence.

**Scenario**:
1. Campaign call scheduled for lead "123"
2. `update_call_status()` succeeds, commits → campaign_call.status = 'calling'
3. `update_lead_status()` fails (constraint violation, network issue)
4. Campaign call shows "calling" but lead shows "new" (inconsistent state)
5. **RESULT**: Campaign metrics corrupted, leads not properly tracked

**Impact**:
- Data inconsistency between campaign_calls and leads tables
- Campaign completion check fails (wrong counts)
- Billing errors (calls marked complete but leads not updated)
- Impossible to retry failed calls (state mismatch)

**Suggested Fix**:
```python
def process_scheduled_call(self, call_data: tuple):
    db = SessionLocal()
    try:
        # Use explicit transaction for entire operation
        with db.begin():
            # All updates in single transaction
            self.update_call_status(db, campaign_call_id, 'calling', agent_id=agent_id)
            self.update_lead_status(db, lead_id, 'calling')
            result = await self.create_outbound_call(...)

            if result['success']:
                self.update_call_status(db, campaign_call_id, 'calling',
                                       call_log_id=result['call_id'])
            else:
                self.update_call_status(db, campaign_call_id, 'failed')
                self.update_lead_status(db, lead_id, 'failed')

            self.update_campaign_metrics(db, campaign_id)
            # Commit happens automatically if no exception
    except Exception as e:
        # Rollback happens automatically
        logger.error(f"Call processing failed: {e}")
    finally:
        db.close()
```

---

## 🟡 CORRUPTION SEVERITY

### 4. Race Condition in balance_service.py Credit Reservation

**File**: `/opt/livekit1/backend/cost_tracking/balance_service.py`
**Lines**: 113-167
**Severity**: **CORRUPTION**

```python
def reserve_credits(self, user_id: str, amount: Decimal, ...):
    balance = self.get_or_create_balance(user_id)

    # ⚠️ CHECK-THEN-ACT RACE CONDITION
    available = balance.currentBalance - balance.reservedBalance  # READ
    if available < amount:
        return False, "Insufficient balance"

    # ⚠️ Time gap here - another request could reserve credits
    balance.reservedBalance += amount  # WRITE
    self.db.commit()
```

**Edge Case**: Two concurrent calls for same user can both pass balance check but overdraw account.

**Scenario** (Time-based race):
```
Time  Thread A (Call 1)              Thread B (Call 2)              Balance State
----  -------------------------      -------------------------      --------------
T0    READ balance = $10, reserved = $0, available = $10           current=$10, reserved=$0
T1    Check: $10 >= $8 ✅                                           current=$10, reserved=$0
T2                                   READ balance = $10, reserved = $0   current=$10, reserved=$0
T3                                   Check: $10 >= $8 ✅                  current=$10, reserved=$0
T4    WRITE reserved = $8                                          current=$10, reserved=$8
T5    COMMIT                                                       current=$10, reserved=$8
T6                                   WRITE reserved = $8 + $8 = $16     current=$10, reserved=$16
T7                                   COMMIT                             current=$10, reserved=$16
T8    [Both calls approved]                                        ⚠️ OVERDRAFT: available = -$6
```

**Impact**:
- User can make calls with insufficient balance
- Negative available balance (current < reserved)
- Lost revenue from unbilled usage
- Billing disputes

**Suggested Fix**:
```python
def reserve_credits(self, user_id: str, amount: Decimal, ...):
    try:
        # Use SELECT FOR UPDATE to lock row
        balance = self.db.query(CustomerBalance).filter(
            CustomerBalance.userId == user_id
        ).with_for_update().first()

        if not balance:
            balance = self._create_balance_locked(user_id)

        available = balance.currentBalance - balance.reservedBalance
        if available < amount:
            return False, f"Insufficient balance: ${available:.4f}"

        # Atomic update
        balance.reservedBalance += amount
        balance.updatedAt = datetime.utcnow()

        transaction = CreditTransaction(...)
        self.db.add(transaction)
        self.db.commit()

        return True, None
    except Exception as e:
        self.db.rollback()
        return False, str(e)
```

---

### 5. Dirty Read in charge_credits Balance Calculation

**File**: `/opt/livekit1/backend/cost_tracking/balance_service.py`
**Lines**: 169-316
**Severity**: **CORRUPTION**

```python
def charge_credits(self, user_id: str, actual_amount: Decimal, ...):
    # ⚠️ NO LOCKING - Concurrent reads can see partial updates
    balance = self.db.query(CustomerBalance).filter(
        CustomerBalance.userId == user_id
    ).first()

    balance_before = balance.currentBalance  # READ
    difference = actual_amount - reserved_amount

    if difference > 0:
        # ⚠️ Another transaction could modify balance here
        available = balance.currentBalance - balance.reservedBalance
        if available < difference:
            # Charge only reserved amount
            balance.currentBalance -= reserved_amount
```

**Edge Case**: Concurrent charge operations can cause double-charging or under-charging.

**Scenario**:
1. User has $100, reserved $30 (available = $70)
2. Call A ends: actual cost $35, needs $5 additional
3. Call B ends simultaneously: actual cost $32, needs $2 additional
4. Both read available = $70 (before either writes)
5. Both believe they have enough and charge additional
6. **RESULT**: Both charge, but only $7 total should be available → overdraft

**Impact**:
- Incorrect billing amounts
- Balance calculation errors
- Transaction log inconsistencies
- Audit trail failures

**Suggested Fix**:
```python
def charge_credits(self, user_id: str, actual_amount: Decimal, ...):
    try:
        # Lock balance row for update
        balance = self.db.query(CustomerBalance).filter(
            CustomerBalance.userId == user_id
        ).with_for_update().first()

        if not balance:
            return False, "Balance account not found"

        balance_before = balance.currentBalance
        difference = actual_amount - reserved_amount

        # All calculations now safe from concurrent modifications
        # ... rest of logic ...

        self.db.commit()
        return True, None
    except Exception as e:
        self.db.rollback()
        return False, str(e)
```

---

### 6. Missing NULL Checks in exports/routes.py

**File**: `/opt/livekit1/backend/exports/routes.py`
**Lines**: 210-227, 315-334
**Severity**: **MINOR** (but causes crashes)

```python
def format_call_row(call: EnhancedCallLog) -> dict:
    return {
        'duration': sanitize_csv_field(call.duration),  # ⚠️ No NULL check
        'startedAt': format_datetime(call.startedAt),
        'endedAt': format_datetime(call.endedAt),  # ⚠️ NULL if call active
        'metadata': format_json_field(call.call_metadata),  # ⚠️ Can be NULL
    }

def format_datetime(dt):
    """Convert datetime to ISO format"""
    return dt.isoformat() if dt else None  # ✅ Handles NULL

def sanitize_csv_field(value):
    """Sanitize CSV field"""
    if value is None:
        return ''  # ✅ Handles NULL
    return str(value).replace('"', '""')
```

**Edge Case**: Active calls have NULL endedAt, which crashes CSV generation if format_datetime not used consistently.

**Scenario**:
1. User exports calls while 5 calls are active (status='active')
2. Active calls have endedAt=NULL
3. CSV formatter calls `format_datetime(call.endedAt)` → Returns None
4. CSV writer expects string → TypeError or empty value
5. **RESULT**: Export fails or produces malformed CSV

**Impact**:
- Export failures for active calls
- Incomplete data exports
- User frustration

**Suggested Fix**:
```python
def format_call_row(call: EnhancedCallLog) -> dict:
    return {
        'id': sanitize_csv_field(call.id),
        'duration': sanitize_csv_field(call.duration or 0),  # Default to 0
        'startedAt': format_datetime(call.startedAt) or '',
        'endedAt': format_datetime(call.endedAt) or 'ACTIVE',  # Explicit marker
        'status': sanitize_csv_field(call.status),
        'outcome': sanitize_csv_field(call.outcome or 'pending'),
        'metadata': format_json_field(call.call_metadata or {}),
        'cost': sanitize_csv_field(call.cost or '0.00'),
    }
```

---

## 🟢 PERFORMANCE SEVERITY

### 7. N+1 Query Problem in exports/routes.py

**File**: `/opt/livekit1/backend/exports/routes.py`
**Lines**: 162-253
**Severity**: **PERFORMANCE**

```python
@exports_bp.route('/calls', methods=['GET'])
def export_calls(user_id: str):
    # ⚠️ Query without eager loading relationships
    query = db.query(EnhancedCallLog).filter(EnhancedCallLog.userId == user_id)

    # Streaming happens row by row
    def generate():
        for chunk in csv_streamer.stream_query_to_csv(query, headers, format_call_row):
            yield chunk

    # When format_call_row accesses call.agent or call.user:
    # ⚠️ Triggers separate query for EACH row (N+1 problem)
```

**Edge Case**: Large exports (1000+ calls) trigger thousands of individual queries.

**Scenario**:
1. User exports 1000 calls
2. Each call triggers 2 additional queries (agent, user) when accessing relationships
3. Total queries = 1 + (1000 × 2) = 2001 queries
4. At 10ms per query = 20 seconds database time
5. **RESULT**: Slow exports, high database load

**Impact**:
- Slow export performance (20-60 seconds for large datasets)
- Database connection exhaustion
- Increased server costs

**Suggested Fix**:
```python
@exports_bp.route('/calls', methods=['GET'])
def export_calls(user_id: str):
    from sqlalchemy.orm import joinedload

    # Eager load relationships to avoid N+1
    query = db.query(EnhancedCallLog).options(
        joinedload(EnhancedCallLog.agent),
        joinedload(EnhancedCallLog.user)
    ).filter(EnhancedCallLog.userId == user_id)

    # Now format_call_row can access relationships without additional queries
```

---

### 8. Unbounded Query in get_scheduled_calls

**File**: `/opt/livekit1/campaign_engine.py`
**Lines**: 212-244
**Severity**: **PERFORMANCE**

```python
def get_scheduled_calls(self, db) -> list:
    result = db.execute(text("""
        SELECT ...
        FROM campaign_calls cc
        JOIN leads l ON cc.lead_id = l.id
        JOIN campaigns c ON cc.campaign_id = c.id
        WHERE cc.status = 'scheduled'
          AND cc.scheduled_for <= :now
          AND c.status IN ('scheduled', 'running')
        ORDER BY cc.scheduled_for ASC
        LIMIT :limit  # ✅ Has LIMIT
    """), {
        'now': datetime.now(timezone.utc),
        'limit': self.max_concurrent_calls  # Default: 5
    })

    # ⚠️ But what if scheduled_for has 10,000 rows with same timestamp?
    # PostgreSQL still scans all matching rows before applying LIMIT
```

**Edge Case**: Campaign scheduling all 10,000 leads at same time (00:00:00) causes full table scan.

**Scenario**:
1. Admin schedules campaign with 10,000 leads at midnight
2. All have `scheduled_for = '2025-10-31 00:00:00'`
3. Query matches all 10,000 rows
4. PostgreSQL sorts all 10,000 rows by timestamp (all equal)
5. Then applies LIMIT 5
6. **RESULT**: Query scans 10,000 rows but returns 5, causing timeout

**Impact**:
- Query timeouts during high-volume campaigns
- Campaign engine stalls
- Calls not dispatched on time
- Poor user experience

**Suggested Fix**:
```python
def get_scheduled_calls(self, db) -> list:
    result = db.execute(text("""
        SELECT ...
        FROM campaign_calls cc
        JOIN leads l ON cc.lead_id = l.id
        JOIN campaigns c ON cc.campaign_id = c.id
        WHERE cc.status = 'scheduled'
          AND cc.scheduled_for <= :now
          AND c.status IN ('scheduled', 'running')
        ORDER BY cc.scheduled_for ASC, cc.id ASC  -- Secondary sort by ID
        LIMIT :limit
        -- Add index: CREATE INDEX idx_campaign_calls_scheduled
        --   ON campaign_calls(status, scheduled_for, id)
        --   WHERE status = 'scheduled';
    """), {
        'now': datetime.now(timezone.utc),
        'limit': self.max_concurrent_calls
    })
```

---

### 9. Missing Transaction Timeout in Long-Running Exports

**File**: `/opt/livekit1/backend/exports/routes.py`
**Lines**: 229-253
**Severity**: **PERFORMANCE**

```python
def generate():
    for chunk in csv_streamer.stream_query_to_csv(query, headers, format_call_row):
        yield chunk
    db.close()  # ⚠️ No timeout, connection held for entire stream duration
```

**Edge Case**: Large export (100,000 rows) holds database connection for 10+ minutes.

**Scenario**:
1. User exports 100,000 call logs
2. Streaming takes 10 minutes (network slow, large data)
3. Database connection held open entire time
4. Other users' requests wait for available connections
5. **RESULT**: Connection pool starvation, API becomes unresponsive

**Impact**:
- Connection pool exhaustion
- Blocked user requests
- Application hangs

**Suggested Fix**:
```python
@exports_bp.route('/calls', methods=['GET'])
def export_calls(user_id: str):
    db = SessionLocal()

    # Set statement timeout for long queries
    db.execute(text("SET statement_timeout = '30s'"))  # 30-second limit

    try:
        query = db.query(EnhancedCallLog).filter(...)

        def generate():
            try:
                # Process in batches, releasing connection between batches
                batch_size = 1000
                offset = 0

                while True:
                    batch_query = query.limit(batch_size).offset(offset)
                    batch_results = batch_query.all()

                    if not batch_results:
                        break

                    # Generate CSV chunk
                    for chunk in csv_streamer.batch_to_csv(batch_results, headers, format_call_row):
                        yield chunk

                    offset += batch_size
                    db.commit()  # Release locks between batches
            finally:
                db.close()

        return Response(generate(), mimetype='text/csv', ...)
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 500
```

---

## 🔵 MINOR SEVERITY

### 10. Inconsistent Error Handling in pricing_service.py

**File**: `/opt/livekit1/backend/cost_tracking/pricing_service.py`
**Lines**: 42-65
**Severity**: **MINOR**

```python
def _get_pricing_config(self) -> PricingConfig:
    if self._config:
        return self._config

    if self.user_id:
        config = self.db.query(PricingConfig).filter(
            PricingConfig.userId == self.user_id
        ).first()  # ⚠️ No error handling if query fails
        if config:
            self._config = config
            return config

    config = self.db.query(PricingConfig).filter(
        PricingConfig.configName == 'system_default'
    ).first()

    if not config:
        raise ValueError("System default pricing config not found")
        # ⚠️ What if query timed out? ValueError is misleading

    self._config = config
    return config
```

**Edge Case**: Database timeout returns None, but error message says "not found" instead of "timeout".

**Impact**:
- Confusing error messages
- Difficult debugging
- Misleading logs

**Suggested Fix**:
```python
def _get_pricing_config(self) -> PricingConfig:
    try:
        if self._config:
            return self._config

        if self.user_id:
            config = self.db.query(PricingConfig).filter(
                PricingConfig.userId == self.user_id
            ).first()
            if config:
                self._config = config
                return config

        config = self.db.query(PricingConfig).filter(
            PricingConfig.configName == 'system_default'
        ).first()

        if not config:
            raise ValueError(
                "System default pricing config not found in database. "
                "Run migration to create default config."
            )

        self._config = config
        return config

    except sqlalchemy.exc.OperationalError as e:
        raise RuntimeError(f"Database connection error: {e}") from e
    except sqlalchemy.exc.TimeoutError as e:
        raise RuntimeError(f"Database query timeout: {e}") from e
```

---

## Summary Table

| # | File | Lines | Severity | Issue | Data Integrity Impact |
|---|------|-------|----------|-------|----------------------|
| 1 | database.py | 429-435 | **DATA_LOSS** | Session never closes | Connection exhaustion, silent failures |
| 2 | call_outcomes/service.py | 134-143 | **DATA_LOSS** | Rollback without close on error | Row locks, deadlocks |
| 3 | campaign_engine.py | 246-353 | **CORRUPTION** | Missing transaction wrapper | Inconsistent campaign/lead state |
| 4 | balance_service.py | 113-167 | **CORRUPTION** | Race condition in reserve_credits | Overdraft, lost revenue |
| 5 | balance_service.py | 169-316 | **CORRUPTION** | Dirty read in charge_credits | Double-charging, balance errors |
| 6 | exports/routes.py | 210-227 | **MINOR** | Missing NULL checks | Export failures for active calls |
| 7 | exports/routes.py | 162-253 | **PERFORMANCE** | N+1 query problem | Slow exports, high DB load |
| 8 | campaign_engine.py | 212-244 | **PERFORMANCE** | Unbounded query scan | Query timeouts, stalled campaigns |
| 9 | exports/routes.py | 229-253 | **PERFORMANCE** | No transaction timeout | Connection pool exhaustion |
| 10 | pricing_service.py | 42-65 | **MINOR** | Inconsistent error handling | Confusing error messages |

---

## Recommended Immediate Actions

### Priority 1 (Fix This Week)
1. **Fix `get_db()` session leak** → Add proper context manager
2. **Add transaction wrapper to campaign operations** → Use `with db.begin()`
3. **Implement row locking in balance operations** → Add `with_for_update()`

### Priority 2 (Fix This Month)
4. Add eager loading to export queries → Fix N+1 problem
5. Add statement timeouts to long-running queries
6. Improve error handling with specific exception types

### Priority 3 (Technical Debt)
7. Add database connection pool monitoring
8. Implement circuit breakers for database operations
9. Add retry logic with exponential backoff
10. Create comprehensive database operation test suite

---

## Testing Recommendations

### Concurrency Testing
```python
# Test race condition in balance reservation
import concurrent.futures

def test_concurrent_reservations():
    user_id = "test-user"
    balance_service.add_credits(user_id, Decimal('10.00'))

    def reserve_call():
        return balance_service.reserve_credits(user_id, Decimal('8.00'))

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(reserve_call) for _ in range(2)]
        results = [f.result() for f in futures]

    # Expected: One succeeds, one fails (insufficient balance)
    assert sum(r[0] for r in results) == 1

    # Verify final balance
    balance = balance_service.get_balance_summary(user_id)
    assert balance['reserved_balance'] == 8.00  # Not 16.00!
```

### Transaction Testing
```python
def test_campaign_call_atomic_update():
    """Verify campaign_call and lead updates are atomic"""
    # Setup
    campaign_call_id = create_test_campaign_call()
    lead_id = get_lead_for_campaign_call(campaign_call_id)

    # Simulate failure during lead update
    with patch('campaign_engine.CampaignEngine.update_lead_status',
               side_effect=Exception("Database error")):
        try:
            engine.process_scheduled_call(campaign_call_data)
        except Exception:
            pass

    # Verify: Both campaign_call and lead should be unchanged (rollback)
    call_status = get_campaign_call_status(campaign_call_id)
    lead_status = get_lead_status(lead_id)

    assert call_status == 'scheduled'  # Not 'calling'
    assert lead_status == 'new'  # Not 'calling'
```

---

**Generated**: 2025-10-31
**Analyst**: Root Cause Analyst Agent
**Confidence**: High (based on code review and common database antipatterns)
