# Magnus Billing SIP Account Configuration Fields

Complete list of SIP account settings in Magnus Billing for comparison.

---

## 📋 Core Account Settings

### **Basic Identification**
- **id** - Unique SIP account ID
- **id_user** - User/customer ID this SIP account belongs to
- **accountcode** - Account code (usually phone number or username)
- **username** - SIP username for authentication
- **name** - Display name for the account
- **defaultuser** - Default username for outbound calls

### **Authentication**
- **secret** - SIP password for authentication
- **md5secret** - MD5 hash of password (alternative auth method)
- **auth** - Authentication type (plaintext, md5, etc.)

---

## 🌐 Network & Connection Settings

### **Host Configuration**
- **host** - Host setting
  - `dynamic` - Account registers to server
  - `<IP address>` - Static IP (server initiates to this IP)
  - `<hostname>` - Static hostname

### **Network Settings**
- **ipaddr** - Current IP address (if dynamic)
- **port** - SIP port (default: 5060)
- **regseconds** - Registration timestamp
- **regexten** - Extension to dial when registered
- **regserver** - Registration server

### **NAT & Network Traversal**
- **nat** - NAT handling
  - `no` - No NAT
  - `yes` - NAT enabled (deprecated)
  - `force_rport` - Force rport parameter
  - `comedia` - Use media path from incoming packets
  - `force_rport,comedia` - Both (common for NAT)
- **qualify** - Qualify/keepalive setting
  - `yes` - Send keepalive packets
  - `no` - No keepalive
  - `<number>` - Timeout in milliseconds (e.g., `2000`)
- **outboundproxy** - Outbound proxy server

---

## 📞 Call Settings

### **Call Permissions**
- **calllimit** - Simultaneous call limit
  - `0` - Unlimited
  - `1` - One call at a time
  - `<number>` - Specific limit
- **call-limit** - Alternative call limit field
- **busylevel** - Busy level threshold

### **Codec Configuration**
- **allow** - Allowed codecs (comma-separated)
  - Common: `ulaw,alaw,gsm,g729,opus`
  - Example: `ulaw,alaw,gsm`
- **disallow** - Disallowed codecs
  - Usually: `all` (then selectively allow)
- **codec** - Primary codec preference

### **DTMF Settings**
- **dtmfmode** - DTMF mode
  - `rfc2833` - Out-of-band DTMF (recommended)
  - `inband` - In-band audio DTMF
  - `info` - SIP INFO method
  - `auto` - Auto-detect

---

## 🔧 Advanced SIP Settings

### **Transport & Protocol**
- **transport** - Transport protocol
  - `udp` - UDP (default)
  - `tcp` - TCP
  - `tls` - TLS (encrypted)
  - `udp,tcp` - Both
- **encryption** - Encryption settings (SRTP)

### **Context & Routing**
- **context** - Dialplan context for calls
  - Common: `billing`, `from-sip`, `default`
- **type** - Peer type
  - `friend` - Can make and receive calls
  - `peer` - Receive calls only
  - `user` - Make calls only

### **Registration**
- **insecure** - Security settings
  - `port` - Accept from any port
  - `invite` - Accept without authentication
  - `port,invite` - Both (less secure)
- **directmedia** - Direct media path
  - `yes` - Direct RTP between endpoints
  - `no` - RTP through server
  - `nonat` - Direct except through NAT
  - `update` - Use UPDATE for media changes

### **Session Settings**
- **session-timers** - Session timer support
  - `accept` - Accept session timers
  - `originate` - Originate session timers
  - `refuse` - Refuse session timers
- **session-expires** - Session expiration time
- **session-minse** - Minimum session expiration

---

## 🎯 Additional Configuration

### **Language & Region**
- **language** - Language code (en, es, pt, etc.)
- **accountcode** - Billing account code
- **amaflags** - Automatic Message Accounting flags
  - `default`
  - `omit`
  - `billing`
  - `documentation`

