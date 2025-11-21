# Secure SIP Configuration for LiveKit + Magnus/Asterisk

## 🔒 Security Issues with Current Config

### Current (INSECURE):
```
insecure=port,invite
permit=0.0.0.0/0.0.0.0  ❌ ALLOWS ENTIRE INTERNET
host=3m4yki5jezn.sip.livekit.cloud
```

**Vulnerabilities:**
- ✗ No authentication required for inbound calls
- ✗ Any IP address in the world can connect
- ✗ Exposed to toll fraud, spam, DDoS

---

## ✅ RECOMMENDED: More Secure Config

### Option 1: IP-Restricted (BEST SECURITY)

**LiveKit SIP IP Detected:** `161.115.178.89`

```
insecure=port,invite
permit=161.115.178.89/32       ✅ ONLY LiveKit can connect
deny=0.0.0.0/0.0.0.0           ✅ Block everyone else
host=3m4yki5jezn.sip.livekit.cloud
type=friend
fromdomain=3m4yki5jezn.sip.livekit.cloud
defaultuser=+17678189659
authuser=+17678189659
secret=W5YwpjJ0BE90
fromuser=+17678189659
context=billing
callerid=<17678189659>
transport=tcp
port=5060
```

**Security Improvements:**
- ✅ Only LiveKit's IP (`161.115.178.89`) can connect
- ✅ All other IPs are blocked
- ✅ Reduces attack surface by 99.99%
- ⚠️ Still uses `insecure=invite` (may be required for LiveKit)

---

### Option 2: Use Type=Peer (MORE SECURE)

If LiveKit only needs to SEND calls (not receive authentication):

```
type=peer                       ✅ No inbound authentication bypass
host=3m4yki5jezn.sip.livekit.cloud
permit=161.115.178.89/32
deny=0.0.0.0/0.0.0.0
defaultuser=+17678189659
secret=W5YwpjJ0BE90
context=billing
callerid=<17678189659>
transport=tcp
port=5060
```

**Why this is better:**
- ✅ Removes `insecure=invite` completely
- ✅ Type=peer matches on IP/host only
- ✅ No password bypass vulnerability
- ⚠️ May break if LiveKit requires `type=friend`

---

### Option 3: TLS + Authentication (MOST SECURE)

If LiveKit supports it:

```
type=friend
host=3m4yki5jezn.sip.livekit.cloud
permit=161.115.178.89/32
deny=0.0.0.0/0.0.0.0
defaultuser=+17678189659
secret=W5YwpjJ0BE90
context=billing
transport=tls                   ✅ Encrypted signaling
encryption=yes                  ✅ Encrypted media (SRTP)
port=5061
```

**Benefits:**
- ✅ Encrypted SIP signaling (TLS)
- ✅ Encrypted media (SRTP)
- ✅ IP-restricted
- ⚠️ Requires LiveKit to support TLS (check docs)

---

## 🎯 Immediate Action: Apply IP Restriction

**Minimum fix you should apply RIGHT NOW:**

Replace:
```
permit=0.0.0.0/0.0.0.0
```

With:
```
permit=161.115.178.89/32
deny=0.0.0.0/0.0.0.0
```

**This single change:**
- ✅ Blocks 4.3 billion IP addresses
- ✅ Only allows LiveKit to connect
- ✅ Still allows registration to work
- ✅ Reduces attack surface dramatically

---

## 📊 Security Comparison

| Setting | Current | Recommended | Risk Level |
|---------|---------|-------------|------------|
| `permit=0.0.0.0/0.0.0.0` | ❌ Entire Internet | ✅ `161.115.178.89/32` | **CRITICAL → LOW** |
| `insecure=invite` | ❌ Needed | ⚠️ Keep (may be required) | **HIGH → MEDIUM** |
| `type=friend` | ❌ Both directions | ✅ Try `type=peer` | **HIGH → LOW** |
| Encryption | ❌ None | ✅ TLS + SRTP (if possible) | **HIGH → MINIMAL** |

---

## 🔍 Testing Secure Config

### Step 1: Apply IP Restriction
1. Magnus UI → SIP Account `+17678189659`
2. Add to `sip_config`:
   ```
   permit=161.115.178.89/32
   deny=0.0.0.0/0.0.0.0
   ```
3. Save and wait 30 seconds
4. Test inbound call - should still work

### Step 2: Try Type=Peer (if Step 1 works)
1. Change `type=friend` to `type=peer`
2. Remove `insecure=port,invite` line
3. Test registration
4. If fails, revert to `type=friend` with IP restriction

### Step 3: Research TLS Support
1. Check LiveKit docs for TLS support
2. If supported, enable encryption
3. Ultimate security posture

---

## 🚨 Known Attack Vectors (Current Config)

With `permit=0.0.0.0/0.0.0.0` + `insecure=invite`:

1. **Toll Fraud**
   - Attacker guesses username: `+17678189659`
   - Makes international calls through your trunk
   - You pay for all calls

2. **DDoS / Call Spam**
   - Attacker floods with INVITE messages
   - Overwhelms Asterisk
   - Legitimate calls fail

3. **Call Interception**
   - Attacker registers with same username
   - Intercepts your inbound calls
   - Privacy breach

**All prevented by restricting to `161.115.178.89/32`** ✅

---

## 📝 Update Provisioning Code

File: `/opt/livekit1/magnus_billing_client_new.py` (line 449)

**Change:**
```python
sip_config = f"""insecure=port,invite
type=friend
fromdomain={livekit_sip_domain}
defaultuser={sip_username}
authuser={sip_username}
secret={sip_password}
fromuser={sip_username}
context=billing
callerid=<{clean_number}>
transport=tcp
port=5060
permit=0.0.0.0/0.0.0.0"""  # ❌ INSECURE
```

**To:**
```python
# Get LiveKit IP dynamically or use known IP
livekit_ip = "161.115.178.89"  # Resolved from 3m4yki5jezn.sip.livekit.cloud

sip_config = f"""insecure=port,invite
type=friend
fromdomain={livekit_sip_domain}
defaultuser={sip_username}
authuser={sip_username}
secret={sip_password}
fromuser={sip_username}
context=billing
callerid=<{clean_number}>
transport=tcp
port=5060
permit={livekit_ip}/32
deny=0.0.0.0/0.0.0.0"""  # ✅ SECURE
```

---

## ⚠️ Important Notes

1. **LiveKit IP May Change**: LiveKit Cloud doesn't guarantee static IPs
   - Monitor for registration failures
   - Re-resolve DNS if needed: `host 3m4yki5jezn.sip.livekit.cloud`

2. **`insecure=invite` May Be Required**:
   - Try removing it with `type=peer`
   - If LiveKit registration fails, must keep it
   - IP restriction mitigates most risk

3. **Test Before Production**:
   - Apply to one number first
   - Test inbound and outbound calls
   - Verify registration stays active

---

**PRIORITY: Apply IP restriction immediately to close the biggest vulnerability!**
