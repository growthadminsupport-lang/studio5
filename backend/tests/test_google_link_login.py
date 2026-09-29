"""Password-preserving linking before login, without external services."""
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import ExitStack
from _stubs import add_project_root_to_path
add_project_root_to_path()
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "link-tests-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = "123-test.apps.googleusercontent.com"
os.environ["SMTP_HOST"] = ""
os.environ["RESEND_API_KEY"] = ""
from fastapi import HTTPException
import routes_auth as routes

class LinkLoginTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.user = SimpleNamespace(id="u1", email="parent@gmail.com", password_hash="unchanged-hash", email_verified_at=None)
        self.profile = SimpleNamespace(email="parent@gmail.com", subject="g1")
        self.db = MagicMock()
        self.db.execute = AsyncMock(side_effect=[MagicMock(scalar_one_or_none=lambda: self.user), MagicMock(scalar_one_or_none=lambda: None), MagicMock()])
        self.db.commit = AsyncMock()
        self.mocks = {}
        for name in ["enforce_ip_rate_limit", "verify_google_id_token", "verify_password", "find_identity", "_link_google", "_finish_google_login", "register_failed_attempt", "record_login_attempt", "burn_time"]:
            self.mocks[name] = self.stack.enter_context(patch.object(routes, name, AsyncMock()))
        self.mocks["verify_google_id_token"].return_value = self.profile
        self.mocks["verify_password"].return_value = True
        self.mocks["find_identity"].return_value = None
        self.lock = self.stack.enter_context(patch.object(routes, "account_locked_error", return_value=None))
    async def call(self, email="parent@gmail.com"):
        return await routes.google_link_login(routes.GoogleLinkLoginRequest(id_token="token", email=email, current_password="password"), MagicMock(), self.db)
    async def test_pending_activation_preserves_hash(self):
        await self.call("Parent@gmail.com")
        self.assertEqual(self.user.password_hash, "unchanged-hash")
        self.assertIsNotNone(self.user.email_verified_at)
        self.mocks["verify_google_id_token"].assert_awaited_once_with("token", max_age_seconds=300)
        self.mocks["_link_google"].assert_awaited_once()
        self.assertIn("UPDATE usr_email_verifications", str(self.db.execute.call_args.args[0]))
        self.assertTrue(self.mocks["_finish_google_login"].call_args.kwargs["linked"])
    async def test_wrong_password_cannot_activate(self):
        self.mocks["verify_password"].return_value = False
        with self.assertRaises(HTTPException): await self.call()
        self.assertIsNone(self.user.email_verified_at)
        self.assertEqual(self.user.password_hash, "unchanged-hash")
        self.mocks["register_failed_attempt"].assert_awaited_once()
        self.mocks["_link_google"].assert_not_awaited()
    async def test_mismatch_never_reads_account(self):
        with self.assertRaises(HTTPException) as caught: await self.call("other@gmail.com")
        self.assertEqual(caught.exception.status_code,403)
        self.db.execute.assert_not_awaited()
    async def test_expired_token_requires_google_again(self):
        self.mocks["verify_google_id_token"].side_effect = HTTPException(401,"expired")
        with self.assertRaises(HTTPException) as caught: await self.call()
        self.assertEqual(caught.exception.detail["code"],"GOOGLE_REAUTH_REQUIRED")
        self.db.execute.assert_not_awaited()
    async def test_conflicting_identity(self):
        self.mocks["find_identity"].return_value = SimpleNamespace(user_id="another")
        with self.assertRaises(HTTPException) as caught: await self.call()
        self.assertEqual(caught.exception.status_code,409)
        self.assertIsNone(self.user.email_verified_at)
    async def test_repeated_link_does_not_duplicate(self):
        self.mocks["find_identity"].return_value = SimpleNamespace(user_id="u1")
        await self.call()
        self.mocks["_link_google"].assert_not_awaited()
        self.mocks["_finish_google_login"].assert_awaited_once()
    async def test_lock_and_rate_limit(self):
        self.lock.return_value = HTTPException(429,"locked")
        with self.assertRaises(HTTPException): await self.call()
        self.mocks["verify_password"].assert_not_awaited()
        self.mocks["enforce_ip_rate_limit"].side_effect = HTTPException(429,"limited")
        self.db.execute.reset_mock()
        with self.assertRaises(HTTPException): await self.call()
        self.db.execute.assert_not_awaited()

if __name__ == "__main__": unittest.main()
