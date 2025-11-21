# CSV Export API - Integration Guide

## Quick Start

### 1. Register the Blueprint

Add the exports blueprint to your Flask application:

```python
# In your main Flask application file (e.g., user_dashboard.py, admin_dashboard.py)
from backend.exports.routes import exports_bp

app = Flask(__name__)

# Register the exports blueprint
app.register_blueprint(exports_bp)
```

### 2. Test the Integration

```bash
# Start your Flask application
python user_dashboard.py

# Test the health endpoint
curl http://localhost:5000/api/exports/health

# Expected response:
# {"status": "healthy", "endpoints": [...]}
```

### 3. Make Your First Export Request

```bash
# Export calls (requires authentication)
curl -H "X-User-Id: your-user-id" \
  "http://localhost:5000/api/exports/calls?start_date=2024-01-01" \
  -o calls_export.csv

# Export agents
curl -H "X-User-Id: your-user-id" \
  "http://localhost:5000/api/exports/agents" \
  -o agents_export.csv
```

## Integration Options

### Option 1: Function-Based Registration (Existing Pattern)

If your application uses `setup_*_endpoints(app)` pattern like `sip_api_endpoints.py`:

```python
# In backend/exports/setup.py (create this file)
from backend.exports.routes import exports_bp

def setup_exports_endpoints(app):
    """Register CSV export endpoints with the Flask app."""
    app.register_blueprint(exports_bp)
    print("✓ CSV export endpoints registered at /api/exports/*")

# In your main Flask app
from backend.exports.setup import setup_exports_endpoints

app = Flask(__name__)
setup_exports_endpoints(app)
```

### Option 2: Direct Blueprint Registration

If your application uses direct blueprint registration:

```python
from flask import Flask
from backend.exports.routes import exports_bp
from backend.agent_api import agent_api

app = Flask(__name__)

# Register all blueprints
app.register_blueprint(exports_bp)     # CSV exports at /api/exports/*
app.register_blueprint(agent_api)      # Agent API at /api/user/agents
```

## Authentication Integration

The exports module uses a placeholder authentication decorator. You need to integrate with your existing authentication system:

### Step 1: Identify Your Authentication Method

Check how your existing endpoints authenticate users:

```bash
# Example: Check existing agent API authentication
grep -A 10 "def create_agent" backend/agent_api.py
```

### Step 2: Update Authentication Decorator

Edit `/opt/livekit1/backend/exports/routes.py` and replace the `require_auth` decorator:

#### Example 1: Session-Based Authentication (Like user_dashboard.py)

```python
# In backend/exports/routes.py, replace require_auth with:
from flask import session

def require_auth(f: Callable) -> Callable:
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get user ID from session
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized - Please log in'}), 401

        user_id = session['user_id']
        return f(user_id, *args, **kwargs)
    return decorated_function
```

#### Example 2: Header-Based Authentication (Like agent_api.py)

```python
# In backend/exports/routes.py, replace require_auth with:
def require_auth(f: Callable) -> Callable:
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get user ID from X-User-Id header (for API clients)
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return jsonify({'error': 'Unauthorized - X-User-Id header required'}), 401

        # Optionally validate user exists in database
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return jsonify({'error': 'User not found'}), 404
        finally:
            db.close()

        return f(user_id, *args, **kwargs)
    return decorated_function
```

#### Example 3: JWT Token Authentication

```python
# In backend/exports/routes.py, replace require_auth with:
import jwt
from flask import request

def require_auth(f: Callable) -> Callable:
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get JWT token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized - Bearer token required'}), 401

        token = auth_header.replace('Bearer ', '')

        try:
            # Decode JWT token
            payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
            user_id = payload.get('user_id')

            if not user_id:
                return jsonify({'error': 'Invalid token'}), 401

            return f(user_id, *args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated_function
```

## Frontend Integration

### React/Next.js Example

```typescript
// frontend/lib/exports.ts
export async function exportCalls(filters: {
  startDate?: string;
  endDate?: string;
  status?: string;
  agentId?: string;
}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.status) params.append('status', filters.status);
  if (filters.agentId) params.append('agent_id', filters.agentId);

  const response = await fetch(`/api/exports/calls?${params}`, {
    headers: {
      // Include authentication headers
      'X-User-Id': getCurrentUserId(),
      // or: 'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  // Download the CSV file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calls_export_${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### Add Export Button to Campaign Detail Page

```tsx
// frontend/app/dashboard/campaigns/[id]/page.tsx
import { Button } from '@heroui/button';
import { Download } from 'lucide-react';
import { exportCalls } from '@/lib/exports';

