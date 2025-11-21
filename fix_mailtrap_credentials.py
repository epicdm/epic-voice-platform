#!/usr/bin/env python3
"""
Fix Mailtrap credentials by deleting old ones and keeping only the new one
"""
import requests
import os

N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'

headers = {'X-N8N-API-KEY': N8N_API_KEY}

# Get all credentials
resp = requests.get(f"{N8N_URL}/api/v1/credentials", headers=headers)
creds = resp.json()['data']

# Find all Platform SMTP credentials
smtp_creds = [c for c in creds if c['name'] == 'Platform SMTP']

print(f"Found {len(smtp_creds)} 'Platform SMTP' credentials")

# Keep only the newest one, delete the rest
if len(smtp_creds) > 1:
    smtp_creds.sort(key=lambda x: x['createdAt'], reverse=True)
    keep = smtp_creds[0]
    delete = smtp_creds[1:]

    print(f"\nKeeping: {keep['id']} (created {keep['createdAt']})")
    print(f"Deleting {len(delete)} old credential(s):")

    for cred in delete:
        print(f"  - {cred['id']} (created {cred['createdAt']})")
        try:
            resp = requests.delete(f"{N8N_URL}/api/v1/credentials/{cred['id']}", headers=headers)
            if resp.status_code == 200:
                print(f"    ✅ Deleted")
            else:
                print(f"    ❌ Failed: {resp.status_code}")
        except Exception as e:
            print(f"    ❌ Error: {e}")

    print(f"\n✅ Done! Only one 'Platform SMTP' credential remains: {keep['id']}")
else:
    print("✅ Only one 'Platform SMTP' credential found - no cleanup needed")
