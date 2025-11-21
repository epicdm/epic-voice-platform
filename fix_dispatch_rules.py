#!/usr/bin/env python3
"""
Fix all LiveKit SIP dispatch rules to point to the ONE physical agent
All dispatch rules should use 'epic-voice-agent' as the agent name
"""
import asyncio
import os
from dotenv import load_dotenv
from livekit import api

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL')
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
PHYSICAL_AGENT_NAME = os.getenv('AGENT_NAME', 'epic-voice-agent')

async def fix_all_dispatch_rules():
    """Update all dispatch rules to point to the physical agent"""
    lkapi = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )

    print(f"🔧 Fixing dispatch rules to use agent: {PHYSICAL_AGENT_NAME}")
    print("=" * 80)

    try:
        # List all dispatch rules
        print("\n📋 Listing all dispatch rules...")
        result = await lkapi.sip.list_dispatch_rule(
            api.ListSIPDispatchRuleRequest()
        )

        if not result.items:
            print("❌ No dispatch rules found!")
            return

        print(f"Found {len(result.items)} dispatch rule(s)\n")

        fixed_count = 0
        skipped_count = 0

        for rule in result.items:
            rule_id = rule.sip_dispatch_rule_id
            current_agent = rule.room_config.agents[0].agent_name if rule.room_config.agents else "None"

            print(f"Rule ID: {rule_id}")
            print(f"  Current agent: {current_agent}")

            if current_agent == PHYSICAL_AGENT_NAME:
                print(f"  ✅ Already correct - skipping")
                skipped_count += 1
                continue

            # Update the dispatch rule
            try:
                # Create new room config with correct agent name
                room_config = api.RoomConfiguration()
                agent_dispatch = room_config.agents.add()
                agent_dispatch.agent_name = PHYSICAL_AGENT_NAME

                # Update dispatch rule
                await lkapi.sip.update_dispatch_rule(
                    api.UpdateSIPDispatchRuleRequest(
                        sip_dispatch_rule_id=rule_id,
                        room_config=room_config
                    )
                )

                print(f"  ✅ Fixed → {PHYSICAL_AGENT_NAME}")
                fixed_count += 1

            except Exception as e:
                print(f"  ❌ Error updating: {e}")

        print("\n" + "=" * 80)
        print(f"✅ Fixed: {fixed_count}")
        print(f"⏭️  Skipped: {skipped_count}")
        print(f"📊 Total: {len(result.items)}")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(fix_all_dispatch_rules())
