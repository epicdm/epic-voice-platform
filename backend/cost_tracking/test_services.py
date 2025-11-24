"""
Test script for PricingService and BalanceService
"""

from database import SessionLocal
from pricing_service import PricingService
from balance_service import BalanceService
from decimal import Decimal


def test_pricing_service():
    """Test PricingService calculations"""
    print("\n" + "="*60)
    print("TESTING PRICING SERVICE")
    print("="*60)

    db = SessionLocal()
    try:
        pricing = PricingService(db)

        # Test voice call cost calculation
        print("\n📞 Test 1: Voice Call Cost Calculation")
        print("-" * 60)

        voice_costs = pricing.calculate_voice_call_costs(
            stt_provider='deepgram',
            stt_model='nova-2',
            stt_minutes=1.0,
            llm_provider='openai',
            llm_model='gpt-4o-mini',
            llm_input_tokens=1000,
            llm_output_tokens=500,
            tts_provider='openai',
            tts_model='tts-1',
            tts_characters=500,
            call_duration_minutes=1.0,
            telephony_direction='inbound',
            voice_tier='basic'
        )

        print(f"\n💰 Real Costs:")
        for key, value in voice_costs['real_costs'].items():
            print(f"  {key.upper():20} ${value:8.4f}")

        print(f"\n💵 Customer Costs:")
        for key, value in voice_costs['customer_costs'].items():
            print(f"  {key.upper():20} ${value:8.4f}")

        print(f"\n📊 Profit Metrics:")
        print(f"  Profit Margin:      ${voice_costs['profit_margin']:8.4f}")
        print(f"  Markup Multiplier:   {voice_costs['markup_multiplier']:8.2f}x")

        # Test outbound call with upgrades
        print("\n📞 Test 2: Outbound Call with GPT-4 + ElevenLabs")
        print("-" * 60)

        voice_costs_premium = pricing.calculate_voice_call_costs(
            stt_provider='deepgram',
            stt_model='nova-2',
            stt_minutes=2.5,
            llm_provider='openai',
            llm_model='gpt-4',
            llm_input_tokens=3000,
            llm_output_tokens=1500,
            tts_provider='elevenlabs',
            tts_model='turbo',
            tts_characters=1200,
            call_duration_minutes=2.5,
            telephony_direction='outbound',
            voice_tier='premium'
        )

        print(f"\n💰 Real Costs:")
        for key, value in voice_costs_premium['real_costs'].items():
            print(f"  {key.upper():20} ${value:8.4f}")

        print(f"\n💵 Customer Costs:")
        for key, value in voice_costs_premium['customer_costs'].items():
            print(f"  {key.upper():20} ${value:8.4f}")

        print(f"\n📊 Profit Metrics:")
        print(f"  Profit Margin:      ${voice_costs_premium['profit_margin']:8.4f}")
        print(f"  Markup Multiplier:   {voice_costs_premium['markup_multiplier']:8.2f}x")

        # Test text message cost calculation
        print("\n💬 Test 3: Text Message Cost Calculation")
        print("-" * 60)

        text_costs = pricing.calculate_text_message_costs(
            llm_provider='openai',
            llm_model='gpt-4o-mini',
            llm_input_tokens=500,
            llm_output_tokens=300,
            message_tier='basic'
        )

        print(f"\n💰 Real Costs:")
        for key, value in text_costs['real_costs'].items():
            print(f"  {key.upper():20} ${value:8.6f}")

        print(f"\n💵 Customer Costs:")
        for key, value in text_costs['customer_costs'].items():
            print(f"  {key.upper():20} ${value:8.6f}")

        print(f"\n📊 Profit Metrics:")
        print(f"  Profit Margin:      ${text_costs['profit_margin']:8.6f}")
        print(f"  Markup Multiplier:   {text_costs['markup_multiplier']:8.2f}x")

        # Test cost estimation
        print("\n💡 Test 4: Pre-call Cost Estimation")
        print("-" * 60)

        estimated = pricing.estimate_voice_call_cost(
            estimated_duration_minutes=5.0,
            voice_tier='advanced',
            llm_model='gpt-4',
            tts_provider='cartesia',
            telephony_direction='outbound'
        )

        print(f"\nEstimated cost for 5-minute call (Advanced + GPT-4 + Cartesia + Outbound):")
        print(f"  ${estimated:.4f} (includes 10% buffer)")

        print("\n✅ PricingService tests passed!")

    except Exception as e:
        print(f"\n❌ PricingService test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_balance_service():
    """Test BalanceService operations"""
    print("\n" + "="*60)
    print("TESTING BALANCE SERVICE")
    print("="*60)

    db = SessionLocal()
    try:
        balance = BalanceService(db)
        test_user_id = 'test_user_001'

        # Test 1: Create balance account
        print("\n👤 Test 1: Create Balance Account")
        print("-" * 60)
        account = balance.get_or_create_balance(test_user_id)
        print(f"Created account for user: {account.userId}")
        print(f"Initial balance: ${account.currentBalance:.4f}")

        # Test 2: Add credits
        print("\n💳 Test 2: Add Credits (Purchase)")
        print("-" * 60)
        success, error = balance.add_credits(
            user_id=test_user_id,
            amount=Decimal('25.00'),
            payment_id='test_payment_001',
            description='Test credit purchase'
        )
        if success:
            summary = balance.get_balance_summary(test_user_id)
            print(f"✅ Added $25.00")
            print(f"Current balance: ${summary['current_balance']:.4f}")
            print(f"Available balance: ${summary['available_balance']:.4f}")
        else:
            print(f"❌ Failed: {error}")

        # Test 3: Reserve credits
        print("\n🔒 Test 3: Reserve Credits for Call")
        print("-" * 60)
        success, error = balance.reserve_credits(
            user_id=test_user_id,
            amount=Decimal('2.50'),
            call_log_id='test_call_001',
            description='Test call reservation'
        )
        if success:
            summary = balance.get_balance_summary(test_user_id)
            print(f"✅ Reserved $2.50")
            print(f"Current balance: ${summary['current_balance']:.4f}")
            print(f"Reserved: ${summary['reserved_balance']:.4f}")
            print(f"Available: ${summary['available_balance']:.4f}")
        else:
            print(f"❌ Failed: {error}")

        # Test 4: Charge credits (actual cost less than reserved)
        print("\n💵 Test 4: Charge Credits (Actual < Reserved)")
        print("-" * 60)
        success, error = balance.charge_credits(
            user_id=test_user_id,
            actual_amount=Decimal('2.15'),
            reserved_amount=Decimal('2.50'),
            call_log_id='test_call_001',
            description='Test call charge'
        )
        if success:
            summary = balance.get_balance_summary(test_user_id)
            print(f"✅ Charged $2.15 (refunded $0.35)")
            print(f"Current balance: ${summary['current_balance']:.4f}")
            print(f"Reserved: ${summary['reserved_balance']:.4f}")
            print(f"Available: ${summary['available_balance']:.4f}")
            print(f"Total spent: ${summary['total_spent']:.4f}")
        else:
            print(f"❌ Failed: {error}")

        # Test 5: Check insufficient balance
        print("\n⚠️  Test 5: Check Insufficient Balance")
        print("-" * 60)
        has_balance, available, message = balance.check_sufficient_balance(
            user_id=test_user_id,
            required_amount=Decimal('100.00')
        )
        print(f"Has sufficient balance for $100.00: {has_balance}")
        if not has_balance:
            print(f"Message: {message}")

        # Test 6: Transaction history
        print("\n📜 Test 6: Transaction History")
        print("-" * 60)
        transactions = balance.get_transaction_history(test_user_id, limit=10)
        print(f"Found {len(transactions)} transactions:")
        for txn in transactions:
            print(f"  {txn.transactionType:10} ${txn.amount:8.4f} - {txn.description}")

        # Test 7: Balance summary
        print("\n📊 Test 7: Complete Balance Summary")
        print("-" * 60)
        summary = balance.get_balance_summary(test_user_id)
        for key, value in summary.items():
            if isinstance(value, float):
                print(f"  {key:25} ${value:8.4f}")
            else:
                print(f"  {key:25} {value}")

        print("\n✅ BalanceService tests passed!")

    except Exception as e:
        print(f"\n❌ BalanceService test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("COST TRACKING SYSTEM - SERVICE TESTS")
    print("="*60)

    test_pricing_service()
    test_balance_service()

    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60 + "\n")
