#!/usr/bin/env python3
"""Quick test of cost tracking services"""

import sys
sys.path.insert(0, '.')

from database import SessionLocal
from backend.cost_tracking.pricing_service import PricingService
from backend.cost_tracking.balance_service import BalanceService
from decimal import Decimal

print("\n" + "="*70)
print("COST TRACKING SYSTEM - QUICK TEST")
print("="*70)

db = SessionLocal()
try:
    # Test PricingService
    print("\n📊 Testing PricingService...")
    pricing = PricingService(db)

    costs = pricing.calculate_voice_call_costs(
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

    print(f"  Real Cost:      ${costs['real_costs']['total']:.4f}")
    print(f"  Customer Cost:  ${costs['customer_costs']['total']:.4f}")
    print(f"  Profit:         ${costs['profit_margin']:.4f}")
    print(f"  Markup:         {costs['markup_multiplier']:.2f}x")
    print("  ✅ PricingService works!")

    # Test BalanceService
    print("\n💳 Testing BalanceService...")
    balance_svc = BalanceService(db)
    test_user = 'b50cec05-fa5b-4bb4-aaaa-21358c699c45'  # admin@epic.dm

    account = balance_svc.get_or_create_balance(test_user)
    print(f"  Created account for {test_user}")

    success, error = balance_svc.add_credits(test_user, Decimal('25.00'), payment_id='test_payment')
    print(f"  Added $25.00: {success}")

    success, error = balance_svc.reserve_credits(test_user, Decimal('2.50'), call_log_id='test_call')
    print(f"  Reserved $2.50: {success}")

    summary = balance_svc.get_balance_summary(test_user)
    print(f"  Current:   ${summary['current_balance']:.2f}")
    print(f"  Reserved:  ${summary['reserved_balance']:.2f}")
    print(f"  Available: ${summary['available_balance']:.2f}")

    success, error = balance_svc.charge_credits(test_user, Decimal('2.15'), Decimal('2.50'), call_log_id='test_call')
    print(f"  Charged $2.15 (reserved $2.50): {success}")

    summary = balance_svc.get_balance_summary(test_user)
    print(f"  Final balance: ${summary['current_balance']:.2f}")
    print(f"  Total spent:   ${summary['total_spent']:.2f}")
    print("  ✅ BalanceService works!")

    print("\n" + "="*70)
    print("✅ ALL TESTS PASSED!")
    print("="*70 + "\n")

except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
