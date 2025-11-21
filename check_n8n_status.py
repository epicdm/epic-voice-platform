#!/usr/bin/env python3
import requests
import json

N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'
WORKFLOW_ID = '9q0gb6bDn3wza1EP'

headers = {'X-N8N-API-KEY': N8N_API_KEY}

# Get recent executions
print("Fetching recent executions...")
resp = requests.get(f"{N8N_URL}/api/v1/executions?workflowId={WORKFLOW_ID}&limit=5", headers=headers)
if resp.status_code == 200:
    execs = resp.json()
    print(f"\nTotal executions: {len(execs.get('data', []))}")

    for i, e in enumerate(execs.get('data', [])[:3]):
        print(f"\nExecution {i+1}:")
        print(f"  ID: {e.get('id')}")
        print(f"  Status: {e.get('status')}")
        print(f"  Finished: {e.get('finished')}")
        print(f"  Started: {e.get('startedAt')}")
        if e.get('stoppedAt'):
            print(f"  Stopped: {e.get('stoppedAt')}")

        # Get detailed execution data
        exec_id = e.get('id')
        detail_resp = requests.get(f"{N8N_URL}/api/v1/executions/{exec_id}", headers=headers)
        if detail_resp.status_code == 200:
            detail = detail_resp.json()
            if detail.get('data', {}).get('resultData', {}).get('error'):
                error = detail['data']['resultData']['error']
                print(f"  Error Message: {error.get('message', 'Unknown')}")
else:
    print(f"Error: {resp.status_code}")
    print(resp.text)
