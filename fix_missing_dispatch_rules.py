#!/usr/bin/env python3
"""
Create missing dispatch rules for all phone numbers assigned to deployed agents
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from livekit import api
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
LIVEKIT_URL = os.getenv('LIVEKIT_URL')
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
PHYSICAL_AGENT_NAME = "tst0002"

async def fix_missing_dispatch_rules():
    """Create dispatch rules for all phone numbers missing them (deployed agents only)"""

    # Connect to database
    engine = create_engine(DATABASE_URL)

    # Connect to LiveKit
    lkapi = api.LiveKitAPI(
        url=LIVEKIT_URL,
        api_key=LIVEKIT_API_KEY,
        api_secret=LIVEKIT_API_SECRET
    )

    print("🔧 Creating missing dispatch rules for deployed agents")
    print("=" * 80)

    try:
        with engine.connect() as conn:
            # Find all phone numbers with missing dispatch rules (deployed agents only)
            query = text("""
                SELECT
                    pn."phoneNumber",
                    pn."livekitInboundTrunkId" as trunk_id,
                    pm.id as mapping_id,
                    ac.name as agent_name,
                    ac.status
                FROM phone_mappings pm
                JOIN phone_number_pool pn ON pm."phoneNumber" = pn."phoneNumber"
                JOIN agent_configs ac ON pm."agentConfigId" = ac.id
                WHERE pm."isActive" = true
                  AND (pm."sipConfigId" IS NULL OR pm."sipConfigId" = '')
                  AND ac.status = 'deployed'
                ORDER BY pm."createdAt" DESC
            """)

            results = conn.execute(query).fetchall()

            if not results:
                print("✅ No missing dispatch rules for deployed agents!")
                return

            print(f"Found {len(results)} phone number(s) needing dispatch rules\n")

            created_count = 0

            for row in results:
                phone = row.phoneNumber
                trunk_id = row.trunk_id
                mapping_id = row.mapping_id
                agent_name = row.agent_name

                # Strip + from phone number for room prefix
                phone_digits = phone.replace('+', '')

                print(f"📞 {phone} ({agent_name})")
                print(f"   Trunk: {trunk_id}")

                if not trunk_id:
                    print(f"   ❌ No trunk ID - skipping")
                    continue

                try:
                    # Create room config
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
                    print(f"   ✅ Created: {rule_id}")

                    # Update database
                    update_query = text("""
                        UPDATE phone_mappings
                        SET "sipConfigId" = :rule_id
                        WHERE id = :mapping_id
                    """)
                    conn.execute(update_query, {"rule_id": rule_id, "mapping_id": mapping_id})
                    conn.commit()

                    created_count += 1

                except Exception as e:
                    print(f"   ❌ Error: {e}")

            print("\n" + "=" * 80)
            print(f"✅ Created {created_count} dispatch rule(s)")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(fix_missing_dispatch_rules())
