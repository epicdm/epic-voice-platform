# 🛡️ Admin Panel - Ready to Use!

**Status:** ✅ **LIVE AND READY**  
**URL:** https://ai.epic.dm/admin

---

## 🚀 **Quick Access**

**Go to:** https://ai.epic.dm/admin

**Who has access:**
- ✅ giraud.eric@gmail.com (your account)
- ❌ All other users get 403 Forbidden

---

## 🎯 **What You Can Do**

### **1. View All Users**
- See complete user list with stats
- Email, name, profile picture
- Created date
- Subscription status
- Trial days remaining
- Agent count, phone numbers, calls

### **2. Quick Stats Dashboard**
- Total users
- Active trials
- Total agents across all users
- Total calls made

### **3. Delete Test Users**
Perfect for testing! Delete users with one click:
- ✅ Removes user account
- ✅ Deletes all agents
- ✅ Removes all phone numbers
- ✅ Deletes all call logs
- ✅ Removes organization & subscription
- ✅ Cleans up all related data

### **4. Search & Filter**
- Search by email or name
- Real-time filtering

### **5. User Status Indicators**
- ✅ Email verified
- 🆕 New user (not onboarded)
- 🎓 Onboarded
- ⏰ Trial status (7d/3d/1d left)
- 🟢 Active subscription
- 🔴 Expired trial

---

## 📊 **Admin Panel Features**

| Feature | Status | Details |
|---------|--------|---------|
| **User List** | ✅ Live | All users with full details |
| **Delete Users** | ✅ Working | One-click deletion with confirmation |
| **Search** | ✅ Working | Filter by email/name |
| **Stats Dashboard** | ✅ Live | Real-time counts |
| **Subscription Info** | ✅ Visible | Trial status, days left |
| **User Activity** | ✅ Tracked | Agents, calls, phone numbers |
| **Access Control** | ✅ Secured | Admin emails only |
| **Mobile Responsive** | ✅ Yes | Works on all devices |

---

## 🧪 **Perfect for Testing!**

### **Test Onboarding Flow:**

1. **Create test user:**
   ```
   https://ai.epic.dm/auth/signup
   Sign up with test email
   ```

2. **Test features:**
   - Welcome email
   - Onboarding wizard
   - Create agent
   - Get phone number

3. **Delete user:**
   ```
   Go to: https://ai.epic.dm/admin
   Find test user
   Click "Delete"
   Confirm deletion
   ```

4. **Repeat!**
   - Use same email again
   - Or try different email
   - Test different flows

---

## 🔒 **Security**

### **Admin Authentication:**

Admin access is controlled by email whitelist in:
- `/opt/livekit1/frontend/lib/admin.ts`
- `/opt/livekit1/frontend/components/Sidebar.tsx`

**Current admins:**
```typescript
const ADMIN_EMAILS = [
  'giraud.eric@gmail.com',
  // Add more admin emails here
]
```

### **To Add More Admins:**

1. **Edit the admin lib:**
   ```typescript
   // /opt/livekit1/frontend/lib/admin.ts
   const ADMIN_EMAILS = [
     'giraud.eric@gmail.com',
     'another-admin@example.com',  // Add here
   ]
   ```

2. **Edit the sidebar:**
   ```typescript
   // /opt/livekit1/frontend/components/Sidebar.tsx
   const ADMIN_EMAILS = [
     'giraud.eric@gmail.com',
     'another-admin@example.com',  // Add here
   ]
   ```

3. **Restart frontend:**
   ```bash
   systemctl restart livekit-frontend
   ```

### **API Endpoints Protected:**

All admin endpoints require authentication:
- ✅ `GET /api/admin/users` - List users
- ✅ `GET /api/admin/users/[userId]` - Get user details
- ✅ `DELETE /api/admin/users/[userId]` - Delete user

**Non-admin users get:** `403 Forbidden`

---

## 📸 **What It Looks Like**

