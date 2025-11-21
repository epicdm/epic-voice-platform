#!/usr/bin/env python3
"""
Check dispatch rule configuration in LiveKit
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from livekit import api

load_dotenv()

async def check_rule(rule_id):
    """Check if a specific dispatch rule exists"""
    lkapi = api.LiveKitAPI(
        url=os.getenv('LIVEKIT_URL', '').replace('wss://', 'https://'),
        api_key=os.getenv('LIVEKIT_API_KEY'),
        api_secret=os.getenv('LIVEKIT_API_SECRET')
    )

    try:
        # List all dispatch rules
        from livekit.api import ListSIPDispatchRuleRequest

        response = await lkapi.sip.list_dispatch_rule(
            ListSIPDispatchRuleRequest()
        )

        print(f"Total dispatch rules: {len(response.items)}")
        print("=" * 80)

        # Find the specific rule
        for rule in response.items:
            if rule_id and rule.sip_dispatch_rule_id != rule_id:
                continue

            print(f"\n📋 Dispatch Rule: {rule.sip_dispatch_rule_id}")
            print(f"   Trunk IDs: {list(rule.trunk_ids)}")

            if rule.rule.dispatch_rule_individual:
                print(f"   Type: Individual")
                print(f"   Room prefix: {rule.rule.dispatch_rule_individual.room_prefix}")
            elif rule.rule.dispatch_rule_direct:
                print(f"   Type: Direct")
                print(f"   Room name: {rule.rule.dispatch_rule_direct.room_name}")

            # Check room config
            if rule.room_config and rule.room_config.agents:
                print(f"   Agents: {[a.agent_name for a in rule.room_config.agents]}")

            if rule_id:
                break

    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    rule_id = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(check_rule(rule_id))
