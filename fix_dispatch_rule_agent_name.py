#!/usr/bin/env python3
"""
Delete and recreate dispatch rule with correct agent name
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from livekit import api

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL', '').replace('wss://', 'https://')
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
PHYSICAL_AGENT_NAME = "tst0002"

async def fix_dispatch_rule(phone_number, trunk_id, old_rule_id):
    """Delete old rule and create new one with correct agent name"""
    lkapi = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )

    try:
        # Delete old dispatch rule
        print(f"🗑️  Deleting old dispatch rule: {old_rule_id}")
        from livekit.api import DeleteSIPDispatchRuleRequest
        await lkapi.sip.delete_dispatch_rule(
            DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=old_rule_id)
        )
        print(f"   ✅ Deleted")

        # Strip + from phone number for room prefix
        phone_digits = phone_number.replace('+', '')

        # Create room config with physical agent
        room_config = api.RoomConfiguration()
        agent_dispatch = room_config.agents.add()
        agent_dispatch.agent_name = PHYSICAL_AGENT_NAME

        # Create new dispatch rule
        print(f"\n📞 Creating new dispatch rule for {phone_number}")
        result = await lkapi.sip.create_dispatch_rule(
            api.CreateSIPDispatchRuleRequest(
                rule=api.SIPDispatchRule(
                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                        room_prefix=f'sip-{phone_digits}__'
                    )
                ),
                trunk_ids=[trunk_id],
                room_config=room_config
            )
        )

        rule_id = result.sip_dispatch_rule_id
        print(f"   ✅ Created: {rule_id}")
        print(f"   Phone: {phone_number}")
        print(f"   Agent: {PHYSICAL_AGENT_NAME}")
        print(f"   Trunk: {trunk_id}")

        return rule_id

    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 fix_dispatch_rule_agent_name.py <phone_number> <trunk_id> <old_rule_id>")
        sys.exit(1)

    phone = sys.argv[1]
    trunk = sys.argv[2]
    old_rule = sys.argv[3]

    new_rule_id = asyncio.run(fix_dispatch_rule(phone, trunk, old_rule))

    if new_rule_id:
        print(f"\n💾 Update database with:")
        print(f'UPDATE phone_mappings SET "sipConfigId" = \'{new_rule_id}\' WHERE "phoneNumber" = \'{phone}\' AND "isActive" = true;')
