"""Google authentication regressions: real RSA verification, isolated route mocks."""
import os
import time
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from _stubs import add_project_root_to_path

add_project_root_to_path()
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "google-tests-only-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = "123-test.apps.googleusercontent.com"
os.environ["SMTP_HOST"] = ""

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
import google_oauth as oauth
import routes_auth as routes


class GoogleTokenTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    async def verify(self, changes=None, missing=(), key=None, max_age_seconds=None):
        claims = dict(sub="google-subject", email="parent@gmail.com", email_verified=True,
                      iss="https://accounts.google.com", aud=os.environ["GOOGLE_CLIENT_IDS"],
                      iat=int(time.time()), exp=int(time.time()) + 300, name=" Parent ")
        claims.update(changes or {})
        for field in missing:
            claims.pop(field, None)
        token = jwt.encode(claims, key or self.key, algorithm="RS256", headers={"kid": "test"})
        with patch.object(oauth, "_find_key", AsyncMock(return_value=self.key.public_key())):
            return await oauth.verify_google_id_token(token, max_age_seconds=max_age_seconds)

    async def test_link_token_must_be_recent(self):
        await self.verify(max_age_seconds=300)
        with self.assertRaises(HTTPException) as caught:
            await self.verify({"iat": int(time.time()) - 301}, max_age_seconds=300)
        self.assertEqual(caught.exception.status_code, 401)

    async def test_valid_issuers_and_authority(self):
        for issuer in ("https://accounts.google.com", "accounts.google.com"):
            profile = await self.verify({"iss": issuer})
            self.assertEqual(profile.full_name, "Parent")
            self.assertTrue(profile.email_authoritative)
        self.assertFalse((await self.verify({"email": "parent@example.com"})).email_authoritative)
        self.assertTrue((await self.verify({"email": "parent@example.com", "hd": "example.com"})).email_authoritative)

    async def test_invalid_claims(self):
        for changes in ({"aud": "other-app"}, {"iss": "https://attacker.example"},
                        {"exp": int(time.time()) - 60}, {"iat": int(time.time()) + 600},
                        {"sub": ""}, {"sub": 123}, {"email": ["bad"]}):
            with self.subTest(changes=changes), self.assertRaises(HTTPException) as caught:
                await self.verify(changes)
            self.assertEqual(caught.exception.status_code, 401)
        for field in ("sub", "exp", "iat", "aud", "iss"):
            with self.subTest(missing=field), self.assertRaises(HTTPException) as caught:
                await self.verify(missing=(field,))
            self.assertEqual(caught.exception.status_code, 401)

    async def test_wrong_signature(self):
        wrong = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        with self.assertRaises(HTTPException) as caught:
            await self.verify(key=wrong)
        self.assertEqual(caught.exception.status_code, 401)

    async def test_missing_email_and_unverified(self):
        for changes, expected in (({"email": ""}, 400), ({"email_verified": False}, 403)):
            with self.assertRaises(HTTPException) as caught:
                await self.verify(changes)
            self.assertEqual(caught.exception.status_code, expected)

    async def test_disabled_and_malformed(self):
        with patch.object(oauth, "GOOGLE_ENABLED", False), self.assertRaises(HTTPException) as caught:
            await oauth.verify_google_id_token("invalid")
        self.assertEqual(caught.exception.status_code, 503)
        with self.assertRaises(HTTPException) as caught:
            await oauth.verify_google_id_token("invalid")
        self.assertEqual(caught.exception.status_code, 401)

    async def test_unknown_kid_cooldown_and_rotation(self):
        with patch.object(oauth, "_fetch_jwks", AsyncMock(return_value=({"keys": []}, False))) as fetch:
            with patch.object(oauth, "_jwks_fetched_at", time.monotonic()):
                self.assertIsNone(await oauth._find_key("unknown"))
                self.assertEqual(fetch.await_count, 1)
            fetch.reset_mock()
            with patch.object(oauth, "_jwks_fetched_at", time.monotonic() - 120):
                self.assertIsNone(await oauth._find_key("unknown"))
                self.assertEqual(fetch.await_count, 2)


class GoogleRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = MagicMock()
        self.db.execute = AsyncMock()
        self.db.flush = AsyncMock()
        self.db.commit = AsyncMock()
        self.profile = oauth.GoogleProfile("subject", "parent@gmail.com", "Parent", None, True)
        self.user = SimpleNamespace(id="user-id", email="parent@gmail.com", full_name="Parent",
                                    password_hash="old-password", password_changed_at=None)
        self.mocks = {}
        for name in ("enforce_ip_rate_limit", "verify_google_id_token", "find_identity",
                     "_link_google", "_finish_google_login", "revoke_all_sessions",
                     "void_pending_password_resets"):
            mock = AsyncMock()
            self.mocks[name] = mock
            self.enterContext(patch.object(routes, name, mock))
        self.enterContext(patch.object(routes, "GOOGLE_ENABLED", True))
        self.enterContext(patch.object(routes.mailer, "send_google_linked_notice", AsyncMock()))
        self.mocks["verify_google_id_token"].return_value = self.profile
        self.mocks["find_identity"].return_value = None

    async def call(self, terms=True):
        return await routes.google_sign_in(routes.GoogleRequest(id_token="test", terms_accepted=terms),
                                           MagicMock(), self.db)

    def rows(self, *values):
        self.db.execute.side_effect = [MagicMock(scalar_one_or_none=MagicMock(return_value=v)) for v in values]

    async def test_new_account_and_terms(self):
        self.rows(None)
        await self.call()
        self.assertIsNone(self.db.add.call_args.args[0].password_hash)
        self.assertIsNotNone(self.db.add.call_args.args[0].email_verified_at)
        self.assertTrue(self.mocks["_finish_google_login"].call_args.kwargs["is_new_account"])
        self.db.add.reset_mock()
        self.rows(None)
        with self.assertRaises(HTTPException) as caught:
            await self.call(terms=False)
        self.assertEqual(caught.exception.status_code, 400)
        self.db.add.assert_not_called()

    async def test_email_match_requires_explicit_link_without_changing_password(self):
        self.rows(self.user)
        with self.assertRaises(HTTPException) as caught:
            await self.call()
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(caught.exception.detail["code"], "LINK_REQUIRED")
        self.assertEqual(self.user.password_hash, "old-password")
        self.mocks["revoke_all_sessions"].assert_not_awaited()
        self.mocks["_link_google"].assert_not_awaited()
        self.mocks["_finish_google_login"].assert_not_awaited()

    async def test_third_party_email_cannot_link(self):
        self.mocks["verify_google_id_token"].return_value = oauth.GoogleProfile(
            "subject", "parent@example.com", "Parent", None, False)
        self.rows(self.user)
        with self.assertRaises(HTTPException) as caught:
            await self.call()
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.user.password_hash, "old-password")
        self.mocks["_link_google"].assert_not_awaited()
        self.mocks["_finish_google_login"].assert_not_awaited()

    async def test_new_external_google_email_is_not_marked_authoritative(self):
        self.mocks["verify_google_id_token"].return_value = oauth.GoogleProfile(
            "subject", "parent@example.com", "Parent", None, False)
        self.rows(None)
        await self.call()
        self.assertIsNone(self.db.add.call_args.args[0].email_verified_at)

    async def test_existing_subject_signs_in_without_relink(self):
        identity = SimpleNamespace(user_id=self.user.id, email="old@example.com")
        self.mocks["find_identity"].return_value = identity
        self.rows(self.user)
        await self.call(terms=False)
        self.assertEqual(identity.email, self.profile.email)
        self.mocks["_link_google"].assert_not_awaited()
        self.assertFalse(self.mocks["_finish_google_login"].call_args.kwargs["is_new_account"])

    async def test_other_subject_conflict(self):
        self.rows(self.user)
        with self.assertRaises(HTTPException) as caught:
            await self.call()
        self.assertEqual(caught.exception.status_code, 409)
        self.mocks["_link_google"].assert_not_awaited()

    async def test_explicit_link_preserves_password_and_data_owner(self):
        self.user.email_verified_at = None
        self.db.execute.side_effect = [
            MagicMock(scalar_one=MagicMock(return_value=self.user)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
        ]
        with patch.object(routes, "verify_password", AsyncMock(return_value=True)):
            result = await routes.google_link(
                routes.GoogleLinkRequest(id_token="test", current_password="old-password"),
                self.user, self.db,
            )
        self.assertIn("still works", result.message)
        self.assertEqual(self.user.password_hash, "old-password")
        self.assertIsNotNone(self.user.email_verified_at)
        self.mocks["_link_google"].assert_awaited_once_with(self.db, self.user, self.profile)
        self.mocks["verify_google_id_token"].assert_awaited_once_with("test", max_age_seconds=300)
        self.db.commit.assert_awaited_once()

    async def test_explicit_link_rejects_wrong_password(self):
        with patch.object(routes, "verify_password", AsyncMock(return_value=False)):
            with self.assertRaises(HTTPException) as caught:
                await routes.google_link(
                    routes.GoogleLinkRequest(id_token="test", current_password="wrong"),
                    self.user, self.db,
                )
        self.assertEqual(caught.exception.status_code, 401)
        self.mocks["verify_google_id_token"].assert_not_awaited()
        self.mocks["_link_google"].assert_not_awaited()

    async def test_explicit_link_rejects_mismatched_google_email(self):
        self.mocks["verify_google_id_token"].return_value = oauth.GoogleProfile(
            "subject", "other@gmail.com", "Other", None, True
        )
        with patch.object(routes, "verify_password", AsyncMock(return_value=True)):
            with self.assertRaises(HTTPException) as caught:
                await routes.google_link(
                    routes.GoogleLinkRequest(id_token="test", current_password="old-password"),
                    self.user, self.db,
                )
        self.assertEqual(caught.exception.status_code, 403)
        self.mocks["_link_google"].assert_not_awaited()

    async def test_explicit_link_rejects_already_linked_subject(self):
        self.db.execute.return_value = MagicMock(scalar_one=MagicMock(return_value=self.user))
        self.mocks["find_identity"].return_value = SimpleNamespace(user_id="different-user")
        with patch.object(routes, "verify_password", AsyncMock(return_value=True)):
            with self.assertRaises(HTTPException) as caught:
                await routes.google_link(
                    routes.GoogleLinkRequest(id_token="test", current_password="old-password"),
                    self.user, self.db,
                )
        self.assertEqual(caught.exception.status_code, 409)
        self.mocks["_link_google"].assert_not_awaited()

    async def test_explicit_link_rejects_second_google_subject_for_same_user(self):
        self.db.execute.side_effect = [
            MagicMock(scalar_one=MagicMock(return_value=self.user)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=SimpleNamespace(subject="other"))),
        ]
        with patch.object(routes, "verify_password", AsyncMock(return_value=True)):
            with self.assertRaises(HTTPException) as caught:
                await routes.google_link(
                    routes.GoogleLinkRequest(id_token="test", current_password="old-password"),
                    self.user, self.db,
                )
        self.assertEqual(caught.exception.status_code, 409)
        self.mocks["_link_google"].assert_not_awaited()


class ConcurrentLinkTests(unittest.IsolatedAsyncioTestCase):
    async def test_unique_constraint_race_returns_conflict(self):
        db = MagicMock()
        db.rollback = AsyncMock()
        profile = oauth.GoogleProfile("subject", "parent@gmail.com", "Parent", None, True)
        collision = IntegrityError("INSERT usr_identities", {}, Exception("unique violation"))
        with patch.object(routes, "link_identity", AsyncMock(side_effect=collision)):
            with self.assertRaises(HTTPException) as caught:
                await routes._link_google(db, SimpleNamespace(id="user-id"), profile)
        self.assertEqual(caught.exception.status_code, 409)
        db.rollback.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
