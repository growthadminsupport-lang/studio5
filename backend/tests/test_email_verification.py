"""Registration ownership checks, without an external database or mail provider."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from _stubs import add_project_root_to_path

add_project_root_to_path()
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "verification-tests-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = ""
os.environ["SMTP_HOST"] = ""

from fastapi import HTTPException
import routes_auth as routes


def db_with(*rows):
    db = MagicMock()
    db.execute = AsyncMock(side_effect=rows)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


class EmailVerificationTests(unittest.IsolatedAsyncioTestCase):
    async def test_new_password_registration_has_no_session_until_verified(self):
        db = db_with()
        form = routes.RegisterRequest(
            full_name="Parent", email="parent@gmail.com", password="safe long phrase 2026",
            terms_accepted=True,
        )
        with (
            patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
            patch.object(routes, "hash_password", AsyncMock(return_value="hashed")),
            patch.object(routes, "_issue_email_verification", AsyncMock(return_value="token")),
            patch.object(routes.mailer, "SMTP_ENABLED", False),
            patch.object(routes.mailer, "APP_ENV", "development"),
            patch.object(routes.mailer, "send_email_verification", AsyncMock()) as sent,
            patch.object(routes, "issue_refresh_token", AsyncMock()) as sessions,
        ):
            result = await routes.register(form, MagicMock(), db)
        user = db.add.call_args.args[0]
        self.assertTrue(user.email_verification_required)
        self.assertIsNone(user.email_verified_at)
        self.assertFalse(hasattr(result, "access_token"))
        sessions.assert_not_awaited()
        sent.assert_awaited_once()

    async def test_pending_password_account_cannot_login(self):
        user = SimpleNamespace(password_hash="hashed", email_verification_required=True,
                               email_verified_at=None, locked_until=None)
        db = db_with(MagicMock(scalar_one_or_none=MagicMock(return_value=user)))
        with (
            patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
            patch.object(routes, "account_locked_error", return_value=None),
            patch.object(routes, "verify_password", AsyncMock(return_value=True)),
            patch.object(routes, "issue_refresh_token", AsyncMock()) as sessions,
        ):
            with self.assertRaises(HTTPException) as caught:
                await routes.login(routes.LoginRequest(email="parent@gmail.com", password="secret"), MagicMock(), db)
        self.assertEqual(caught.exception.status_code, 403)
        sessions.assert_not_awaited()

    async def test_verification_needs_token_and_registration_password(self):
        now = datetime.now(timezone.utc)
        record = SimpleNamespace(user_id="u1", used_at=None, expires_at=now + timedelta(hours=1))
        user = SimpleNamespace(password_hash="hashed", email_verified_at=None)
        db = db_with(
            MagicMock(scalar_one_or_none=MagicMock(return_value=record)),
            MagicMock(scalar_one=MagicMock(return_value=user)),
        )
        with (
            patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
            patch.object(routes, "verify_password", AsyncMock(return_value=True)),
        ):
            await routes.verify_email(routes.VerifyEmailRequest(token="secret", password="password"), MagicMock(), db)
        self.assertIsNotNone(record.used_at)
        self.assertIsNotNone(user.email_verified_at)
        db.commit.assert_awaited_once()

    async def test_expired_or_reused_token_is_rejected(self):
        now = datetime.now(timezone.utc)
        for used_at, expires_at in ((now, now + timedelta(hours=1)), (None, now - timedelta(seconds=1))):
            with self.subTest(used_at=used_at, expires_at=expires_at):
                record = SimpleNamespace(used_at=used_at, expires_at=expires_at)
                db = db_with(MagicMock(scalar_one_or_none=MagicMock(return_value=record)))
                with patch.object(routes, "enforce_ip_rate_limit", AsyncMock()):
                    with self.assertRaises(HTTPException) as caught:
                        await routes.verify_email(routes.VerifyEmailRequest(token="secret", password="password"), MagicMock(), db)
                self.assertEqual(caught.exception.status_code, 401)
                db.commit.assert_not_awaited()

    async def test_wrong_registration_password_does_not_consume_token(self):
        record = SimpleNamespace(user_id="u1", used_at=None, expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
        user = SimpleNamespace(password_hash="hashed", email_verified_at=None)
        db = db_with(
            MagicMock(scalar_one_or_none=MagicMock(return_value=record)),
            MagicMock(scalar_one=MagicMock(return_value=user)),
        )
        with (
            patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
            patch.object(routes, "verify_password", AsyncMock(return_value=False)),
        ):
            with self.assertRaises(HTTPException) as caught:
                await routes.verify_email(routes.VerifyEmailRequest(token="secret", password="wrong"), MagicMock(), db)
        self.assertEqual(caught.exception.status_code, 401)
        self.assertIsNone(record.used_at)
        db.commit.assert_not_awaited()

    async def test_reset_restores_legacy_google_account_password_without_touching_identity(self):
        user = SimpleNamespace(
            id="u1", email="parent@gmail.com", full_name="Parent", password_hash=None,
            email_verification_required=False, email_verified_at=None, password_changed_at=None,
        )
        db = db_with()
        with (
            patch.object(routes, "consume_password_reset", AsyncMock(return_value=user)),
            patch.object(routes, "hash_password", AsyncMock(return_value="new-hash")),
            patch.object(routes, "clear_failed_attempts"),
            patch.object(routes, "revoke_all_sessions", AsyncMock(return_value=1)),
            patch.object(routes, "void_pending_password_resets", AsyncMock()),
            patch.object(routes.mailer, "send_password_changed_notice", AsyncMock()),
        ):
            await routes.reset_password(
                routes.ResetPasswordRequest(token="reset-token", new_password="a new safe phrase 2026"), db,
            )
        self.assertEqual(user.password_hash, "new-hash")
        self.assertIsNotNone(user.email_verified_at)  # delivered reset token proves current email
        db.delete.assert_not_called()
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
