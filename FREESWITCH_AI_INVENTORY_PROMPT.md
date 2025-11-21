# FreeSWITCH Server Inventory - AI Assistant Prompt

**Server**: 24.199.103.153
**Purpose**: Gather complete inventory for Magnus Billing to FreeSWITCH migration

---

## Copy-Paste Prompt for FreeSWITCH Server AI:

```
I am migrating from Magnus Billing to FreeSWITCH for VoIP call routing. I need you to analyze this FreeSWITCH server and provide a complete inventory of its configuration. Please answer ALL of the following questions with specific commands, file paths, and configuration details:

## 1. DID/Phone Number Management

Q1.1: How are phone numbers (DIDs) currently stored on this server?
- Are they in a database table? Which database and table?
- Are they in XML config files? Which directory?
- Show me the structure (table schema or file format)

Q1.2: List all currently configured DIDs (phone numbers)
- Provide the complete list
- Include their status (active/inactive)
- Show where each is defined

Q1.3: How do I add a new DID to this server?
- What files need to be created/modified?
- Is there an API or CLI command?
- Show an example of adding DID +17678189999

Q1.4: Can DIDs be queried/searched?
- Is there a command to find routing for a specific DID?
- Example: How to find where +17678189426 routes to?

## 2. Inbound Call Routing

Q2.1: Where are inbound call routing rules defined?
- List all dialplan files in /etc/freeswitch/dialplan/
- Show the complete contents of each routing file
- Explain the routing logic

Q2.2: How do I route a DID to an external SIP address?
- Show an example dialplan XML for routing +17678189426 to sip:user@external.domain.com
- What is the correct <bridge> syntax?
- How do I reload dialplan after changes?

Q2.3: What routing rules exist for these specific DIDs?
- +17678189426
- +17678189267
- Show me the XML or config for each

Q2.4: Can routing be changed without restarting FreeSWITCH?
- What command reloads dialplan?
- Is there a hot-reload option?

## 3. SIP Configuration & Peering

Q3.1: List all SIP profiles and their configurations
- Show sofia profile details for "internal" and "external"
- What IPs and ports are they listening on?
- What codecs are allowed?

Q3.2: How do I accept SIP calls from a specific external IP?
- Example: Allow SIP from 134.199.197.42 (LiveKit server)
- Do I need ACL rules? Show me the ACL config
- Or can I use dialplan conditions?

Q3.3: List all configured SIP gateways
- Show gateway configurations
- What carriers/trunks are configured?
- How are they used in routing?

Q3.4: Can this FreeSWITCH accept calls without SIP registration?
- Is IP-based authentication enabled?
- How do I configure IP-based trust?

## 4. Outbound Call Routing

Q4.1: How are outbound calls currently routed?
- Show dialplan rules for outbound calls
- What carriers/trunks are used?
- How are calls routed based on destination number?

Q4.2: Can external SIP servers send calls through this FreeSWITCH?
- Example: Can 134.199.197.42 send a call to +15551234567 via this FreeSWITCH?
- What configuration is needed?
- Show example dialplan

Q4.3: How is caller ID handled on outbound calls?
- Is caller ID passed through from originator?
- Can it be overridden per DID?

Q4.4: What outbound carriers are configured?
- Vitelity details?
- Local trunk (23.186.240.10) details?
- Any other carriers?

## 5. CDR (Call Detail Records)

Q5.1: Is CDR logging enabled? Which module?
- mod_cdr_csv?
- mod_cdr_pg_csv (PostgreSQL)?
- mod_cdr_sqlite?
- Show the configuration file

Q5.2: Where are CDRs stored?
- If CSV: Show path to CSV files and sample records
- If database: Show database connection, table name, and schema
- How long are CDRs retained?

Q5.3: What CDR fields are captured?
- Show table structure or CSV template
- Are these fields included: caller, called, duration, billsec, disposition, accountcode?

Q5.4: How do I query CDRs?
- If database: Show SQL query example
- If CSV: Show file location and format
- Can CDRs be accessed via API?

Q5.5: Is accountcode used for user tracking?
- How is accountcode set in dialplan?
- Can I map it to external user IDs?

## 6. Current Active Configuration

Q6.1: What calls are currently active?
- Run: fs_cli -x "show calls"
- Run: fs_cli -x "show channels"

Q6.2: Show call statistics
- Total calls processed today?
- Success rate?
- Any errors in logs?

Q6.3: What modules are loaded?
- Run: fs_cli -x "module_exists mod_cdr_csv"
- Run: fs_cli -x "module_exists mod_cdr_pg_csv"
- List all loaded modules

## 7. Database Configuration

Q7.1: Is FreeSWITCH using a database?
- PostgreSQL? MySQL? SQLite?
- Show connection string
- What tables exist?

Q7.2: Is there a DID routing table in the database?
- Show table schema
- Show sample records

Q7.3: Is there a user directory in database?
- Or are users in XML files only?

## 8. Network & Firewall

Q8.1: What ports is FreeSWITCH listening on?
- Run: netstat -tulpn | grep freeswitch
- Show SIP ports (5060, 5080, etc.)
- Show RTP port range

Q8.2: Are there firewall rules restricting SIP access?
- Run: ufw status
- Or: iptables -L -n
- What IPs are allowed?

Q8.3: Can this server reach 134.199.197.42 (LiveKit)?
- Run: ping 134.199.197.42
- Run: telnet 134.199.197.42 5060

## 9. Logging & Monitoring

Q9.1: Where are FreeSWITCH logs stored?
- Show: ls -la /var/log/freeswitch/
- What's in freeswitch.log?
- Any error logs?

Q9.2: How do I monitor live calls?
- fs_cli console commands?
- Real-time logging?

Q9.3: Are there any alerts or notifications configured?
- Email on call failure?
- Monitoring tools?

## 10. File System Structure

Q10.1: Show complete FreeSWITCH directory structure
- Run: tree /etc/freeswitch/ -L 3
- Or: find /etc/freeswitch -type f -name "*.xml" | head -50

Q10.2: List all configuration files
- SIP profiles: ls /etc/freeswitch/sip_profiles/
- Dialplan: ls /etc/freeswitch/dialplan/
- Directory: ls /etc/freeswitch/directory/
- Autoload: ls /etc/freeswitch/autoload_configs/

Q10.3: Show key configuration files content
- cat /etc/freeswitch/vars.xml
- cat /etc/freeswitch/autoload_configs/switch.conf.xml
- cat /etc/freeswitch/autoload_configs/sofia.conf.xml

---

## Output Format

Please provide:
1. **Each answer with specific command output** (don't just say "it's configured", show me the actual config)
2. **File contents** where relevant (full XML/conf files)
3. **Database schemas** if database is used
4. **Actual data samples** (DIDs, routes, CDRs)
5. **Step-by-step instructions** for any "how to" questions

Create a comprehensive document with all this information organized by section. Include command examples I can copy-paste to verify or replicate the setup.

If you find anything that's NOT configured (like CDR), tell me explicitly and show me how to configure it.
```

