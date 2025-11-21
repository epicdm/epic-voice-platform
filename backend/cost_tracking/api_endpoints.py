"""
Cost Tracking API Endpoints

REST API endpoints for:
- Call cost breakdowns
- Customer balance management
- Credit transactions
- Credit purchases
"""

import logging
from flask import Blueprint, request, jsonify
from decimal import Decimal
from sqlalchemy.orm import Session

from database import SessionLocal, User, CallLog
from .models import CallCostBreakdown, CreditTransaction
from .balance_service import BalanceService
from .pricing_service import PricingService

logger = logging.getLogger(__name__)

# Create blueprint for cost tracking routes
cost_bp = Blueprint('cost_tracking', __name__)


def require_user_from_header(db: Session):
    """Extract and validate user from X-User-Email header"""
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return None, jsonify({'success': False, 'error': 'Authentication required'}), 401

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        return None, jsonify({'success': False, 'error': 'User not found'}), 404

    return user, None, None


@cost_bp.route('/api/v1/calls/<call_id>/costs', methods=['GET'])
def get_call_costs(call_id):
    """
    Get detailed cost breakdown for a call.

    Returns:
        {
            'success': true,
            'data': {
                'total': float,
                'breakdown': {
                    'voice_base': {...},
                    'llm': {...},
                    'tts': {...},
                    'outbound': {...},
                    'features': {...}
                },
                'usage': {...},
                'profit': {  // Admin only
                    'real_cost': float,
                    'customer_cost': float,
                    'profit_margin': float,
                    'markup': float
                }
            }
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        # Get call log
        call = db.query(CallLog).filter(
            CallLog.id == call_id,
            CallLog.userId == user.id
        ).first()

        if not call:
            return jsonify({'success': False, 'error': 'Call not found'}), 404

        if not call.costBreakdownId:
            return jsonify({'success': False, 'error': 'Cost data not available yet'}), 404

        # Get cost breakdown
        breakdown = db.query(CallCostBreakdown).filter(
            CallCostBreakdown.id == call.costBreakdownId
        ).first()

        if not breakdown:
            return jsonify({'success': False, 'error': 'Cost breakdown not found'}), 404

        # Build response
        response_data = {
            'total': float(breakdown.totalCustomerCost),
            'breakdown': {
                'voice_base': {
                    'label': f'{breakdown.customerVoiceTier.title()} Voice' if breakdown.customerVoiceTier else 'Voice',
                    'cost': float(breakdown.customerBaseCost),
                    'details': f'{float(breakdown.telephonyMinutes):.2f} minutes @ ${float(breakdown.customerBaseCost / breakdown.telephonyMinutes):.4f}/min'
                },
                'llm': {
                    'label': f'{breakdown.llmModel} LLM',
                    'cost': float(breakdown.customerLlmAddon),
                    'details': f'{breakdown.llmInputTokens + breakdown.llmOutputTokens:,} tokens ({breakdown.llmInputTokens:,} in / {breakdown.llmOutputTokens:,} out)'
                },
                'tts': {
                    'label': f'{breakdown.ttsProvider.title()} Voice',
                    'cost': float(breakdown.customerTtsAddon),
                    'details': f'{breakdown.ttsCharacters:,} characters generated'
                },
                'features': {
                    'label': 'Features & Add-ons',
                    'cost': float(breakdown.customerFeatureCosts),
                    'details': breakdown.toolInvocations if breakdown.toolInvocations else []
                }
            },
            'usage': {
                'duration_minutes': float(breakdown.telephonyMinutes),
                'stt_minutes': float(breakdown.sttAudioMinutes),
                'llm_tokens': breakdown.llmInputTokens + breakdown.llmOutputTokens,
                'llm_input_tokens': breakdown.llmInputTokens,
                'llm_output_tokens': breakdown.llmOutputTokens,
                'tts_characters': breakdown.ttsCharacters
            }
        }

        # Add outbound addon if present
        if breakdown.customerOutboundAddon and breakdown.customerOutboundAddon > 0:
            response_data['breakdown']['outbound'] = {
                'label': 'Outbound Calling',
                'cost': float(breakdown.customerOutboundAddon),
                'details': f'{float(breakdown.telephonyMinutes):.2f} minutes outbound'
            }

        # Add profit metrics for admin users
        if user.email == 'admin@epic.dm' or user.role == 'admin':
            response_data['profit'] = {
                'real_cost': float(breakdown.totalRealCost),
                'customer_cost': float(breakdown.totalCustomerCost),
                'profit_margin': float(breakdown.profitMargin),
                'markup': float(breakdown.markupMultiplier)
            }

        return jsonify({'success': True, 'data': response_data})

    except Exception as e:
        logger.error(f"Failed to get call costs: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


@cost_bp.route('/api/v1/balance', methods=['GET'])
def get_balance():
    """
    Get user's credit balance summary.

    Returns:
        {
            'success': true,
            'data': {
                'current_balance': float,
                'reserved_balance': float,
                'available_balance': float,
                'total_purchased': float,
                'total_spent': float,
                'low_balance_threshold': float,
                'needs_recharge': bool
            }
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        balance_svc = BalanceService(db)
        summary = balance_svc.get_balance_summary(user.id)

        return jsonify({'success': True, 'data': summary})

    except Exception as e:
        logger.error(f"Failed to get balance: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


@cost_bp.route('/api/v1/balance/transactions', methods=['GET'])
def get_transactions():
    """
    Get user's credit transaction history.

    Query params:
        - limit (int): Max transactions to return (default: 50)
        - offset (int): Pagination offset (default: 0)

    Returns:
        {
            'success': true,
            'data': {
                'transactions': [...],
                'total': int
            }
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100
        offset = int(request.args.get('offset', 0))

        balance_svc = BalanceService(db)
        transactions = balance_svc.get_transaction_history(user.id, limit=limit, offset=offset)

        # Count total transactions
        total = db.query(CreditTransaction).filter(
            CreditTransaction.userId == user.id
        ).count()

        # Format transactions
        txn_list = []
        for txn in transactions:
            txn_list.append({
                'id': str(txn.id),
                'type': txn.transactionType,
                'amount': float(txn.amount),
                'balance_before': float(txn.balanceBefore),
                'balance_after': float(txn.balanceAfter),
                'description': txn.description,
                'call_log_id': str(txn.callLogId) if txn.callLogId else None,
                'payment_id': txn.paymentId,
                'created_at': txn.createdAt.isoformat() if txn.createdAt else None
            })

        return jsonify({
            'success': True,
            'data': {
                'transactions': txn_list,
                'total': total,
                'limit': limit,
                'offset': offset
            }
        })

    except Exception as e:
        logger.error(f"Failed to get transactions: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


@cost_bp.route('/api/v1/balance/purchase', methods=['POST'])
def purchase_credits():
    """
    Purchase credits (add to balance).

    Request body:
        {
            'amount': float,
            'payment_id': str (from payment processor),
            'description': str (optional)
        }

    Returns:
        {
            'success': true,
            'data': {
                'new_balance': float,
                'amount_added': float
            }
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        data = request.get_json()
        amount = Decimal(str(data.get('amount', 0)))
        payment_id = data.get('payment_id')
        description = data.get('description')

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'}), 400

        if not payment_id:
            return jsonify({'success': False, 'error': 'Payment ID required'}), 400

        # Add credits
        balance_svc = BalanceService(db)
        success, error = balance_svc.add_credits(
            user_id=user.id,
            amount=amount,
            payment_id=payment_id,
            description=description
        )

        if not success:
            return jsonify({'success': False, 'error': error}), 500

        # Get new balance
        summary = balance_svc.get_balance_summary(user.id)

        return jsonify({
            'success': True,
            'data': {
                'new_balance': summary['current_balance'],
                'amount_added': float(amount)
            }
        })

    except Exception as e:
        logger.error(f"Failed to purchase credits: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


@cost_bp.route('/api/v1/pricing/estimate', methods=['POST'])
def estimate_call_cost():
    """
    Estimate cost for a voice call (before placing call).

    Request body:
        {
            'duration_minutes': float,
            'voice_tier': str ('basic', 'advanced', 'premium'),
            'llm_model': str (optional),
            'tts_provider': str (optional),
            'telephony_direction': str ('inbound', 'outbound')
        }

    Returns:
        {
            'success': true,
            'data': {
                'estimated_cost': float,
                'includes_buffer': true
            }
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        data = request.get_json()
        duration_minutes = float(data.get('duration_minutes', 1.0))
        voice_tier = data.get('voice_tier', 'basic')
        llm_model = data.get('llm_model', 'gpt-4o-mini')
        tts_provider = data.get('tts_provider', 'openai')
        telephony_direction = data.get('telephony_direction', 'inbound')

        pricing = PricingService(db, user_id=user.id)
        estimated = pricing.estimate_voice_call_cost(
            estimated_duration_minutes=duration_minutes,
            voice_tier=voice_tier,
            llm_model=llm_model,
            tts_provider=tts_provider,
            telephony_direction=telephony_direction
        )

        return jsonify({
            'success': True,
            'data': {
                'estimated_cost': float(estimated),
                'includes_buffer': True,  # 10% buffer included
                'per_minute_rate': float(estimated / Decimal(str(duration_minutes)))
            }
        })

    except Exception as e:
        logger.error(f"Failed to estimate cost: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


# Admin-only endpoints

@cost_bp.route('/api/v1/admin/pricing', methods=['GET'])
def get_pricing_config():
    """
    Get pricing configuration (admin only).

    Returns:
        {
            'success': true,
            'data': {...}  // All pricing rates
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        if user.email != 'admin@epic.dm':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403

        from .models import PricingConfig

        config = db.query(PricingConfig).filter(
            PricingConfig.configName == 'system_default'
        ).first()

        if not config:
            return jsonify({'success': False, 'error': 'Pricing config not found'}), 404

        # Convert all pricing attributes to dict
        pricing_data = {}
        for column in config.__table__.columns:
            value = getattr(config, column.name)
            if isinstance(value, Decimal):
                pricing_data[column.name] = float(value)
            elif isinstance(value, datetime):
                pricing_data[column.name] = value.isoformat()
            else:
                pricing_data[column.name] = value

        return jsonify({'success': True, 'data': pricing_data})

    except Exception as e:
        logger.error(f"Failed to get pricing config: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()


@cost_bp.route('/api/v1/admin/pricing', methods=['PUT'])
def update_pricing_config():
    """
    Update pricing configuration (admin only).

    Request body:
        {
            'deepgram_nova2_per_min': float,
            'customer_voice_basic_per_min': float,
            ...
        }
    """
    db = SessionLocal()
    try:
        user, error_response, status_code = require_user_from_header(db)
        if error_response:
            return error_response, status_code

        if user.email != 'admin@epic.dm':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403

        from .models import PricingConfig

        config = db.query(PricingConfig).filter(
            PricingConfig.configName == 'system_default'
        ).first()

        if not config:
            return jsonify({'success': False, 'error': 'Pricing config not found'}), 404

        data = request.get_json()

        # Update allowed fields
        updatable_fields = [
            # STT
            'deepgram_nova2_per_min', 'deepgram_nova3_per_min',
            # LLM Voice
            'openai_gpt4o_mini_input_per_1m_voice', 'openai_gpt4o_mini_output_per_1m_voice',
            'openai_gpt4_input_per_1m_voice', 'openai_gpt4_output_per_1m_voice',
            # LLM Text
            'openai_gpt4o_mini_input_per_1m_text', 'openai_gpt4o_mini_output_per_1m_text',
            # TTS
            'openai_tts_per_1m_chars', 'cartesia_per_audio_min', 'elevenlabs_turbo_per_1k_chars',
            # Telephony
            'inbound_per_minute', 'outbound_per_minute',
            # Customer pricing - Voice
            'customer_voice_basic_per_min', 'customer_voice_advanced_per_min', 'customer_voice_premium_per_min',
            'customer_voice_gpt4_addon_per_min', 'customer_voice_claude_addon_per_min',
            # Customer pricing - Text
            'customer_text_basic_per_message', 'customer_text_advanced_per_message',
            # Features
            'customer_outbound_addon_per_min', 'customer_sms_per_message',
        ]

        updated_fields = []
        for field in updatable_fields:
            if field in data:
                setattr(config, field, Decimal(str(data[field])))
                updated_fields.append(field)

        config.updatedAt = datetime.utcnow()
        db.commit()

        logger.info(f"Admin {user.email} updated pricing config: {updated_fields}")

        return jsonify({
            'success': True,
            'data': {
                'updated_fields': updated_fields
            }
        })

    except Exception as e:
        logger.error(f"Failed to update pricing config: {e}", exc_info=True)
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()
