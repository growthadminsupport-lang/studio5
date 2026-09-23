r"""Read-only live configuration/schema/JWKS and HTTP checks; no real user tokens.

Run from backend: .\venv\Scripts\python.exe -X utf8 tests\google_auth_smoke_test.py
Starts an isolated temporary API on an OS-assigned localhost port, then stops it.
"""
import asyncio
import socket
import subprocess
import sys
import time
from pathlib import Path

from _stubs import add_project_root_to_path

add_project_root_to_path()
import httpx
from sqlalchemy import text
from database import engine
import google_oauth


async def check_services():
    print(f"GOOGLE_ENABLED={google_oauth.GOOGLE_ENABLED}, CLIENT_ID_COUNT={len(google_oauth.GOOGLE_CLIENT_IDS)}")
    try:
        async with engine.connect() as conn:
            identity = await conn.scalar(text("SELECT to_regclass('public.usr_identities') IS NOT NULL"))
            nullable = await conn.scalar(text(
                "SELECT is_nullable FROM information_schema.columns "
                "WHERE table_schema='public' AND table_name='usr_accounts' AND column_name='password_hash'"))
            assert identity and nullable == "YES", "Google schema migration required"
            print("Database connection and Google schema: PASS")
        jwks, _ = await google_oauth._fetch_jwks()
        assert jwks.get("keys"), "JWKS has no keys"
        print("Google JWKS connectivity: PASS")
    finally:
        await engine.dispose()


def check_http():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=Path(__file__).resolve().parents[1], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10) as client:
            for _ in range(50):
                if process.poll() is not None:
                    raise RuntimeError("Temporary API failed to start")
                try:
                    if client.get("/").status_code == 200:
                        break
                except httpx.ConnectError:
                    pass
                time.sleep(0.1)
            assert client.get("/health").status_code == 200
            print("Live API /health: PASS")
            response = client.post("/api/auth/google", json={"id_token": "invalid", "terms_accepted": True})
            assert response.status_code == 401, f"Invalid token status: {response.status_code}"
            print("Live Google endpoint rejects invalid token: PASS")
            response = client.post("/api/auth/google", json={"id_token": "", "terms_accepted": True})
            assert response.status_code == 422
            print("Live Google request validation: PASS")
            response = client.options("/api/auth/google", headers={
                "Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"})
            assert response.status_code == 200
            assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
            print("Frontend localhost:3000 CORS: PASS")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


if __name__ == "__main__":
    try:
        asyncio.run(check_services())
        check_http()
    except Exception as exc:
        # Driver errors can contain connection details. Do not print them.
        print(f"Smoke check failed ({type(exc).__name__}); details suppressed to protect configuration.")
        sys.exit(1)