### **Main Dashboard:**
```
┌─────────────────────────────────────────┐
│  🛡️ Admin Panel                         │
│  Manage all users and test accounts     │
├─────────────────────────────────────────┤
│                                          │
│  📊 Stats Cards:                        │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐│
│  │ Total │ │Active │ │ Total │ │ Total ││
│  │ Users │ │Trials │ │Agents │ │ Calls ││
│  │   5   │ │   3   │ │  12   │ │  45   ││
│  └───────┘ └───────┘ └───────┘ └───────┘│
│                                          │
│  🔍 Search: [____________] [🔄 Refresh] │
│                                          │
│  📋 Users Table:                        │
│  ┌────────────────────────────────────┐ │
│  │ User | Status | Sub | Stats | ⚙️  │ │
│  │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│ │
│  │ Eric | ✅ Ver | 🔵 14d | 🤖2 | 🗑️ │ │
│  │ Test | ❌ New | 🟡 3d  | 🤖0 | 🗑️ │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### **User Actions:**
- **Delete button:** Red with trash icon
- **Confirmation:** Double-check before deletion
- **Real-time update:** List refreshes after deletion

---

## 🎨 **UI Features**

### **Color-Coded Subscription Status:**
- 🔵 **Trialing** - Blue badge
- 🟢 **Active** - Green badge
- 🔴 **Expired** - Red badge
- ⚪ **Canceled** - Gray badge

### **Trial Warnings:**
- 🔵 **7+ days** - Blue, informational
- 🟡 **3-6 days** - Orange, warning
- 🔴 **1-2 days** - Red, urgent
- ⚫ **0 days** - Black, expired

### **User Status Icons:**
- ✅ Email verified
- ❌ Not verified
- 🎓 Onboarding complete
- 🆕 New user

### **Activity Stats:**
- 🤖 Agent count
- 📞 Phone numbers
- 📞 Call count

---

## 🛠️ **Technical Details**

### **Files Created:**

```
✅ frontend/lib/admin.ts
   - Admin authentication
   - User management utilities
   - Delete cascade logic

✅ frontend/app/api/admin/users/route.ts
   - GET: List all users
   - Protected by admin check

✅ frontend/app/api/admin/users/[userId]/route.ts
   - GET: User details
   - DELETE: Delete user
   - Cascade deletes all data

✅ frontend/app/admin/page.tsx
   - Full admin panel UI
   - User table with stats
   - Delete functionality
   - Search & filter

✅ frontend/components/Sidebar.tsx (modified)
   - Admin panel link (admins only)
   - Shield icon
   - Purple highlight
```

### **Database Cascades:**

When you delete a user, Prisma automatically deletes:
1. ✅ User accounts (Google OAuth, etc.)
2. ✅ User sessions
3. ✅ Owned organizations
4. ✅ Organization subscriptions
5. ✅ Organization memberships
6. ✅ Agent configurations (via userId)
7. ✅ Phone mappings (via userId)
8. ✅ Call logs (via userId)
9. ✅ SIP configs (via userId)

**Result:** Clean slate, ready for re-testing!

---

## 📝 **Testing Workflow**

### **Recommended Testing Process:**

```bash
# 1. Create test user
Open browser → https://ai.epic.dm/auth/signup
Sign up with: test1@example.com

# 2. Test onboarding
- Check welcome email
- Go through onboarding wizard
- Create an agent
- Get a phone number
- Make a test call

# 3. Verify everything works
Check dashboard, agents, calls, etc.

# 4. Clean up
Go to admin panel → https://ai.epic.dm/admin
Find test1@example.com
Click Delete → Confirm

# 5. Repeat with new test
Use test2@example.com or same email again
```

### **Quick Delete Script** (Optional)

If you want to delete from command line:

```bash
# Delete user by email
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
DELETE FROM users WHERE email = 'test@example.com';
"
```

But the admin panel is way easier! 🎉

---

## 🚀 **What's Next**

Now that you have the admin panel:

1. **Test onboarding system:**
   - Create users
   - Test welcome emails
   - Test onboarding wizard
   - Delete and repeat

2. **Test trial notifications:**
   - Change trial end dates
   - Run cron manually
   - Check emails arrive
   - Delete test users after

3. **Monitor real users:**
   - See signup patterns
   - Track subscription status
   - Monitor usage stats

4. **Phase 2: Stripe Billing**
   - Add payment integration
   - Subscription management
   - Trial → paid conversion

---

## ✅ **Admin Panel Checklist**

- [x] Admin authentication working
- [x] User list displays correctly
- [x] Stats dashboard showing real data
- [x] Delete functionality working
- [x] Cascade deletes all data
- [x] Search and filter working
- [x] Only visible to admin emails
- [x] Sidebar link appears for admins
- [x] Mobile responsive
- [x] Confirmation before deletion
- [x] Real-time updates after actions

---

## 🎉 **You're All Set!**

**Access your admin panel now:**

👉 **https://ai.epic.dm/admin**

**Perfect for:**
- ✅ Testing onboarding flows
- ✅ Cleaning up test accounts
- ✅ Monitoring user activity
- ✅ Checking subscription status
- ✅ Quick user management

---

**Need to add more admins?** Edit the `ADMIN_EMAILS` array in:
- `/opt/livekit1/frontend/lib/admin.ts`
- `/opt/livekit1/frontend/components/Sidebar.tsx`

**Questions?** The admin panel is ready to use! 🚀
