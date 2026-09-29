"""HTTPS mail delivery contract, with no outbound requests."""
import os
import unittest
from unittest.mock import AsyncMock, patch

from _stubs import add_project_root_to_path
add_project_root_to_path()
os.environ["RESEND_API_KEY"] = ""
os.environ["SMTP_HOST"] = ""
import httpx
import mailer


class ResendTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_rejections_are_sanitized(self):
        for status in (401, 403, 429, 500):
            client = AsyncMock()
            client.post.return_value = httpx.Response(status, request=httpx.Request("POST", "https://api.resend.com/emails"), text="secret-token test-key")
            with patch.object(mailer, "RESEND_API_KEY", "test-key"), patch.object(mailer.httpx, "AsyncClient") as factory, self.assertLogs("growth.mailer", level="ERROR") as logs:
                factory.return_value.__aenter__.return_value = client
                self.assertFalse(await mailer._deliver("recipient@example.com", "Verify", "secret-token"))
            self.assertNotIn("secret-token", str(logs.output))
            self.assertNotIn("test-key", str(logs.output))

    async def test_send_contract(self):
        client = AsyncMock()
        client.post.return_value = httpx.Response(200, request=httpx.Request("POST", "https://api.resend.com/emails"), json={"id": "test"})
        with patch.object(mailer, "RESEND_API_KEY", "test-key"), patch.object(mailer, "RESEND_FROM", "sender@example.com"), patch.object(mailer.httpx, "AsyncClient") as factory:
            factory.return_value.__aenter__.return_value = client
            self.assertTrue(await mailer._deliver("recipient@example.com", "Verify", "verification-link"))
        args, kwargs = client.post.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-key")
        self.assertEqual(kwargs["json"], {"from": "sender@example.com", "to": ["recipient@example.com"], "subject": "Verify", "text": "verification-link"})

    async def test_failure_does_not_log_secrets_or_fall_back(self):
        client = AsyncMock()
        client.post.side_effect = httpx.ConnectError("secret-token")
        with patch.object(mailer, "RESEND_API_KEY", "test-key"), patch.object(mailer.httpx, "AsyncClient") as factory, patch.object(mailer, "_log_instead") as log_fallback, self.assertLogs("growth.mailer", level="ERROR") as logs:
            factory.return_value.__aenter__.return_value = client
            self.assertFalse(await mailer._deliver("recipient@example.com", "Verify", "secret-token"))
            log_fallback.assert_not_called()
            self.assertNotIn("secret-token", str(logs.output))


if __name__ == "__main__":
    unittest.main()
