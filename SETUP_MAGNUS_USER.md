# 🚨 **ACTION REQUIRED: Configure Magnus User**

## **What Changed:**

Your system now **PROPERLY creates DIDs on Asterisk** with:
- ✅ DID creation in Magnus Billing
- ✅ Routing configuration (DID Destination)
- ✅ Caller ID setup
- ✅ **Only uses numbers in range 9000-9999**

---

## **⚠️ You MUST Configure This:**

### **Step 1: Find Your Magnus User ID**

1. Log into Magnus Billing: `https://voice.epic.dm`
2. Go to: **Customers** → **Users**
3. Find your user account
4. Note the **ID** (example: `123`)

### **Step 2: Find Your SIP Username**

1. In Magnus Billing, go to: **VoIP** → **SIP Accounts**
2. Find your SIP account
3. Note the **Username** (example: `john_1767818`)

### **Step 3: Update .env File**

```bash
nano /opt/livekit1/.env
```

Find these lines:
```bash
MAGNUS_USER_ID='1'  # Replace with your Magnus Billing user ID
MAGNUS_USERNAME='your_sip_username'  # Replace with your SIP username
```

Replace with your actual values:
```bash
MAGNUS_USER_ID='123'  # Your actual user ID
MAGNUS_USERNAME='john_1767818'  # Your actual SIP username
```

### **Step 4: Restart Flask**

```bash
pkill -f user_dashboard.py
cd /opt/livekit1
python3 user_dashboard.py
```

---

## **How to Test:**

### **Quick Test:**
```bash
curl -X POST http://localhost:5001/api/user/phone-numbers/provision \
  -H "Content-Type: application/json" \
  -d '{"country":"Dominica","prefix":"1767818","use_magnus":true}' \
  | python3 -m json.tool
```

### **Expected Result:**
```json
{
  "success": true,
  "phone_number": "+17678189123",
  "provider": "magnus"
}
```

### **Check Logs:**
```bash
tail -f /opt/livekit1/flask.log
```

**Look for:**
```
🔧 Provisioning DID from Magnus Billing...
   Range: 9000-9999
   User: john_1767818 (ID: 123)
✅ Created DID in Magnus
✅ Created DID destination
✅ Set caller ID
```

---

## **Verify in Magnus Billing:**

1. **DIDs Tab**: Should show your new `17678189XXX`
2. **DID Destination**: Should route to `SIP/your_username`
3. **SIP Account**: Caller ID should be set to the DID

---

## **Summary:**

| What | Status |
|------|--------|
| **Code updated** | ✅ Complete |
| **Uses 9000-9999 range** | ✅ Yes |
| **Creates DIDs on Asterisk** | ✅ Yes |
| **Sets routing** | ✅ Yes |
| **Sets caller ID** | ✅ Yes |
| **Config needed** | ⚠️ Update .env |

**Once you update .env with your Magnus user credentials, DIDs will be properly created on your Asterisk server!** 🎉
