"""Pinned CDC 2000 reference data; no network access at startup."""
import csv
import hashlib
import io
import json
import math
from pathlib import Path

from sqlalchemy import text

DATA_DIR = Path(__file__).resolve().parent / "data" / "cdc2000"


def load_reference(folder=DATA_DIR):
    manifest = json.loads((folder / "manifest.json").read_text())
    rows = {}
    for name, spec in manifest["files"].items():
        data = (folder / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != spec["sha256"]:
            raise RuntimeError(f"CDC checksum mismatch: {name}")
        for row in csv.DictReader(io.StringIO(data.decode("utf-8-sig"))):
            # The official BMI file repeats its header between boys and girls.
            if row["Sex"] == "Sex":
                continue
            age = float(row["Agemos"])
            if not 24 <= age <= 240:
                continue  # Original BMI file also contains 240.5 months.
            sex = {"1": "male", "2": "female"}[row["Sex"]]
            key = (sex, age, spec["metric"])
            values = tuple(float(row[col]) for col in ("L", "M", "S"))
            if key in rows or not all(math.isfinite(v) for v in values) or min(values[1:]) <= 0:
                raise RuntimeError(f"Invalid CDC row: {key}")
            rows[key] = values
    expected = {(sex, age, metric) for sex in ("male", "female")
                for age in [24.0, *[m + .5 for m in range(24, 240)], 240.0]
                for metric in ("height", "weight", "bmi")}
    if rows.keys() != expected:
        raise RuntimeError("CDC data must cover both sexes and all three metrics, 24–240 months")
    return rows


async def existing_reference(connection):
    result = await connection.execute(text(
        "SELECT sex::text, age_months, metric_type::text, l_value, m_value, s_value FROM ref_growth_lms"
    ))
    return {(r[0], float(r[1]), r[2]): tuple(r[3:]) for r in result}


def check_existing(existing, expected, complete=False):
    for key, values in existing.items():
        if key not in expected or values != expected[key]:
            raise RuntimeError(f"Existing growth reference conflicts with CDC 2000 at {key}; no data overwritten")
    if complete and existing != expected:
        raise RuntimeError("CDC reference data is incomplete; run init_database.py")


async def seed_reference(connection, expected):
    existing = await existing_reference(connection)
    check_existing(existing, expected)
    missing = [dict(sex=k[0], age=k[1], metric=k[2], l=v[0], m=v[1], s=v[2])
               for k, v in expected.items() if k not in existing]
    if missing:
        await connection.execute(text("""
            INSERT INTO ref_growth_lms (sex, age_months, metric_type, l_value, m_value, s_value)
            VALUES (CAST(:sex AS sex_type), :age, CAST(:metric AS metric_type), :l, :m, :s)
        """), missing)
    return len(missing)
