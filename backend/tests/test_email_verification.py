"""Registration ownership checks, without an external database or mail provider."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from _stubs import add_project_root_to_path

add_project_root_to_path()
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "verification-tests-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["RESEND_API_KEY"] = ""

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
    async def test_registration_never_sends_email_or_claims_verified(self):
        for environment in ("development", "production"):
            db = db_with()
            form = routes.RegisterRequest(full_name="Parent", email="parent@gmail.com",
                                          password="safe long phrase 2026", terms_accepted=True)
            with (patch.object(routes.mailer, "APP_ENV", environment),
                  patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
                  patch.object(routes, "hash_password", AsyncMock(return_value="hashed")),
                  patch.object(routes.mailer, "_deliver", AsyncMock()) as sent):
                result = await routes.register(form, MagicMock(), db)
            user = db.add.call_args.args[0]
            self.assertFalse(user.email_verification_required)
            self.assertFalse(result.verification_required)
            self.assertIsNone(user.email_verified_at)
            sent.assert_not_awaited()
            db.commit.assert_awaited_once()

    async def test_retired_verification_endpoints_do_not_send_email(self):
        for handler, data in (
            (routes.resend_email_verification, routes.EmailRequest(email="parent@gmail.com")),
            (routes.verify_email, routes.VerifyEmailRequest(token="old-token", password="password")),
        ):
            db = db_with()
            with patch.object(routes.mailer, "_deliver", AsyncMock()) as sent:
                with self.assertRaises(HTTPException) as caught:
                    await handler(data, MagicMock(), db)
            self.assertEqual(caught.exception.status_code, 410)
            sent.assert_not_awaited()
            db.execute.assert_not_awaited()

    async def test_legacy_pending_account_can_login_with_password(self):
        user = SimpleNamespace(password_hash="hashed", email_verification_required=True,
                               email_verified_at=None, locked_until=None)
        db = db_with(MagicMock(scalar_one_or_none=MagicMock(return_value=user)))
        with (patch.object(routes, "enforce_ip_rate_limit", AsyncMock()),
              patch.object(routes, "account_locked_error", return_value=None),
              patch.object(routes, "verify_password", AsyncMock(return_value=True)),
              patch.object(routes, "clear_failed_attempts"),
              patch.object(routes, "record_login_attempt", AsyncMock()),
              patch.object(routes, "create_access_token", return_value="access"),
              patch.object(routes, "issue_refresh_token", AsyncMock(return_value=("refresh", None)))):
            result = await routes.login(routes.LoginRequest(email="parent@gmail.com", password="secret"), MagicMock(), db)
        self.assertEqual(result.access_token, "access")
        self.assertIsNone(user.email_verified_at)

    async def test_forgot_password_still_sends_reset_mail(self):
        user = SimpleNamespace(id="u1", email="parent@gmail.com", full_name="Parent", password_hash="hashed")
        db = db_with(MagicMock(scalar_one_or_none=MagicMock(return_value=user)))
        with (patch.object(routes, "password_reset_quota_exceeded", AsyncMock(return_value=False)),
              patch.object(routes, "issue_password_reset", AsyncMock(return_value="secret-token")),
              patch.object(routes.mailer, "send_password_reset_email", AsyncMock()) as reset_mail,
              patch.object(routes.mailer, "send_password_setup_email", AsyncMock()) as setup_mail):
            result = await routes.forgot_password(routes.EmailRequest(email="parent@gmail.com"), db)
        self.assertEqual(result.message, routes.GENERIC_EMAIL_REPLY)
        db.commit.assert_awaited_once()
        reset_mail.assert_awaited_once_with("parent@gmail.com", "Parent", "secret-token")
        setup_mail.assert_not_awaited()

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
