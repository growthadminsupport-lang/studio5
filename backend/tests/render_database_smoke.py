"""Opt-in, disposable PostgreSQL + live HTTP test. Never use an application database.

Set GROWTH_TEST_DATABASE_URL to an empty localhost database named render_test*.
"""
import asyncio
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.parse import urlsplit
import uuid

import asyncpg
import httpx

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ["GROWTH_TEST_DATABASE_URL"]
parsed = urlsplit(URL)
if parsed.hostname not in ("localhost", "127.0.0.1") or not parsed.path.startswith("/render_test"):
    raise RuntimeError("Only disposable localhost render_test* databases are allowed")
env = dict(os.environ, DATABASE_URL=URL, APP_ENV="development", JWT_SECRET="smoke-only-" + "x" * 40,
           RESEND_API_KEY="", SMTP_HOST="", GOOGLE_CLIENT_IDS="", APP_BASE_URL="http://localhost:5173",
           CORS_ORIGINS="https://frontend.example")


async def sql_async(query):
    connection = await asyncpg.connect(URL)
    try:
        return await connection.fetch(query)
    finally:
        await connection.close()


def sql(query):
    return asyncio.run(sql_async(query))


def initialize(ok=True):
    result = subprocess.run([sys.executable, "init_database.py"], cwd=ROOT, env=env, capture_output=True)
    assert (result.returncode == 0) == ok, result.stderr.decode(errors="replace")


def start():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1",
                                "--port", str(port)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)
    client = httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=5)
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError("API process failed to start")
        try:
            if client.get("/health").status_code == 200:
                return process, client
        except httpx.ConnectError:
            pass
        time.sleep(.1)
    process.terminate()
    process.wait()
    raise RuntimeError("API failed readiness")


if __name__ == "__main__":
    assert not sql("SELECT tablename FROM pg_tables WHERE schemaname='public'"), "Use a fresh test database"
    initialize()
    initialize()
    concurrent = [subprocess.Popen([sys.executable, "init_database.py"], cwd=ROOT, env=env,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) for _ in range(2)]
    assert all(p.wait(timeout=30) == 0 for p in concurrent)
    process, client = start()
    try:
        headers = []
        for _ in range(2):
            email = f"render-{uuid.uuid4().hex}@example.com"
            payload = dict(email=email, password="ParentPhrase2026", full_name="Render test", terms_accepted=True)
            registration = client.post("/api/auth/register", json=payload)
            assert registration.status_code == 202
            assert registration.json()["verification_required"] is False
            response = client.post("/api/auth/login", json={"email":email,"password":payload["password"]})
            assert response.status_code == 200, response.text
            headers.append({"Authorization": "Bearer " + response.json()["access_token"]})
        assert all(not row["email_verification_required"] for row in sql(
            "SELECT email_verification_required FROM usr_accounts"))
        assert not sql("SELECT * FROM usr_email_verifications")
        assert client.post("/api/auth/email/verification/resend", json={"email": email}).status_code == 410
        assert client.post("/api/auth/email/verify", json={"token": "old", "password": "old"}).status_code == 410
        response = client.post("/api/children", headers=headers[0], json={
            "name":"CDC test", "sex":"male", "date_of_birth":"2015-01-01"})
        assert response.status_code == 201, response.text
        child = response.json()["id"]
        path = f"/api/children/{child}/growth"
        response = client.post(path, headers=headers[0], json={
            "measurement_date":"2025-01-15", "height_cm":138, "weight_kg":32})
        assert response.status_code == 201, response.text
        record = response.json()
        assert all(record[f"{metric}_sds"] is not None for metric in ("height","weight","bmi"))
        assert client.get(path, headers=headers[1]).status_code == 404
        assert client.post(path, headers=headers[1], json={
            "measurement_date":"2025-01-15", "height_cm":138, "weight_kg":32}).status_code == 404
        assert client.get(path, headers=headers[0]).json()[0] == record
        assert client.options(path, headers={"Origin":"https://frontend.example",
            "Access-Control-Request-Method":"POST"}).headers["access-control-allow-origin"] == "https://frontend.example"
        assert client.options(path, headers={"Origin":"https://evil.example",
            "Access-Control-Request-Method":"POST"}).status_code == 400

        # Simulate the old integer schema with a compatible partial reference.
        sql("DELETE FROM ref_growth_lms WHERE age_months <> 24")
        sql("ALTER TABLE ref_growth_lms ALTER COLUMN age_months TYPE integer")
        assert client.get("/health").status_code == 503
        initialize()
        assert len(sql("SELECT * FROM ref_growth_lms")) == 1308
        assert client.get(path, headers=headers[0]).json()[0] == record
        assert len(sql("SELECT * FROM usr_accounts")) == 2
        assert client.get("/health").status_code == 200

        sql("UPDATE ref_growth_lms SET m_value=m_value+1 WHERE sex='male' AND age_months=24 AND metric_type='height'")
        initialize(ok=False)
        assert client.get("/health").status_code == 503
        sql("UPDATE ref_growth_lms SET m_value=m_value-1 WHERE sex='male' AND age_months=24 AND metric_type='height'")
        sql("ALTER TABLE chd_profiles RENAME COLUMN name TO broken_name")
        initialize(ok=False)
        assert client.get("/health").status_code == 503
        sql("ALTER TABLE chd_profiles RENAME COLUMN broken_name TO name")
    finally:
        client.close()
        process.terminate()
        process.wait(timeout=15)
    initialize()
    process, client = start()
    try:
        assert client.get(path, headers=headers[0]).json()[0] == record
        assert client.get("/health").status_code == 200
    finally:
        client.close()
        process.terminate()
        process.wait(timeout=15)
    print("PASS: fresh/repeated startup, integer migration, CDC seed/conflicts, readiness, registration/login, growth/history, ownership, CORS, restart persistence")
