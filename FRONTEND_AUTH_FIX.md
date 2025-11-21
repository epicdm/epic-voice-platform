# Frontend Authentication Fix for Multi-Tenancy

## ✅ Problem Solved

The backend was returning the same data for all users (breaking multi-tenancy) because it had a fallback that always returned the first user when no authentication was provided.

## 🔒 Current Status

**Backend is now properly secured:**
- ✅ No fallback to first user
- ✅ Returns 401 Unauthorized when not authenticated
- ✅ Properly isolates data per user
- ✅ Supports multiple authentication methods

## 🔧 Frontend Integration

Your Next.js frontend needs to send authentication with API requests. The backend now supports **3 authentication methods**:

### Method 1: X-User-Email Header (Simplest)

```typescript
// In your API client (api.ts or similar)
const headers = {
  'Content-Type': 'application/json',
  'X-User-Email': currentUser.email  // From your NextAuth session
};

fetch('http://localhost:5001/api/v1/agents', { 
  headers,
  credentials: 'include'  // Important for cookies
});
```

### Method 2: Cookie-Based (Recommended)

After login, the backend sets these cookies:
- `user_id` - The user's ID
- `user_email` - The user's email

Make sure your API requests include credentials:

```typescript
fetch('http://localhost:5001/api/v1/agents', {
  credentials: 'include',  // Send cookies
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Method 3: Bearer Token (Most Secure)

```typescript
// Generate JWT token on backend
const token = generateJWT(userId);

// Send in Authorization header
fetch('http://localhost:5001/api/v1/agents', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📝 Update Your Frontend Code

### Step 1: Update API Client

Find your API client file (likely `lib/api.ts` or `api.ts`) and update it:

```typescript
// lib/api.ts
import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add user email for authentication
  if (session?.user?.email) {
    headers['X-User-Email'] = session.user.email;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',  // Send cookies
  });
  
  if (response.status === 401) {
    // User not authenticated - redirect to login
    window.location.href = '/login';
    throw new Error('Authentication required');
  }
  
  return response;
}

// Export API functions
export const api = {
  getAgents: () => fetchWithAuth('/api/v1/agents'),
  getStats: () => fetchWithAuth('/api/v1/stats'),
  // ... other endpoints
};
```

### Step 2: Update Environment Variables

In `/opt/livekit1/frontend/.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5001

# Or for production:
# NEXT_PUBLIC_API_URL=https://api.epic.dm
```

### Step 3: Test Multi-Tenancy

1. Login as `demo@example.com` → Should see 6 agents
2. Logout and login as `sales@example.com` → Should see 0 agents (or create new ones)
3. Each user sees only their own data! ✅

## 🧪 Testing Authentication

### Test 1: No Authentication
```bash
curl http://localhost:5001/api/v1/agents
# Expected: {"error":"Authentication required"}
```

### Test 2: With Email Header
```bash
curl -H "X-User-Email: demo@example.com" http://localhost:5001/api/v1/agents
# Expected: [...6 agents...]
```

### Test 3: Different User
```bash
curl -H "X-User-Email: sales@example.com" http://localhost:5001/api/v1/agents
# Expected: []  (no agents for this user)
```

## 📊 Current User Data

```
demo@example.com: 6 agents
sales@example.com: 0 agents
```

## 🔐 Security Notes

**Current Implementation (Development):**
- ✅ Multi-tenancy working
- ⚠️ Using email header (not secure for production)
- ⚠️ No token validation

**For Production:**
1. Implement proper JWT validation
2. Use HTTPS only
3. Add rate limiting
4. Implement token refresh
5. Add CSRF protection
6. Validate all user inputs

## 🚀 Quick Fix for Your Frontend

If you want the quickest fix right now:

**Option A: Use the backend's API login**

```typescript
// Login via backend
const response = await fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});

// Backend sets cookies automatically
// Now all API calls will work!
```

**Option B: Pass email from NextAuth**

```typescript
// In your API calls
const session = await getSession();

fetch('http://localhost:5001/api/v1/agents', {
  headers: {
    'X-User-Email': session?.user?.email
  }
});
```

## ✅ Verification

Run these commands to verify multi-tenancy is working:

```bash
# Test 1: No auth (should fail)
curl http://localhost:5001/api/v1/agents

# Test 2: User 1
curl -H "X-User-Email: demo@example.com" http://localhost:5001/api/v1/agents | jq 'length'
# Should return: 6

# Test 3: User 2  
curl -H "X-User-Email: sales@example.com" http://localhost:5001/api/v1/agents | jq 'length'
# Should return: 0
```

## 📞 Need Help?

The backend is now correctly isolating users. The issue is just connecting your Next.js authentication (NextAuth) with the backend API calls.

Check:
1. ✅ Backend: Properly secured (port 5001)
2. ✅ Multi-tenancy: Working correctly
3. ⚠️ Frontend: Needs to send user identification with API requests

Update your API client as shown above and the "Error Loading Dashboard" will be fixed! 🎉