---

## What to Do with the Response

Once the FreeSWITCH AI provides the inventory:

1. **Save the response** to a file: `FREESWITCH_INVENTORY_REPORT.md`

2. **Compare to Magnus functions** using `MAGNUS_TO_FREESWITCH_MIGRATION_CHECKLIST.md`

3. **Identify gaps**:
   - What Magnus does that FreeSWITCH doesn't have yet
   - What needs to be configured
   - What's already working

4. **Create implementation plan**:
   - Priority 1: DID routing (CRITICAL)
   - Priority 2: Outbound calling
   - Priority 3: CDR sync
   - Priority 4: Monitoring

5. **Test migration**:
   - Start with 1 DID
   - Test inbound calls
   - Test outbound calls
   - Verify CDR capture
   - Then migrate remaining DIDs

---

## Expected Information to Receive

You should get details on:

### A. DID Management
- ✓ List of all DIDs configured
- ✓ How they're stored (DB table or XML files)
- ✓ Current routing for each DID
- ✓ How to add/remove DIDs

### B. Call Routing
- ✓ Complete dialplan XML files
- ✓ Routing logic explanation
- ✓ How calls to +17678189426 and +17678189267 are handled
- ✓ External SIP bridge configuration

### C. SIP Profiles
- ✓ Internal/External profile details
- ✓ IP addresses and ports
- ✓ Codec configuration
- ✓ ACL/firewall rules

### D. CDR Configuration
- ✓ CDR module enabled (CSV/PostgreSQL/SQLite)
- ✓ Storage location
- ✓ Table/file schema
- ✓ Sample CDR records

### E. Outbound Routing
- ✓ Carrier configurations (Vitelity, local trunk)
- ✓ Routing rules by prefix
- ✓ Caller ID handling

### F. Database Setup
- ✓ Database type and connection
- ✓ Tables for DIDs, routing, CDR
- ✓ Sample data

---

## Key Questions to Answer

After receiving the inventory, you should know:

1. **Can FreeSWITCH route +17678189426 to LiveKit right now?**
   - If yes: Show me the config
   - If no: What needs to be added?

2. **Can FreeSWITCH accept outbound calls from LiveKit (134.199.197.42)?**
   - If yes: Show me the config
   - If no: What ACL/dialplan rules needed?

3. **Are CDRs being captured?**
   - If yes: Where can I find them?
   - If no: How do I enable CDR module?

4. **What carriers are configured for outbound?**
   - Vitelity config?
   - Local trunk config?
   - How to route calls to them?

5. **Can I manage DIDs via API or only manual config?**
   - Is there a REST API?
   - CLI commands?
   - Manual XML editing?

---

## Success Criteria

The inventory is complete when you can answer:

- ✓ "Here's the exact XML to route +17678189426 to LiveKit"
- ✓ "Here's how to accept outbound calls from LiveKit"
- ✓ "Here's where CDRs are stored and how to access them"
- ✓ "Here's the complete list of configured DIDs and their routing"
- ✓ "Here's how to add a new DID route in 3 steps"

---

## Time Estimate

**Inventory gathering**: 30-60 minutes (AI response time)
**Analysis**: 30 minutes
**Implementation plan**: 30 minutes
**Total**: 2-3 hours before actual migration

---

## Alternative: Run Commands Manually

If you prefer to run commands yourself instead of using AI:

```bash
# SSH to FreeSWITCH
ssh root@24.199.103.153

# Run all commands from Section 10 of the prompt
# Copy output to a file
# Share with me for analysis
```

**Commands to run** (copy-paste block):

```bash
# System info
hostname
uname -a
df -h

# FreeSWITCH status
systemctl status freeswitch
fs_cli -x "sofia status"
fs_cli -x "show calls"
fs_cli -x "show channels"

# Configuration
find /etc/freeswitch -name "*.xml" | grep -E "(dialplan|sip_profiles|directory)" | head -30
cat /etc/freeswitch/dialplan/public/*.xml

# CDR
ls -la /var/log/freeswitch/cdr-csv/ 2>/dev/null || echo "No CSV CDR"
cat /etc/freeswitch/autoload_configs/cdr*.xml 2>/dev/null

# Network
netstat -tulpn | grep freeswitch
ping -c 3 134.199.197.42
```

Save all output and share with me.
