"""Production startup must reject incomplete environment configuration."""
import os
import unittest
from unittest.mock import patch
from _stubs import add_project_root_to_path
add_project_root_to_path()
os.environ.update(DATABASE_URL="postgresql://test:test@localhost/unused",
                  JWT_SECRET="test-" + "x" * 40, APP_ENV="development", SMTP_HOST="", RESEND_API_KEY="")
from deploy_checks import validate_configuration
import mailer


class ProductionTests(unittest.TestCase):
    def test_required_settings(self):
        valid = dict(APP_ENV="production", JWT_SECRET="x" * 40,
                     CORS_ORIGINS="https://frontend.example", APP_BASE_URL="https://frontend.example")
        with patch.dict(os.environ, valid), patch.object(mailer, "EMAIL_ENABLED", True):
            validate_configuration()
            for key, value in (("CORS_ORIGINS", ""), ("CORS_ORIGINS", "*"),
                               ("CORS_ORIGINS", "http://frontend.example"),
                               ("APP_BASE_URL", "http://localhost:5173"), ("JWT_SECRET", "short")):
                with patch.dict(os.environ, {key: value}), self.assertRaises((ValueError, RuntimeError)):
                    validate_configuration()
        with patch.dict(os.environ, valid), patch.object(mailer, "EMAIL_ENABLED", False):
            with self.assertRaises(RuntimeError):
                validate_configuration()


if __name__ == "__main__":
    unittest.main()
