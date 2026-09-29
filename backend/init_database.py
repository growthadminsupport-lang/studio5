"""Initialize, apply known additive migrations, and seed CDC without overwriting data."""
import asyncio
import re
from pathlib import Path

from sqlalchemy import text
from database import engine
from cdc_reference import load_reference, seed_reference
from deploy_checks import validate_configuration, validate_schema


async def initialize():
    validate_configuration()
    expected = load_reference()
    folder = Path(__file__).resolve().parent
    try:
        async with engine.begin() as connection:
            await connection.execute(text("SELECT pg_advisory_xact_lock(57290421)"))
            tables = (await connection.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))).scalars().all()
            raw = await connection.get_raw_connection()
            if not tables:
                await raw.driver_connection.execute((folder / "growth_schema.sql").read_text(encoding="utf-8"))
                admin_sql = (folder / "admin_schema.sql").read_text(encoding="utf-8").split("\\if :{?admin_email}", 1)[0]
                await raw.driver_connection.execute(admin_sql)
            elif not {"usr_accounts", "chd_profiles", "chd_growth_records", "ref_growth_lms"}.issubset(tables):
                raise RuntimeError("Unsupported existing database; initialization will not overwrite it")
            # Known additive migrations, enclosed in this transaction, including seed.
            for name in ("2026-08-22_google_signin.sql", "2026-09-23_email_verification.sql",
                         "2026-09-29_cdc_lms.sql", "2026-09-29_refine9_bone_age.sql",
                         "2026-09-29_disable_registration_verification.sql"):
                sql = (folder / "migrations" / name).read_text(encoding="utf-8")
                sql = re.sub(r"(?m)^\s*(BEGIN|COMMIT);\s*$", "", sql)
                await raw.driver_connection.execute(sql)
            await validate_schema(connection)
            added = await seed_reference(connection, expected)
            print(f"Database ready; {added} CDC rows added; existing accounts and history preserved")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(initialize())
