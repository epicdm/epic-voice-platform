#!/usr/bin/env python3
"""
LiveKit SIP Telephony Setup Script
Configures inbound/outbound trunks and dispatch rules for AI voice agents
"""

import asyncio
import os
from dotenv import load_dotenv
from livekit import api
from livekit.protocol.sip import (
    CreateSIPInboundTrunkRequest,
    CreateSIPOutboundTrunkRequest,
    CreateSIPDispatchRuleRequest,
    ListSIPInboundTrunkRequest,
    ListSIPOutboundTrunkRequest,
    ListSIPDispatchRuleRequest,
    SIPInboundTrunkInfo,
    SIPOutboundTrunkInfo,
    SIPDispatchRuleInfo,
    SIPDispatchRule,
    SIPDispatchRuleIndividual,
)
from livekit.protocol.room import RoomConfiguration
from livekit.protocol.models import RoomAgentDispatch

load_dotenv()


async def list_existing_config():
    """List existing SIP configuration"""
    print("\n" + "=" * 70)
    print("CHECKING EXISTING LIVEKIT SIP CONFIGURATION")
    print("=" * 70)

    lkapi = api.LiveKitAPI()

    try:
        # List inbound trunks
        print("\n📞 INBOUND TRUNKS:")
        inbound_trunks = await lkapi.sip.list_sip_inbound_trunk(
            ListSIPInboundTrunkRequest()
        )
        if inbound_trunks.items:
            for trunk in inbound_trunks.items:
                print(f"  ✓ {trunk.name}")
                print(f"    ID: {trunk.sip_trunk_id}")
                print(f"    Numbers: {trunk.numbers}")
                print(f"    Krisp: {trunk.krisp_enabled}")
        else:
            print("  (none configured)")

        # List outbound trunks
        print("\n📲 OUTBOUND TRUNKS:")
        outbound_trunks = await lkapi.sip.list_sip_outbound_trunk(
            ListSIPOutboundTrunkRequest()
        )
        if outbound_trunks.items:
            for trunk in outbound_trunks.items:
                print(f"  ✓ {trunk.name}")
                print(f"    ID: {trunk.sip_trunk_id}")
                print(f"    Address: {trunk.address}")
                print(f"    Numbers: {trunk.numbers}")
        else:
            print("  (none configured)")

        # List dispatch rules
        print("\n🎯 DISPATCH RULES:")
        dispatch_rules = await lkapi.sip.list_sip_dispatch_rule(
            ListSIPDispatchRuleRequest()
        )
        if dispatch_rules.items:
            for rule in dispatch_rules.items:
                print(f"  ✓ {rule.name}")
                print(f"    ID: {rule.sip_dispatch_rule_id}")
                print(f"    Type: {rule.rule}")
        else:
            print("  (none configured)")

        return {
            'inbound': inbound_trunks.items,
            'outbound': outbound_trunks.items,
            'dispatch': dispatch_rules.items
        }

    finally:
        await lkapi.aclose()


async def create_inbound_trunk(phone_numbers: list[str]):
    """Create SIP Inbound Trunk for receiving calls"""
    print("\n" + "=" * 70)
    print("CREATING SIP INBOUND TRUNK")
    print("=" * 70)

    lkapi = api.LiveKitAPI()

    try:
        trunk = SIPInboundTrunkInfo(
            name="Epic Voice Inbound Trunk",
            numbers=phone_numbers,
            # Accept calls from anywhere (no IP restrictions)
            allowed_addresses=[],
            # Accept calls from any number (can restrict later)
            allowed_numbers=[],
            # Enable Krisp noise cancellation
            krisp_enabled=True,
            # Optional: Add custom headers for identification
            headers={
                "X-Epic-Voice": "true",
                "X-Platform": "LiveKit"
            },
            # Map SIP headers to participant attributes
            headers_to_attributes={
                "X-Customer-ID": "customer_id",
            },
            # Maximum call duration (1 hour)
            # max_call_duration=google.protobuf.Duration(seconds=3600),
        )

        request = CreateSIPInboundTrunkRequest(trunk=trunk)
        result = await lkapi.sip.create_sip_inbound_trunk(request)

        print(f"\n✅ Created Inbound Trunk: {result.name}")
        print(f"   Trunk ID: {result.sip_trunk_id}")
        print(f"   Numbers: {result.numbers}")
        print(f"   Krisp Enabled: {result.krisp_enabled}")

        return result.sip_trunk_id

    except Exception as e:
        print(f"\n❌ Error creating inbound trunk: {e}")
        raise
    finally:
        await lkapi.aclose()


