"""
Balance Service - Pre-pay Credit Management

Handles:
- Real-time balance checking
- Credit reservation during active calls
- Credit charging on call completion
- Credit purchases and refunds
- Low balance alerts
"""

import logging
import uuid
from typing import Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from .models import CustomerBalance, CreditTransaction

logger = logging.getLogger(__name__)


class BalanceService:
    """
    Service for managing customer credit balances.

    Features:
    - Pre-pay credit system
    - Real-time balance reservation during calls
    - Atomic credit operations with transaction logging
    - Low balance alerts
    - Auto-recharge support
    """

    def __init__(self, db_session: Session):
        """
        Initialize balance service.

        Args:
            db_session: Database session
        """
        self.db = db_session

    def get_or_create_balance(self, user_id: str) -> CustomerBalance:
        """
        Get customer balance, creating if doesn't exist.

        Args:
            user_id: User ID

        Returns:
            CustomerBalance object
        """
        balance = self.db.query(CustomerBalance).filter(
            CustomerBalance.userId == user_id
        ).first()

        if not balance:
            balance = CustomerBalance(
                id=str(uuid.uuid4()),
                userId=user_id,
                currentBalance=Decimal('0.0'),
                reservedBalance=Decimal('0.0'),
                totalCreditsPurchased=Decimal('0.0'),
                totalCreditsSpent=Decimal('0.0')
            )
            self.db.add(balance)
            self.db.commit()
            logger.info(f"Created balance account for user {user_id}")

        return balance

    def get_available_balance(self, user_id: str) -> Decimal:
        """
        Get available balance (current - reserved).

        Args:
            user_id: User ID

        Returns:
            Available balance as Decimal
        """
        balance = self.get_or_create_balance(user_id)
        available = balance.currentBalance - balance.reservedBalance
        return Decimal(str(available))

    def check_sufficient_balance(
        self,
        user_id: str,
        required_amount: Decimal
    ) -> Tuple[bool, Decimal, Optional[str]]:
        """
        Check if user has sufficient available balance.

        Args:
            user_id: User ID
            required_amount: Required amount

        Returns:
            (has_sufficient: bool, available_balance: Decimal, message: Optional[str])
        """
        available = self.get_available_balance(user_id)

        if available >= required_amount:
            return True, available, None
        else:
            deficit = required_amount - available
            message = f"Insufficient balance. Required: ${required_amount:.4f}, Available: ${available:.4f}, Deficit: ${deficit:.4f}"
            return False, available, message

    def reserve_credits(
        self,
        user_id: str,
        amount: Decimal,
        call_log_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Reserve credits for an active call (deduct from available balance).

        Args:
            user_id: User ID
            amount: Amount to reserve
            call_log_id: Associated call log ID
            description: Transaction description

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            balance = self.get_or_create_balance(user_id)

            # Check sufficient balance
            available = balance.currentBalance - balance.reservedBalance
            if available < amount:
                deficit = amount - available
                return False, f"Insufficient balance. Required: ${amount:.4f}, Available: ${available:.4f}, Deficit: ${deficit:.4f}"

            # Reserve credits
            balance_before = balance.currentBalance
            balance.reservedBalance += amount
            balance.updatedAt = datetime.utcnow()

            # Log transaction
            transaction = CreditTransaction(
                id=str(uuid.uuid4()),
                userId=user_id,
                transactionType='reserve',
                amount=-amount,  # Negative because reducing available
                balanceBefore=balance_before,
                balanceAfter=balance.currentBalance,
                callLogId=call_log_id,
                description=description or f"Reserved credits for call",
                metadata={'reserved_amount': float(amount)}
            )
            self.db.add(transaction)
            self.db.commit()

            logger.info(f"Reserved ${amount:.4f} for user {user_id}, call {call_log_id}")
            return True, None

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to reserve credits for user {user_id}: {e}", exc_info=True)
            return False, f"Failed to reserve credits: {str(e)}"

    def charge_credits(
        self,
        user_id: str,
        actual_amount: Decimal,
        reserved_amount: Decimal,
        call_log_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Charge credits for completed call and release reservation.

        If actual_amount < reserved_amount, refund the difference.
        If actual_amount > reserved_amount, charge the additional (if available).

        Args:
            user_id: User ID
            actual_amount: Actual cost of call
            reserved_amount: Amount that was reserved
            call_log_id: Associated call log ID
            description: Transaction description

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            balance = self.get_or_create_balance(user_id)

            balance_before = balance.currentBalance
            difference = actual_amount - reserved_amount

            if difference > 0:
                # Actual cost is more than reserved
                # Need to charge additional amount from current balance
                available = balance.currentBalance - balance.reservedBalance
                if available < difference:
                    # Not enough to cover difference, charge what was reserved
                    logger.warning(
                        f"User {user_id} insufficient balance for additional charge. "
                        f"Reserved: ${reserved_amount:.4f}, Actual: ${actual_amount:.4f}, "
                        f"Available: ${available:.4f}"
                    )
                    # Charge only reserved amount
                    balance.currentBalance -= reserved_amount
                    balance.reservedBalance -= reserved_amount
                    balance.totalCreditsSpent += reserved_amount

                    transaction = CreditTransaction(
                        id=str(uuid.uuid4()),
                        userId=user_id,
                        transactionType='deduction',
                        amount=-reserved_amount,
                        balanceBefore=balance_before,
                        balanceAfter=balance.currentBalance,
                        callLogId=call_log_id,
                        description=description or f"Call charge (partial, insufficient balance)",
                        metadata={
                            'actual_cost': float(actual_amount),
                            'reserved': float(reserved_amount),
                            'charged': float(reserved_amount)
                        }
                    )
                    self.db.add(transaction)
                else:
                    # Charge actual amount
                    balance.currentBalance -= actual_amount
                    balance.reservedBalance -= reserved_amount
                    balance.totalCreditsSpent += actual_amount

                    transaction = CreditTransaction(
                        id=str(uuid.uuid4()),
                        userId=user_id,
                        transactionType='deduction',
                        amount=-actual_amount,
                        balanceBefore=balance_before,
                        balanceAfter=balance.currentBalance,
                        callLogId=call_log_id,
                        description=description or f"Call charge (${actual_amount:.4f})",
                        metadata={
                            'actual_cost': float(actual_amount),
                            'reserved': float(reserved_amount),
                            'additional_charged': float(difference)
                        }
                    )
                    self.db.add(transaction)

            elif difference < 0:
                # Actual cost is less than reserved - refund difference
                refund_amount = abs(difference)
                balance.currentBalance -= actual_amount
                balance.reservedBalance -= reserved_amount
                balance.totalCreditsSpent += actual_amount

                transaction = CreditTransaction(
                    id=str(uuid.uuid4()),
                    userId=user_id,
                    transactionType='deduction',
                    amount=-actual_amount,
                    balanceBefore=balance_before,
                    balanceAfter=balance.currentBalance,
                    callLogId=call_log_id,
                    description=description or f"Call charge (${actual_amount:.4f}, refunded ${refund_amount:.4f})",
                    metadata={
                        'actual_cost': float(actual_amount),
                        'reserved': float(reserved_amount),
                        'refunded': float(refund_amount)
                    }
                )
                self.db.add(transaction)

            else:
                # Exact match
                balance.currentBalance -= actual_amount
                balance.reservedBalance -= reserved_amount
                balance.totalCreditsSpent += actual_amount

                transaction = CreditTransaction(
                    id=str(uuid.uuid4()),
                    userId=user_id,
                    transactionType='deduction',
                    amount=-actual_amount,
                    balanceBefore=balance_before,
                    balanceAfter=balance.currentBalance,
                    callLogId=call_log_id,
                    description=description or f"Call charge (${actual_amount:.4f})",
                    metadata={
                        'actual_cost': float(actual_amount),
                        'reserved': float(reserved_amount)
                    }
                )
                self.db.add(transaction)

            balance.updatedAt = datetime.utcnow()
            self.db.commit()

            logger.info(
                f"Charged user {user_id} ${actual_amount:.4f} "
                f"(reserved ${reserved_amount:.4f}) for call {call_log_id}"
            )

            # Check for low balance alert
            self._check_low_balance_alert(balance)

            return True, None

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to charge credits for user {user_id}: {e}", exc_info=True)
            return False, f"Failed to charge credits: {str(e)}"

    def release_reservation(
        self,
        user_id: str,
        amount: Decimal,
        call_log_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Release reserved credits without charging (e.g., call failed to start).

        Args:
            user_id: User ID
            amount: Amount to release
            call_log_id: Associated call log ID
            description: Transaction description

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            balance = self.get_or_create_balance(user_id)

            balance_before = balance.currentBalance
            balance.reservedBalance -= amount
            balance.updatedAt = datetime.utcnow()

            # Log transaction
            transaction = CreditTransaction(
                id=str(uuid.uuid4()),
                userId=user_id,
                transactionType='release',
                amount=Decimal('0.0'),  # No change to current balance
                balanceBefore=balance_before,
                balanceAfter=balance.currentBalance,
                callLogId=call_log_id,
                description=description or f"Released reservation",
                metadata={'released_amount': float(amount)}
            )
            self.db.add(transaction)
            self.db.commit()

            logger.info(f"Released ${amount:.4f} reservation for user {user_id}")
            return True, None

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to release reservation for user {user_id}: {e}", exc_info=True)
            return False, f"Failed to release reservation: {str(e)}"

    def add_credits(
        self,
        user_id: str,
        amount: Decimal,
        payment_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Add credits to user balance (purchase).

        Args:
            user_id: User ID
            amount: Amount to add
            payment_id: Payment processor transaction ID
            description: Transaction description

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            balance = self.get_or_create_balance(user_id)

            balance_before = balance.currentBalance
            balance.currentBalance += amount
            balance.totalCreditsPurchased += amount
            balance.updatedAt = datetime.utcnow()

            # Reset low balance alert
            if balance.currentBalance >= balance.lowBalanceThreshold:
                balance.lowBalanceAlertSent = False

            # Log transaction
            transaction = CreditTransaction(
                id=str(uuid.uuid4()),
                userId=user_id,
                transactionType='purchase',
                amount=amount,
                balanceBefore=balance_before,
                balanceAfter=balance.currentBalance,
                paymentId=payment_id,
                description=description or f"Credit purchase",
                metadata={'amount': float(amount)}
            )
            self.db.add(transaction)
            self.db.commit()

            logger.info(f"Added ${amount:.4f} credits for user {user_id}, payment {payment_id}")
            return True, None

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add credits for user {user_id}: {e}", exc_info=True)
            return False, f"Failed to add credits: {str(e)}"

    def refund_credits(
        self,
        user_id: str,
        amount: Decimal,
        call_log_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Refund credits to user balance.

        Args:
            user_id: User ID
            amount: Amount to refund
            call_log_id: Associated call log ID (if refunding a call)
            description: Transaction description

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            balance = self.get_or_create_balance(user_id)

            balance_before = balance.currentBalance
            balance.currentBalance += amount
            balance.totalCreditsSpent -= amount  # Reduce spent amount
            balance.updatedAt = datetime.utcnow()

            # Log transaction
            transaction = CreditTransaction(
                id=str(uuid.uuid4()),
                userId=user_id,
                transactionType='refund',
                amount=amount,
                balanceBefore=balance_before,
                balanceAfter=balance.currentBalance,
                callLogId=call_log_id,
                description=description or f"Credit refund",
                metadata={'amount': float(amount)}
            )
            self.db.add(transaction)
            self.db.commit()

            logger.info(f"Refunded ${amount:.4f} credits for user {user_id}")
            return True, None

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to refund credits for user {user_id}: {e}", exc_info=True)
            return False, f"Failed to refund credits: {str(e)}"

    def get_transaction_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> list:
        """
        Get credit transaction history for user.

        Args:
            user_id: User ID
            limit: Maximum records to return
            offset: Number of records to skip

        Returns:
            List of CreditTransaction objects
        """
        transactions = self.db.query(CreditTransaction).filter(
            CreditTransaction.userId == user_id
        ).order_by(
            CreditTransaction.createdAt.desc()
        ).limit(limit).offset(offset).all()

        return transactions

    def _check_low_balance_alert(self, balance: CustomerBalance):
        """Check if low balance alert should be sent"""
        available = balance.currentBalance - balance.reservedBalance

        if available <= balance.lowBalanceThreshold and not balance.lowBalanceAlertSent:
            # Send alert (implement email/notification here)
            logger.warning(
                f"Low balance alert for user {balance.userId}: "
                f"${available:.4f} <= ${balance.lowBalanceThreshold:.4f}"
            )
            balance.lowBalanceAlertSent = True
            self.db.commit()

            # TODO: Trigger email/notification service

    def get_balance_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get complete balance summary for user.

        Returns:
            {
                'current_balance': float,
                'reserved_balance': float,
                'available_balance': float,
                'total_purchased': float,
                'total_spent': float,
                'low_balance_threshold': float,
                'needs_recharge': bool
            }
        """
        balance = self.get_or_create_balance(user_id)
        available = balance.currentBalance - balance.reservedBalance

        return {
            'current_balance': float(balance.currentBalance),
            'reserved_balance': float(balance.reservedBalance),
            'available_balance': float(available),
            'total_purchased': float(balance.totalCreditsPurchased),
            'total_spent': float(balance.totalCreditsSpent),
            'low_balance_threshold': float(balance.lowBalanceThreshold),
            'needs_recharge': available <= balance.lowBalanceThreshold
        }
