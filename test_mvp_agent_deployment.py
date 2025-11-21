#!/usr/bin/env python3
"""
MVP Test: Deploy Agent and Assign Phone Number
Part 2 of MVP test - deployment and phone assignment
"""
import sys
sys.path.insert(0, '/opt/livekit1')

from database import SessionLocal, AgentConfig, LiveKitAgent, User
from phone_number_manager import PhoneNumberPool
from datetime import datetime

print("=" * 60)
print("MVP TEST: Agent Deployment and Phone Assignment")
print("=" * 60)
print(f"Time: {datetime.now()}")
print()

USER_EMAIL = "giraud.eric@gmail.com"
TEST_AGENT_NAME = "MVP Test Agent"

db = SessionLocal()

try:
    # Get user
    user = db.query(User).filter(User.email == USER_EMAIL).first()
    if not user:
        print("❌ ERROR: User not found")
        exit(1)
    user_id = user.id
    print(f"✅ User ID: {user_id}")
    print()

    # Get test agent
    agent = db.query(AgentConfig).filter(
        AgentConfig.name == TEST_AGENT_NAME,
        AgentConfig.userId == user_id
    ).first()

    if not agent:
        print(f"❌ ERROR: Agent '{TEST_AGENT_NAME}' not found")
        exit(1)

    print(f"📋 Agent Found: {agent.name}")
    print(f"   ID: {agent.id}")
    print(f"   Current Status: {agent.status}")
    print()

    # Step 1: Deploy Agent
    print("=" * 60)
    print("STEP 1: DEPLOY AGENT")
    print("=" * 60)

    # Check for tst0002 LiveKit agent
    livekit_agent = db.query(LiveKitAgent).filter(
        LiveKitAgent.name == 'tst0002'
    ).first()

    if not livekit_agent:
        print("❌ ERROR: LiveKit infrastructure agent (tst0002) not found")
        print("   The backend needs the tst0002 agent running")
        exit(1)

    print(f"✅ Found LiveKit Agent: tst0002 (ID: {livekit_agent.id})")

    # Activate agent
    agent.isActive = True
    agent.status = 'deployed'
    agent.livekitAgentId = livekit_agent.id
    db.commit()

    print(f"✅ Agent Deployed Successfully!")
    print(f"   Status: {agent.status}")
    print(f"   Linked to: tst0002")
    print()

    # Step 2: Assign Phone Number
    print("=" * 60)
    print("STEP 2: ASSIGN PHONE NUMBER")
    print("=" * 60)

    # Find an available phone number
    available_number = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.status == 'available',
        PhoneNumberPool.provider == 'magnus'
    ).first()

    if not available_number:
        print("❌ ERROR: No available phone numbers")
        print("   You need to provision a phone number first")
        print("   Go to: https://ai.epic.dm/dashboard/phone-numbers")
        exit(1)

    print(f"📞 Found Available Number: {available_number.phone_number}")
    print(f"   Provider: {available_number.provider}")
    print(f"   Inbound Trunk: {available_number.livekit_inbound_trunk_id}")
    print(f"   Outbound Trunk: {available_number.livekit_outbound_trunk_id}")
    print()

    # Assign phone to agent
    available_number.status = 'assigned'
    available_number.assigned_to_user_id = user_id
    available_number.assigned_to_agent_id = agent.id
    available_number.agent_name = agent.name

    # Update agent with phone
    agent.did_number = available_number.phone_number

    db.commit()

    print(f"✅ Phone Number Assigned!")
    print(f"   Agent: {agent.name}")
    print(f"   Phone: {agent.did_number}")
    print()

    # Step 3: Verification
    print("=" * 60)
    print("STEP 3: VERIFICATION")
    print("=" * 60)

    # Reload agent to verify
    db.refresh(agent)

    print(f"Agent Configuration:")
    print(f"   ✅ Name: {agent.name}")
    print(f"   ✅ Status: {agent.status}")
    print(f"   ✅ Active: {agent.isActive}")
    print(f"   ✅ Phone: {agent.did_number}")
    print(f"   ✅ LiveKit Agent: tst0002")
    print(f"   ✅ LLM: {agent.llmProvider}/{agent.llmModel}")
    print(f"   ✅ Voice: {agent.voice}")
    print(f"   ✅ Language: {agent.language}")
    print()

    # Step 4: Test Instructions
    print("=" * 60)
    print("STEP 4: MAKE TEST CALL")
    print("=" * 60)
    print()
    print(f"📱 CALL THIS NUMBER FROM YOUR PHONE:")
    print(f"   {agent.did_number}")
    print()
    print("✅ WHAT TO TEST:")
    print("   1. Agent answers within 3 seconds")
    print("   2. Greeting plays correctly:")
    print(f"      '{agent.greetingMessage}'")
    print("   3. Agent understands your speech")
    print("   4. Agent responds intelligently")
    print("   5. Voice quality is good")
    print("   6. No lag or delay")
    print("   7. Can interrupt the agent")
    print("   8. Call ends cleanly")
    print()
    print("📊 AFTER THE CALL:")
    print("   1. Check: https://ai.epic.dm/dashboard/calls")
    print("   2. Verify call appears in log")
    print("   3. Check call duration")
    print("   4. Review any errors")
    print()

    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Agent Created: {agent.name}")
    print(f"✅ Agent Deployed: {agent.status}")
    print(f"✅ Phone Assigned: {agent.did_number}")
    print(f"✅ Ready for Testing!")
    print()
    print(f"🎯 NEXT ACTION: Call {agent.did_number} from your phone")
    print()

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    print(traceback.format_exc())
    exit(1)
finally:
    db.close()

print("✅ Deployment Complete!")
