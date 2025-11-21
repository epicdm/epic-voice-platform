#!/usr/bin/env python3
import json

with open('/tmp/workflow.json') as f:
    w = json.load(f)

conns = w.get('connections', {})
nodes = w.get('nodes', [])

print("Workflow Nodes:")
for node in nodes:
    print(f"  - {node['name']}: {node['type']}")

print("\nConnections:")
for source in conns:
    targets = conns[source].get('main', [[]])[0]
    for target in targets:
        print(f"  {source} -> {target['node']}")

print(f"\nWebhook Trigger connected: {'Webhook Trigger' in conns}")

# Check what first node should be
if nodes:
    first_non_trigger = None
    for node in nodes:
        if 'Trigger' not in node['name']:
            first_non_trigger = node['name']
            break

    print(f"First non-trigger node: {first_non_trigger}")
    if first_non_trigger and 'Webhook Trigger' in [n['name'] for n in nodes]:
        print(f"\nExpected connection: Webhook Trigger -> {first_non_trigger}")
        print(f"Exists: {'Webhook Trigger' in conns}")
