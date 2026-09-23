"""Password login must not lock or probe credentials for Google-only accounts."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from _stubs import add_project_root_to_path

add_project_root_to_path()
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "passwordless-login-tests-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = ""
os.environ["SMTP_HOST"] = ""

from fastapi import HTTPException
import routes_auth as routes


class PasswordlessLoginTests(unittest.IsolatedAsyncioTestCase):
    async def test_google_only_account_returns_generic_401_without_locking(self):
        user = SimpleNamespace(password_hash=None, locked_until=object())
        result = MagicMock()
        result.scalar_one_or_none.return_value = user
        db = MagicMock()
        db.execute = AsyncMock(return_value=result)
        db.commit = AsyncMock()

        with (
            patch.object(routes, "burn_time", AsyncMock()) as burn,
            patch.object(routes, "record_login_attempt", AsyncMock()) as record,
            patch.object(routes, "register_failed_attempt", AsyncMock()) as register_failed,
            patch.object(routes, "verify_password", AsyncMock()) as verify,
            patch.object(routes, "account_locked_error") as locked,
            patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
        ):
            with self.assertRaises(HTTPException) as caught:
                await routes.login(
                    routes.LoginRequest(email="parent@gmail.com", password="irrelevant"),
                    MagicMock(), db,
                )

        self.assertEqual(caught.exception.status_code, 401)
        self.assertEqual(caught.exception.detail, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
        burn.assert_awaited_once()
        record.assert_awaited_once()
        db.commit.assert_awaited_once()
        register_failed.assert_not_awaited()
        verify.assert_not_awaited()
        locked.assert_not_called()


if __name__ == "__main__":
    unittest.main()
