# ✅ Domain Setup Complete - ai.epic.dm

## 🎉 Your App is Now Live!

**URL:** https://ai.epic.dm

---

## ✅ What's Been Configured:

### **1. DNS**
- Domain: `ai.epic.dm` → `66.118.37.6` ✅
- A record verified and working

### **2. Web Server (Apache)**
- Virtual host created for `ai.epic.dm`
- Proxying to Next.js on port `3001`
- WebSocket support enabled
- HTTP → HTTPS redirect enabled

### **3. SSL Certificate (Let's Encrypt)**
- Certificate obtained and installed ✅
- Valid until: January 20, 2026
- Auto-renewal configured (certbot)
- HTTPS fully working

### **4. Frontend Configuration**
- `NEXTAUTH_URL` updated to: `https://ai.epic.dm`
- Service restarted with new configuration
- Ready for Google OAuth

---

## 🔐 Next Step: Google OAuth Setup

### **Redirect URIs to Add in Google Cloud Console:**

When you create your OAuth credentials, use these **exact** URLs:

**Authorized JavaScript origins:**
```
https://ai.epic.dm
```

**Authorized redirect URIs:**
```
https://ai.epic.dm/api/auth/callback/google
```

---

## 📋 Complete Google OAuth Setup Instructions:

### **Step 1: Go to Google Cloud Console**
https://console.cloud.google.com/

### **Step 2: Create OAuth Credentials**

1. **Select your project** (or create "Epic Voice App")
2. Go to: **APIs & Services** → **Credentials**
3. Click: **+ CREATE CREDENTIALS** → **OAuth client ID**
4. **Application type:** Web application
5. **Name:** Epic Voice Web Client

6. **Authorized JavaScript origins:**
   - Click **+ ADD URI**
   - Add: `https://ai.epic.dm`

7. **Authorized redirect URIs:**
   - Click **+ ADD URI**
   - Add: `https://ai.epic.dm/api/auth/callback/google`

8. Click **CREATE**

### **Step 3: Configure OAuth Consent Screen**

1. Go to: **APIs & Services** → **OAuth consent screen**
2. **User Type:** External
3. **App name:** Epic Voice
4. **User support email:** Your email
5. **Developer contact:** Your email
6. **Scopes:** Add `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
7. **Test users:** Add your email (for testing)
8. **Save**

### **Step 4: Copy Your Credentials**

After creating, you'll get:
```
Client ID: 123456789-abc...apps.googleusercontent.com
Client Secret: GOCSPX-abc123...
```

**Keep these secure!** We'll add them to your app next.

---

## 🔧 Adding Credentials to Your App

Once you have your Client ID and Client Secret, run:

```bash
cd /opt/livekit1/frontend

# Add Client ID
sed -i 's|GOOGLE_CLIENT_ID=""|GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"|' .env.local

# Add Client Secret  
sed -i 's|GOOGLE_CLIENT_SECRET=""|GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"|' .env.local

# Copy to .env
cp .env.local .env

# Restart frontend
systemctl restart livekit-frontend
```

**Or I can do this for you - just provide the credentials!**

---

## 🧪 Testing Your Setup

### **1. Test Domain (Before Google OAuth):**
```bash
curl -I https://ai.epic.dm
# Should return: HTTP/1.1 200 OK
```

### **2. Test Auth Pages:**
- Sign In: https://ai.epic.dm/auth/signin
- Sign Up: https://ai.epic.dm/auth/signup

### **3. After Adding Google Credentials:**

1. Visit: https://ai.epic.dm/auth/signin
2. Click: **"Continue with Google"**
3. Should redirect to Google login
4. After sign-in, redirects back to: https://ai.epic.dm/dashboard
5. Check database for new user:
   ```bash
   cd /opt/livekit1/frontend
   npx prisma studio
   # Opens at http://localhost:5555
   ```

---

## 🔍 Verification Checklist

Before testing Google OAuth:

- [ ] Domain resolves: https://ai.epic.dm ✅
- [ ] SSL certificate valid ✅  
- [ ] Frontend running on port 3001 ✅
- [ ] Apache proxying correctly ✅
- [ ] Database running (PostgreSQL) ✅
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Redirect URI added: `https://ai.epic.dm/api/auth/callback/google`
- [ ] Client ID added to `.env.local`
- [ ] Client Secret added to `.env.local`
- [ ] Frontend restarted

---

## 📊 Current Configuration

### **Environment Variables:**
```bash
NEXTAUTH_URL="https://ai.epic.dm"
NEXTAUTH_SECRET="[auto-generated]"
DATABASE_URL="postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db"
TRIAL_DAYS="14"
TRIAL_NEEDS_CARD="false"

# To be added by you:
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### **Files:**
- Apache config: `/etc/apache2/sites-available/ai.epic.dm-le-ssl.conf`
- SSL cert: `/etc/letsencrypt/live/ai.epic.dm/fullchain.pem`
- Frontend env: `/opt/livekit1/frontend/.env.local`
- Database: PostgreSQL `epic_voice_db`

---

## 🚀 What Happens on First Google Sign-In:

1. **User clicks "Continue with Google"**
2. Redirected to Google OAuth consent screen
3. User signs in with Google
4. Google redirects back to: `https://ai.epic.dm/api/auth/callback/google`
5. **NextAuth processes the callback:**
   - Creates User record
   - Links Google account
   - Creates Organization: "{Name}'s Organization"
   - Creates Membership: User → Org (owner role)
   - Creates Subscription: 14-day trial
6. **Redirects to:** `https://ai.epic.dm/dashboard`
7. **Trial banner shows:** "You're on a free trial — 14 days left"

---

## 🔒 Security Notes

### **SSL/HTTPS:**
✅ All traffic encrypted
✅ Let's Encrypt certificate (trusted by all browsers)
✅ Auto-renewal configured
✅ HTTP → HTTPS redirect enforced

### **OAuth Security:**
✅ Using industry-standard OAuth 2.0
✅ Credentials never stored in frontend
✅ Session tokens are JWT-based
✅ HTTPS required for OAuth

### **Database:**
✅ PostgreSQL (production-ready)
✅ Proper foreign key constraints
✅ Passwords hashed with bcrypt
✅ Credentials in `.env` (not in code)

---

## 📞 Need Help?

### **Domain Issues:**
```bash
# Test DNS
host ai.epic.dm
# Should return: ai.epic.dm has address 66.118.37.6

# Test HTTPS
curl -I https://ai.epic.dm
# Should return: HTTP/1.1 200 OK
```

### **Apache Issues:**
```bash
# Check status
systemctl status apache2

# Check logs
tail -f /var/log/apache2/ai_epic_error.log

# Test config
apache2ctl configtest
```

### **Frontend Issues:**
```bash
# Check status
systemctl status livekit-frontend

# Check logs  
journalctl -u livekit-frontend -f

# Restart
systemctl restart livekit-frontend
```

### **SSL Issues:**
```bash
# Check certificate
certbot certificates

# Renew manually
certbot renew --dry-run
```

---

## 🎯 Ready to Configure Google OAuth!

**Your redirect URI:**
```
https://ai.epic.dm/api/auth/callback/google
```

**Once you add this to Google Cloud Console and provide your credentials, your app will be fully functional with Google Sign-In!**

---

**Need the credentials added? Just send them and I'll configure everything for you!** 🚀