### **Call Features**
- **callgroup** - Call pickup group
- **pickupgroup** - Pickup group membership
- **callerid** - Caller ID string
  - Format: `"Display Name" <number>`
- **cid_number** - Caller ID number
- **mohinterpret** - Music on hold class
- **mohsuggest** - Music on hold suggestion

### **Video & Media**
- **videosupport** - Video call support
  - `yes` - Video enabled
  - `no` - Audio only
- **maxcallbitrate** - Maximum call bitrate

### **Security & Quality**
- **trustrpid** - Trust Remote-Party-ID header
- **sendrpid** - Send Remote-Party-ID
- **progressinband** - Progress indication
  - `never` - No in-band progress
  - `no` - No in-band progress
  - `yes` - In-band progress
- **promiscredir** - Promiscuous redirect

### **Recording & Monitoring**
- **callcounter** - Enable call counting
- **busylevel** - Busy level for device state
- **allowoverlap** - Overlap dialing support
- **allowsubscribe** - Allow subscriptions
- **allowtransfer** - Allow call transfers

---

## 🔍 Most Common Differences Causing Outbound Issues

### **Critical Fields to Check:**

1. **host**
   - ✅ Should be: `dynamic` (for most setups)
   - ❌ Wrong: Static IP or incorrect hostname

2. **type**
   - ✅ Should be: `friend` (allows both in and out)
   - ❌ Wrong: `user` (inbound only) or `peer` (outbound only)

3. **context**
   - ✅ Should match working account
   - ❌ Wrong: Different context without proper routing

4. **nat**
   - ✅ Should be: `force_rport,comedia` or `yes` (if behind NAT)
   - ❌ Wrong: `no` when NAT exists

5. **allow/disallow**
   - ✅ Should be: Same codecs as working account
   - ❌ Wrong: Missing required codecs

6. **calllimit**
   - ✅ Should be: `0` or higher than needed
   - ❌ Wrong: `1` when multiple calls expected

7. **insecure**
   - ✅ May need: `port,invite` for some setups
   - ❌ Wrong: Too restrictive settings

8. **qualify**
   - ✅ Should be: `yes` or specific timeout
   - ❌ Wrong: `no` causing registration issues

9. **directmedia**
   - ✅ Should match: Working account setting
   - ❌ Wrong: `yes` when should be `no` (or vice versa)

10. **dtmfmode**
    - ✅ Should be: `rfc2833`
    - ❌ Wrong: `inband` or incorrect mode

---

## 📝 How to Compare

**For +17678189267 (WORKING) vs +17678189426 (NOT WORKING):**

```sql
-- Compare all SIP account settings
SELECT
    username,
    host,
    type,
    context,
    nat,
    qualify,
    calllimit,
    allow,
    disallow,
    dtmfmode,
    directmedia,
    transport,
    insecure,
    accountcode
FROM pkg_sip
WHERE username IN ('+17678189267', '+17678189426', '17678189267', '17678189426')
ORDER BY username;
```

**In Magnus Admin UI:**
1. Go to **Extensions → SIP Accounts**
2. Find account for **+17678189267** → View/Edit
3. **Take screenshot or note ALL fields**
4. Find account for **+17678189426** → View/Edit
5. **Compare field by field**

---

## ✅ What to Look For

Compare these fields in order of likelihood:

1. ✅ **host** - Should both be `dynamic`
2. ✅ **type** - Should both be `friend`
3. ✅ **context** - Should be identical
4. ✅ **nat** - Should be identical
5. ✅ **allow** - Should be identical codec list
6. ✅ **disallow** - Should be identical
7. ✅ **qualify** - Should be identical
8. ✅ **calllimit** - Should be same or `0`
9. ✅ **dtmfmode** - Should be identical
10. ✅ **directmedia** - Should be identical

**Once you find the difference, update it to match the working account!**
