# SIP Trunk Configuration Issue

## Problem
Calls are not reaching your Asterisk PBX because the LiveKit SIP trunk is pointing to `voice.epic.dm` but there's no proper routing configured.

## Current Configuration
- **SIP Domain**: voice.epic.dm (resolves to 206.53.141.41)
- **SIP Trunk ID**: ST_sTo8gGpNbXzY
- **Your Server IP**: 66.118.37.6
- **Transport**: TCP

## Why Calls Are Not Working
LiveKit is successfully creating SIP participants and trying to call `voice.epic.dm`, but:
1. The domain may not be properly routing to your Asterisk server
2. Your Asterisk PBX is not running on this server (no process found on port 5060/5061)
3. The SIP trunk may need authentication credentials

## Solutions

### Solution 1: Update LiveKit SIP Trunk to Point to Your Asterisk Server

If your Asterisk is on a different server, update the trunk:

```bash
cd /opt/livekit1

# Delete the existing trunk
lk sip outbound delete ST_sTo8gGpNbXzY

# Create a new trunk pointing to your actual Asterisk IP
lk sip outbound create <<EOF
{
  "trunk": {
    "name": "asterisk-pbx-trunk",
    "address": "YOUR_ASTERISK_IP:5060",
    "transport": "TCP",
    "numbers": ["+17678183366"],
    "auth_username": "YOUR_ASTERISK_USERNAME",
    "auth_password": "YOUR_ASTERISK_PASSWORD"
  }
}
EOF
```

### Solution 2: Configure Asterisk on This Server

If you want to run Asterisk on this server:

```bash
# Install Asterisk
apt-get update
apt-get install -y asterisk

# Start Asterisk
systemctl start asterisk
systemctl enable asterisk

# Configure SIP peer for LiveKit
```

### Solution 3: Use a SIP Provider (Twilio, Telnyx, etc.)

Instead of your own Asterisk, use a commercial SIP provider:

1. Sign up for Twilio/Telnyx
2. Get a SIP domain and credentials
3. Update the trunk configuration with their details

## Immediate Testing Steps

1. **Verify your Asterisk location**:
   - Where is your Asterisk PBX actually running?
   - What is its IP address?
   - Is it accessible from this server?

2. **Update the trunk**:
   ```bash
   # Get the new trunk ID after creation
   lk sip outbound list
   
   # Update .env file
   echo "SIP_OUTBOUND_TRUNK_ID=NEW_TRUNK_ID" >> .env
   ```

3. **Test SIP connectivity**:
   ```bash
   # Test if you can reach your Asterisk
   nc -zv YOUR_ASTERISK_IP 5060
   ```

## Debug Commands

```bash
# Check LiveKit rooms
lk room list

# Monitor Asterisk SIP activity (if running locally)
asterisk -rx "sip show peers"
asterisk -rx "sip show channels"

# Check network connectivity
tcpdump -i any port 5060 -n
```

## Next Steps
1. Identify where your Asterisk PBX is actually running
2. Get the IP address and SIP credentials
3. Update the LiveKit outbound trunk configuration
4. Test again
