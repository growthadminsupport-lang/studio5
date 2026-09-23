"""HTTP validation regression tests using real FastAPI/Pydantic, without a DB."""
import os
import unittest

from _stubs import add_project_root_to_path

add_project_root_to_path()
# Never use real credentials or call external services in this suite.
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/unused"
os.environ["JWT_SECRET"] = "validation-tests-only-" + "x" * 48
os.environ["GOOGLE_CLIENT_IDS"] = ""
os.environ["SMTP_HOST"] = ""

from fastapi.testclient import TestClient
from pydantic import ValidationError
from main import app
from database import get_db
from routes_auth import RegisterRequest
from routes_children import ChildCreate, ChildUpdate


async def no_database():
    yield None  # Invalid requests must be rejected before endpoint DB operations.


class RequestValidationTests(unittest.TestCase):
    def test_child_name_is_trimmed(self):
        child = ChildCreate(name="  ต้นกล้า  ", sex="male", date_of_birth="2020-01-01")
        self.assertEqual(child.name, "ต้นกล้า")
        self.assertEqual(ChildUpdate(name="  ต้นกล้า  ").name, "ต้นกล้า")

    def test_blank_names_are_rejected(self):
        for name in (" ", "\t\n", "\u3000"):
            for model, fields in (
                (ChildCreate, dict(sex="male", date_of_birth="2020-01-01")),
                (ChildUpdate, {}),
                (RegisterRequest, dict(email="parent@example.com", password="ParentPhrase2026", terms_accepted=True)),
            ):
                with self.subTest(model=model.__name__, name=repr(name)):
                    with self.assertRaises(ValidationError):
                        model(**{("full_name" if model is RegisterRequest else "name"): name}, **fields)

    def test_register_name_is_trimmed(self):
        user = RegisterRequest(full_name="  Parent  ", email="parent@example.com", password="ParentPhrase2026", terms_accepted=True)
        self.assertEqual(user.full_name, "Parent")

    def test_partial_update_still_allows_omitted_fields(self):
        self.assertEqual(ChildUpdate(sex="female").sex, "female")
        self.assertIsNone(ChildUpdate().name)

    def test_error_responses_do_not_echo_secrets(self):
        cases = [
            ("/api/auth/register", {"full_name":"Parent", "email":"parent@example.com", "password":"xY!7", "terms_accepted":True}, "xY!7"),
            ("/api/auth/refresh", {"refresh_token":{"secret":"refresh-secret-marker"}}, "refresh-secret-marker"),
            ("/api/auth/google", {"id_token":{"secret":"google-secret-marker"}}, "google-secret-marker"),
        ]
        app.dependency_overrides[get_db] = no_database
        try:
            with TestClient(app) as client:
                for path, body, secret in cases:
                    with self.subTest(path=path):
                        response = client.post(path, json=body)
                        self.assertEqual(response.status_code, 422)
                        self.assertNotIn(secret, response.text)
                        self.assertTrue(response.json()["detail"])
                        for error in response.json()["detail"]:
                            self.assertEqual(set(error), {"loc", "msg", "type"})
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