export default function CampaignDetailPage() {
  const handleExport = async () => {
    try {
      await exportCalls({
        agentId: campaign.agent_id,
        startDate: campaign.scheduled_start
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      {/* Existing campaign content */}

      <Button
        color="primary"
        variant="flat"
        startContent={<Download className="h-4 w-4" />}
        onClick={handleExport}
      >
        Export to CSV
      </Button>
    </div>
  );
}
```

## Testing the Integration

### 1. Unit Tests

```python
# tests/test_exports_integration.py
import pytest
from flask import Flask
from backend.exports.routes import exports_bp

def test_blueprint_registration():
    """Test that exports blueprint registers correctly."""
    app = Flask(__name__)
    app.register_blueprint(exports_bp)

    # Check routes are registered
    assert '/api/exports/health' in [rule.rule for rule in app.url_map.iter_rules()]
    assert '/api/exports/calls' in [rule.rule for rule in app.url_map.iter_rules()]

def test_health_endpoint():
    """Test the health check endpoint."""
    app = Flask(__name__)
    app.register_blueprint(exports_bp)
    client = app.test_client()

    response = client.get('/api/exports/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'
```

### 2. Integration Tests

```bash
# Start your Flask application in one terminal
python user_dashboard.py

# In another terminal, test the endpoints
curl http://localhost:5000/api/exports/health

# Test authenticated export (replace YOUR_USER_ID)
curl -H "X-User-Id: YOUR_USER_ID" \
  "http://localhost:5000/api/exports/calls" \
  -o test_export.csv

# Verify CSV format
head -n 5 test_export.csv
```

### 3. Load Testing

```bash
# Test with large dataset
curl -H "X-User-Id: YOUR_USER_ID" \
  "http://localhost:5000/api/exports/calls?start_date=2020-01-01" \
  -o large_export.csv

# Monitor memory usage (should stay constant)
watch -n 1 'ps aux | grep python | grep -v grep'
```

## Production Checklist

Before deploying to production:

- [ ] Replace placeholder authentication with production auth system
- [ ] Add rate limiting (e.g., Flask-Limiter: 10 exports/hour per user)
- [ ] Add export audit logging (track who exported what and when)
- [ ] Configure CORS if exports accessed from different domain
- [ ] Add database indexes for performance:
  ```sql
  CREATE INDEX idx_call_logs_user_started ON call_logs (userId, startedAt);
  CREATE INDEX idx_agent_configs_user_active ON agent_configs (userId, isActive);
  ```
- [ ] Set up monitoring for export performance and errors
- [ ] Document export endpoints in API documentation
- [ ] Test with realistic dataset sizes (10K+ rows)
- [ ] Verify memory usage stays constant during exports

## Troubleshooting

### Issue: "Module not found: backend.exports"

**Solution**: Ensure the backend directory is in your Python path:

```python
# At the top of your main Flask app
import sys
sys.path.insert(0, '/opt/livekit1')

# Or set PYTHONPATH environment variable
export PYTHONPATH=/opt/livekit1:$PYTHONPATH
```

### Issue: "Unauthorized" errors

**Solution**: Check authentication integration:

```bash
# Test with explicit user ID
curl -H "X-User-Id: test-user-123" \
  "http://localhost:5000/api/exports/calls"

# Check session-based auth
curl -b cookies.txt "http://localhost:5000/api/exports/calls"
```

### Issue: Empty CSV or no data

**Solution**: Verify data exists for the user:

```sql
-- Check if user has call logs
SELECT COUNT(*) FROM call_logs WHERE "userId" = 'your-user-id';

-- Check date ranges
SELECT MIN("startedAt"), MAX("startedAt")
FROM call_logs
WHERE "userId" = 'your-user-id';
```

### Issue: Slow exports

**Solution**: Add database indexes and reduce chunk size:

```python
# In backend/exports/routes.py
csv_streamer = CSVStreamer(chunk_size=500)  # Reduce from 1000
```

## Next Steps

1. **Integrate authentication** - Replace placeholder auth decorator
2. **Test with real data** - Export actual call logs and verify format
3. **Add frontend UI** - Create export buttons in campaign/call detail pages
4. **Add rate limiting** - Prevent abuse with per-user limits
5. **Monitor performance** - Track export duration and memory usage

## Support

For questions or issues:
- Check the main README.md for API documentation
- Review the csv_stream.py source code for streaming implementation
- Test with the health endpoint first: `/api/exports/health`