async def create_dispatch_rule(agent_name: str, trunk_ids: list[str] = None):
    """
    Create Dispatch Rule to route incoming calls to AI agents

    Args:
        agent_name: Name of the deployed LiveKit agent (from agent deployment)
        trunk_ids: Optional list of trunk IDs. If empty, matches ALL trunks
    """
    print("\n" + "=" * 70)
    print("CREATING SIP DISPATCH RULE")
    print("=" * 70)

    lkapi = api.LiveKitAPI()

    try:
        # Create individual dispatch rule (one room per caller)
        # This automatically deploys an agent to each new room
        rule = SIPDispatchRule(
            dispatch_rule_individual=SIPDispatchRuleIndividual(
                room_prefix="call-",  # Rooms will be named "call-<phone-number>-<random>"
            )
        )

        # Configure room to automatically dispatch agent
        room_config = RoomConfiguration(
            agents=[
                RoomAgentDispatch(
                    agent_name=agent_name,  # CRITICAL: This must match your deployed agent name
                    metadata='{"source": "inbound_call"}',
                )
            ]
        )

        dispatch_info = SIPDispatchRuleInfo(
            rule=rule,
            name="Epic Voice AI Agent Dispatcher",
            trunk_ids=trunk_ids or [],  # Empty = match all trunks
            hide_phone_number=False,  # Show phone number in participant identity
            metadata='{"platform": "epic-voice"}',
            attributes={
                "call_type": "inbound",
                "platform": "epic-voice",
            },
            room_config=room_config,
        )

        request = CreateSIPDispatchRuleRequest(dispatch_rule=dispatch_info)
        result = await lkapi.sip.create_sip_dispatch_rule(request)

        print(f"\n✅ Created Dispatch Rule: {result.name}")
        print(f"   Rule ID: {result.sip_dispatch_rule_id}")
        print(f"   Type: Individual (one room per caller)")
        print(f"   Agent: {agent_name}")
        print(f"   Room Prefix: call-")
        print(f"   Trunk IDs: {result.trunk_ids or 'ALL'}")

        return result.sip_dispatch_rule_id

    except Exception as e:
        print(f"\n❌ Error creating dispatch rule: {e}")
        raise
    finally:
        await lkapi.aclose()


async def create_outbound_trunk(
    address: str,
    phone_numbers: list[str],
    auth_username: str = None,
    auth_password: str = None,
):
    """
    Create SIP Outbound Trunk for making calls

    Args:
        address: SIP provider address (e.g., 'sip.telnyx.com' or '<trunk>.pstn.twilio.com')
        phone_numbers: List of numbers to call FROM
        auth_username: SIP auth username
        auth_password: SIP auth password
    """
    print("\n" + "=" * 70)
    print("CREATING SIP OUTBOUND TRUNK")
    print("=" * 70)

    lkapi = api.LiveKitAPI()

    try:
        trunk = SIPOutboundTrunkInfo(
            name="Epic Voice Outbound Trunk",
            address=address,
            numbers=phone_numbers,
            auth_username=auth_username,
            auth_password=auth_password,
            # Custom headers to identify LiveKit calls
            headers={
                "X-Epic-Voice": "true",
                "X-Platform": "LiveKit"
            },
        )

        request = CreateSIPOutboundTrunkRequest(trunk=trunk)
        result = await lkapi.sip.create_sip_outbound_trunk(request)

        print(f"\n✅ Created Outbound Trunk: {result.name}")
        print(f"   Trunk ID: {result.sip_trunk_id}")
        print(f"   Address: {result.address}")
        print(f"   Numbers: {result.numbers}")

        return result.sip_trunk_id

    except Exception as e:
        print(f"\n❌ Error creating outbound trunk: {e}")
        raise
    finally:
        await lkapi.aclose()


