import os
import unittest
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace


os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "linen_house_test")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-with-at-least-32-characters")


from app.modules.users.service import UserService  # noqa: E402
from app.shared.enums import UserRole  # noqa: E402


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, _statement):
        return FakeResult(self.rows)


class UserServiceTests(unittest.TestCase):
    def test_list_customers_builds_admin_response(self):
        now = datetime(2026, 1, 1, 12, 0, 0)
        customer = SimpleNamespace(
            id=7,
            email="cliente@example.com",
            first_name="Cliente",
            last_name="Prueba",
            avatar_url=None,
            phone="3000000000",
            email_verified=True,
            role=UserRole.CUSTOMER,
            is_active=True,
            created_at=now,
            updated_at=now,
            last_login_at=now,
        )
        session = FakeSession([(customer, 3, Decimal("425000.00"))])

        result = UserService.list_customers(session)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].id, 7)
        self.assertEqual(result[0].orders_count, 3)
        self.assertEqual(result[0].total_spent, Decimal("425000.00"))


if __name__ == "__main__":
    unittest.main()
