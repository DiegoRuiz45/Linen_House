import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from fastapi import Response


os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_NAME", "linen_house_test")
os.environ.setdefault("SESSION_SECRET_KEY", "test-secret-key-with-at-least-32-characters")


from app.core.config import settings  # noqa: E402
from app.core.security import create_session_token, hash_session_token  # noqa: E402
from app.modules.auth.dependencies import set_session_cookie  # noqa: E402
from app.modules.auth.repository import AuthSessionRepository  # noqa: E402


class FakeSession:
    def __init__(self):
        self.added = []
        self.commits = 0

    def add(self, value):
        self.added.append(value)

    def commit(self):
        self.commits += 1


class SessionTokenTests(unittest.TestCase):
    def test_tokens_are_random_and_not_stored_verbatim(self):
        first = create_session_token()
        second = create_session_token()

        self.assertNotEqual(first, second)
        self.assertGreaterEqual(len(first), 48)
        self.assertNotEqual(first, hash_session_token(first))
        self.assertEqual(len(hash_session_token(first)), 64)

    def test_hash_is_deterministic_for_lookup(self):
        token = create_session_token()
        self.assertEqual(hash_session_token(token), hash_session_token(token))

    def test_cookie_uses_configured_session_duration(self):
        response = Response()
        set_session_cookie(response, "test-token")

        cookie = response.headers["set-cookie"]
        self.assertIn(
            f"Max-Age={settings.SESSION_EXPIRE_MINUTES * 60}",
            cookie,
        )
        self.assertIn("HttpOnly", cookie)

    def test_touch_renews_a_short_existing_session(self):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expected_expiration = now + timedelta(
            minutes=settings.SESSION_EXPIRE_MINUTES
        )
        auth_session = SimpleNamespace(
            last_seen_at=now,
            expires_at=now + timedelta(minutes=5),
        )
        db = FakeSession()

        AuthSessionRepository.touch(
            db,
            auth_session,
            expires_at=expected_expiration,
        )

        self.assertEqual(auth_session.expires_at, expected_expiration)
        self.assertEqual(db.commits, 1)


if __name__ == "__main__":
    unittest.main()
