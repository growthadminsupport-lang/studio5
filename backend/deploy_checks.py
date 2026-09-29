"""Configuration and schema checks shared by deployment and readiness."""
import os
from urllib.parse import urlsplit

from sqlalchemy import inspect
from config import parse_cors_origins
from models import Base


def validate_configuration():
    # Import validates JWT/database URL and mail provider settings before DB writes.
    import auth  # noqa: F401
    from mailer import EMAIL_ENABLED
    if os.environ.get("APP_ENV") != "production":
        return
    if not EMAIL_ENABLED:
        raise RuntimeError("Production password reset requires a mail provider and MAIL_FROM")
    origins = parse_cors_origins(os.environ.get("CORS_ORIGINS", ""))
    base = os.environ.get("APP_BASE_URL", "")
    if not origins or any(urlsplit(o).scheme != "https" for o in origins):
        raise RuntimeError("Production CORS_ORIGINS must explicitly list HTTPS frontend origins")
    if urlsplit(base).scheme != "https" or not urlsplit(base).netloc:
        raise RuntimeError("Production APP_BASE_URL must be the HTTPS frontend URL")
    if len(os.environ.get("JWT_SECRET", "")) < 32:
        raise RuntimeError("Production JWT_SECRET must contain at least 32 characters")


async def validate_schema(connection):
    def check(sync_connection):
        inspector = inspect(sync_connection)
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name, schema="public"):
                raise RuntimeError(f"Unsupported schema: missing table {table.name}")
            columns = {c["name"]: c for c in inspector.get_columns(table.name, schema="public")}
            for column in table.columns:
                actual = columns.get(column.name)
                if actual is None or actual["type"]._type_affinity != column.type._type_affinity:
                    raise RuntimeError(f"Unsupported schema: {table.name}.{column.name}")
        uniques = inspector.get_unique_constraints("ref_growth_lms", schema="public")
        if not any(set(u["column_names"]) == {"sex", "age_months", "metric_type"} for u in uniques):
            raise RuntimeError("Missing growth reference uniqueness constraint")
    await connection.run_sync(check)