async def setup_telephony(
    phone_numbers: list[str],
    agent_name: str,
    sip_provider_address: str = None,
    sip_username: str = None,
    sip_password: str = None,
):
    """
    Complete telephony setup

    Args:
        phone_numbers: List of phone numbers (e.g., ['+15105550100'])
        agent_name: Deployed agent name in LiveKit Cloud
        sip_provider_address: Optional SIP provider address for outbound
        sip_username: Optional SIP auth username
        sip_password: Optional SIP auth password
    """
    print("\n" + "🎙️  " * 20)
    print("LIVEKIT SIP TELEPHONY SETUP")
    print("🎙️  " * 20)

    # Check existing config
    existing = await list_existing_config()

    # Create inbound trunk
    if not existing['inbound']:
        inbound_trunk_id = await create_inbound_trunk(phone_numbers)
    else:
        print("\n⚠️  Inbound trunk already exists, skipping creation")
        inbound_trunk_id = existing['inbound'][0].sip_trunk_id

    # Create dispatch rule
    if not existing['dispatch']:
        dispatch_rule_id = await create_dispatch_rule(
            agent_name=agent_name,
            trunk_ids=[inbound_trunk_id]
        )
    else:
        print("\n⚠️  Dispatch rule already exists, skipping creation")
        dispatch_rule_id = existing['dispatch'][0].sip_dispatch_rule_id

    # Create outbound trunk (optional)
    if sip_provider_address and not existing['outbound']:
        outbound_trunk_id = await create_outbound_trunk(
            address=sip_provider_address,
            phone_numbers=phone_numbers,
            auth_username=sip_username,
            auth_password=sip_password,
        )
    elif existing['outbound']:
        print("\n⚠️  Outbound trunk already exists, skipping creation")
        outbound_trunk_id = existing['outbound'][0].sip_trunk_id
    else:
        print("\n⚠️  No SIP provider configured, skipping outbound trunk")
        outbound_trunk_id = None

    # Summary
    print("\n" + "=" * 70)
    print("✅ SETUP COMPLETE!")
    print("=" * 70)
    print(f"\n📞 Inbound Trunk ID: {inbound_trunk_id}")
    print(f"🎯 Dispatch Rule ID: {dispatch_rule_id}")
    if outbound_trunk_id:
        print(f"📲 Outbound Trunk ID: {outbound_trunk_id}")

    print("\n" + "🎉 " * 20)
    print("READY TO RECEIVE CALLS!")
    print("🎉 " * 20)

    print(f"\n📋 Next Steps:")
    print(f"1. Call one of your numbers: {phone_numbers}")
    print(f"2. LiveKit will create a room named 'call-<phone>-<random>'")
    print(f"3. Your agent '{agent_name}' will join automatically")
    print(f"4. Check calls in: https://ai.epic.dm/dashboard/calls")
    print(f"5. Monitor in LiveKit Cloud: https://cloud.livekit.io/")


async def main():
    """Main entry point"""

    # Configuration - CUSTOMIZE THESE
    PHONE_NUMBERS = [
        "+15105550100",  # Replace with your actual phone number(s)
    ]

    # IMPORTANT: This must match the agent NAME in LiveKit Cloud
    # Check: https://cloud.livekit.io/projects/p_/agents
    AGENT_NAME = "epic-voice-agent"  # UPDATE THIS!

    # Optional: Outbound trunk configuration
    SIP_PROVIDER = os.getenv("EPIC_SIP_DOMAIN")  # e.g., "sip.telnyx.com"
    SIP_USERNAME = os.getenv("SIP_AUTH_USERNAME")
    SIP_PASSWORD = os.getenv("SIP_AUTH_PASSWORD")

    # Validate LiveKit credentials
    if not os.getenv("LIVEKIT_URL"):
        print("❌ Error: LIVEKIT_URL not set in .env")
        return
    if not os.getenv("LIVEKIT_API_KEY"):
        print("❌ Error: LIVEKIT_API_KEY not set in .env")
        return
    if not os.getenv("LIVEKIT_API_SECRET"):
        print("❌ Error: LIVEKIT_API_SECRET not set in .env")
        return

    print(f"\n📌 Configuration:")
    print(f"   LiveKit URL: {os.getenv('LIVEKIT_URL')}")
    print(f"   Phone Numbers: {PHONE_NUMBERS}")
    print(f"   Agent Name: {AGENT_NAME}")
    print(f"   SIP Provider: {SIP_PROVIDER or 'Not configured'}")

    # Run setup
    await setup_telephony(
        phone_numbers=PHONE_NUMBERS,
        agent_name=AGENT_NAME,
        sip_provider_address=SIP_PROVIDER,
        sip_username=SIP_USERNAME,
        sip_password=SIP_PASSWORD,
    )


if __name__ == "__main__":
    asyncio.run(main())
