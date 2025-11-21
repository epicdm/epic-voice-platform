#!/usr/bin/env python3
"""
Check Magnus Billing SIP account configuration for both phone numbers
"""
import os
import sys

# Add pymysql or use subprocess to query Magnus directly
try:
    import pymysql
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False
    print("⚠️  pymysql not installed, using subprocess method")

def query_magnus_mysql(query):
    """Query Magnus Billing MySQL database directly"""
    import subprocess

    # Magnus DB credentials
    magnus_host = "localhost"  # Magnus is on this server
    magnus_db = "mbilling"
    magnus_user = "root"  # Usually root for local access

    cmd = [
        "mysql",
        "-h", magnus_host,
        "-u", magnus_user,
        magnus_db,
        "-e", query,
        "-s",  # Silent mode (no table borders)
        "-N"   # No column names
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Error: {result.stderr}"
    except Exception as e:
        return f"Error: {e}"

print("=" * 80)
print("Magnus Billing SIP Account Investigation")
print("=" * 80)
print()

# Query 1: Check if SIP accounts exist for both numbers
print("Checking SIP accounts...")
print("-" * 80)

query1 = """
SELECT
    username,
    id_user,
    accountcode,
    calllimit,
    allow,
    disallow,
    amaflags,
    host
FROM pkg_sip
WHERE username IN ('+17678189426', '+17678189267', '17678189426', '17678189267')
ORDER BY username;
"""

result1 = query_magnus_mysql(query1)
print(result1)
print()

# Query 2: Check user permissions and credits
print("Checking user permissions and credits...")
print("-" * 80)

query2 = """
SELECT
    u.id,
    u.username,
    u.credit,
    u.creditlimit,
    u.enabledefaultdid,
    u.restriction
FROM pkg_user u
WHERE u.id IN (
    SELECT DISTINCT id_user FROM pkg_sip
    WHERE username IN ('+17678189426', '+17678189267', '17678189426', '17678189267')
);
"""

result2 = query_magnus_mysql(query2)
print(result2)
print()

# Query 3: Check DID configuration for outbound
print("Checking DID outbound configuration...")
print("-" * 80)

query3 = """
SELECT
    did,
    activated,
    reserved,
    voip_call,
    id_user,
    fixrate
FROM pkg_did
WHERE did IN ('+17678189426', '+17678189267', '17678189426', '17678189267')
ORDER BY did;
"""

result3 = query_magnus_mysql(query3)
print(result3)
print()

# Query 4: Check if there's a trunk configuration issue
print("Checking trunk configurations...")
print("-" * 80)

query4 = """
SELECT
    id,
    trunkcode,
    trunkprefix,
    providertech,
    allow_call
FROM pkg_trunk
WHERE providertech = 'sip'
LIMIT 5;
"""

result4 = query_magnus_mysql(query4)
print(result4)
print()

print("=" * 80)
print("ANALYSIS:")
print("=" * 80)
print()
print("If SIP account is missing or has restrictions:")
print("  - Check allow/disallow codec settings")
print("  - Check calllimit settings")
print("  - Check host configuration")
print()
print("If user has insufficient credit:")
print("  - Add credit to user account")
print()
print("If DID is not activated or has voip_call=0:")
print("  - Activate DID")
print("  - Set voip_call=1 for outbound")
print()
