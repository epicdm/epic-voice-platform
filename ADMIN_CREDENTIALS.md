# 🔐 Admin Account Credentials

**Last Updated:** October 23, 2025 at 2:55 AM UTC

---

## 🛡️ **System Admin Account**

### **Login Credentials:**
```
Email:    admin@epic.dm
Password: EpicAdmin2024!
```

### **Login URL:**
https://ai.epic.dm/auth/signin

### **Admin Panel:**
https://ai.epic.dm/admin

---

## 🧪 **Test User Account**

### **Test User:**
```
Email: giraud.eric@gmail.com
Name:  Eric Giraud
Login: Google Sign-In ONLY (no password)
```

### **Purpose:**
- Used for testing signup/onboarding flows
- Can be deleted and recreated via admin panel
- Uses Google OAuth for authentication

---

## 📋 **How to Use**

### **1. Sign In as Admin**

1. Go to: https://ai.epic.dm/auth/signin
2. Click "Sign in with Email"
3. Enter:
   - Email: `admin@epic.dm`
   - Password: `EpicAdmin2024!`
4. Click "Sign in"

### **2. Access Admin Panel**

Once signed in as admin:
- Look for "Admin Panel" link in sidebar (purple with shield icon)
- Or go directly to: https://ai.epic.dm/admin

### **3. Test Onboarding Flow**

1. **Sign out** from admin account
2. **Sign in with Google** using `giraud.eric@gmail.com`
3. **Test features:**
   - Welcome email
   - Onboarding wizard
   - Create agents
   - Get phone numbers
   - Make test calls
4. **Delete test user:**
   - Sign out from test account
   - Sign in as admin
   - Go to admin panel
   - Find `giraud.eric@gmail.com`
   - Click "Delete" button
   - Confirm deletion
5. **Repeat:** You can now sign up with `giraud.eric@gmail.com` again!

---

## 🔍 **Admin Panel Features**

### **Dashboard Stats:**
- Total users count
- Active trials
- Total agents (all users)
- Total calls made

### **User Management:**
- View all users with details
- Search by email/name
- See subscription status
- View trial days remaining
- Check user activity (agents, calls, phones)
- Delete users with one click

### **What Gets Deleted:**
When you delete a user, ALL associated data is removed:
- ✅ User account
- ✅ All AI agents
- ✅ All phone numbers
- ✅ All call logs
- ✅ Organization
- ✅ Subscription
- ✅ All sessions
- ✅ All OAuth accounts

---

## 🔒 **Security Notes**

### **Admin Email Whitelist:**

Only these emails have admin access:
```
admin@epic.dm
```

### **To Add More Admins:**

Edit these files:
1. `/opt/livekit1/frontend/lib/admin.ts`
2. `/opt/livekit1/frontend/app/api/admin/users/route.ts`
3. `/opt/livekit1/frontend/app/api/admin/users/[userId]/route.ts`
4. `/opt/livekit1/frontend/components/Sidebar.tsx`

Change:
```typescript
const ADMIN_EMAILS = ['admin@epic.dm']
```

To:
```typescript
const ADMIN_EMAILS = [
  'admin@epic.dm',
  'new-admin@example.com'
]
```

Then restart frontend:
```bash
systemctl restart livekit-frontend
```

---

## 💡 **Quick Commands**

### **Check Admin User:**
```bash
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
SELECT email, name, password IS NOT NULL as has_password 
FROM users 
WHERE email = 'admin@epic.dm';
"
```

### **Change Admin Password:**
```bash
# Generate new hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NewPassword123', 10));"

# Update password
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
UPDATE users 
SET password = 'PASTE_HASH_HERE' 
WHERE email = 'admin@epic.dm';
"
```

### **List All Users:**
```bash
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
SELECT email, name, \"createdAt\", \"onboardingCompleted\" 
FROM users 
ORDER BY \"createdAt\" DESC;
"
```

### **Delete Test User (via SQL):**
```bash
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
DELETE FROM users WHERE email = 'giraud.eric@gmail.com';
"
```

---

## ✅ **Testing Checklist**

### **Test Welcome Email:**
- [ ] Sign up with test user
- [ ] Check inbox for welcome email
- [ ] Verify email formatting
- [ ] Check trial days shown

### **Test Onboarding Wizard:**
- [ ] Sign up with new user
- [ ] Wizard appears automatically
- [ ] Can navigate through steps
- [ ] Can skip wizard
- [ ] Doesn't show again after completion

### **Test Admin Panel:**
- [ ] Sign in as admin@epic.dm
- [ ] Admin panel link appears in sidebar
- [ ] Can view all users
- [ ] Stats dashboard shows correct counts
- [ ] Search works
- [ ] Can delete users
- [ ] Deletion removes all data

### **Test User Recreation:**
- [ ] Delete giraud.eric@gmail.com via admin panel
- [ ] Sign out
- [ ] Sign up again with same Google account
- [ ] Works without errors
- [ ] Welcome email sent again
- [ ] Onboarding wizard appears again

---

## 🚀 **Production Notes**

### **Before Going Live:**

1. **Change admin password** to something more secure
2. **Add your own admin emails** to the whitelist
3. **Test all flows** thoroughly
4. **Set up monitoring** for admin actions
5. **Enable audit logs** (future feature)

### **Security Best Practices:**

- ✅ Use strong passwords (20+ characters)
- ✅ Enable 2FA on admin email accounts
- ✅ Limit admin access to trusted emails only
- ✅ Regularly review admin panel access logs
- ✅ Never share admin credentials
- ✅ Use environment variables for sensitive data

---

## 📞 **Support**

**Admin Panel Issues:**
1. Check you're signed in as admin email
2. Clear browser cache/cookies
3. Check frontend logs: `journalctl -u livekit-frontend -n 100`
4. Verify admin email in code matches your login

**Can't Delete Users:**
1. Check database constraints
2. Verify user exists
3. Check Prisma cascades are working
4. Look for foreign key errors in logs

---

**Last Updated:** 2025-10-23 at 02:55 UTC  
**Admin Email:** admin@epic.dm  
**Test User:** giraud.eric@gmail.com  
**Status:** ✅ Ready for Testing
