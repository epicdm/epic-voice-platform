#!/usr/bin/env python3
"""
Create dispatch rule for a single phone number
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from livekit import api

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL')
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
PHYSICAL_AGENT_NAME = "tst0002"

async def create_dispatch_rule(phone_number, trunk_id):
    """Create dispatch rule for phone number"""
    lkapi = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )

    try:
        # Strip + from phone number for room prefix
        phone_digits = phone_number.replace('+', '')

        # Create room config with physical agent
        room_config = api.RoomConfiguration()
        agent_dispatch = room_config.agents.add()
        agent_dispatch.agent_name = PHYSICAL_AGENT_NAME

        # Create dispatch rule
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
        print(f"✅ Created dispatch rule: {rule_id}")
        print(f"   Phone: {phone_number}")
        print(f"   Agent: {PHYSICAL_AGENT_NAME}")
        print(f"   Trunk: {trunk_id}")

        await lkapi.aclose()
        return rule_id

    except Exception as e:
        print(f"❌ Error: {e}")
        await lkapi.aclose()
        return None

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 fix_single_number.py <phone_number> <trunk_id>")
        sys.exit(1)

    phone = sys.argv[1]
    trunk = sys.argv[2]

    rule_id = asyncio.run(create_dispatch_rule(phone, trunk))

    if rule_id:
        print(f"\nUpdate database with:")
        print(f'UPDATE phone_mappings SET "sipConfigId" = \'{rule_id}\' WHERE "phoneNumber" = \'{phone}\' AND "isActive" = true;')
