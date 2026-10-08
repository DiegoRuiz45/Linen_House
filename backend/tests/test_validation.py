import os
import unittest

from pydantic import ValidationError


os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "linen_house_test")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-with-at-least-32-characters")


from app.modules.coupons.schemas import CouponCreate  # noqa: E402
from app.modules.orders.schemas import CheckoutRequest  # noqa: E402
from app.modules.orders.service import OrderService  # noqa: E402
from app.modules.reviews.schemas import ReviewCreate  # noqa: E402
from app.shared.enums import CouponDiscountType, OrderStatus  # noqa: E402


class ValidationTests(unittest.TestCase):
    def test_checkout_rejects_blank_required_fields(self):
        with self.assertRaises(ValidationError):
            CheckoutRequest(
                idempotency_key="0123456789abcdef",
                first_name="   ",
                last_name="Cliente",
                email="cliente@example.com",
                phone="3000000000",
                department="Cundinamarca",
                city="Bogotá",
                address="Calle 1 # 2-3",
            )

    def test_percentage_coupon_cannot_exceed_one_hundred(self):
        with self.assertRaises(ValidationError):
            CouponCreate(
                code="INVALIDO",
                discount_type=CouponDiscountType.PERCENT,
                value=101,
            )

    def test_review_rejects_body_that_becomes_short_after_trim(self):
        with self.assertRaises(ValidationError):
            ReviewCreate(rating=5, body="          ")

    def test_terminal_order_states_have_no_outgoing_transition(self):
        self.assertEqual(OrderService.TRANSITIONS[OrderStatus.DELIVERED], set())
        self.assertEqual(OrderService.TRANSITIONS[OrderStatus.CANCELLED], set())
        self.assertEqual(OrderService.TRANSITIONS[OrderStatus.REFUNDED], set())

    def test_admin_can_approve_pending_order_in_test_mode(self):
        self.assertIn(
            OrderStatus.PAID,
            OrderService.admin_transitions(OrderStatus.PENDING_PAYMENT),
        )


if __name__ == "__main__":
    unittest.main()
