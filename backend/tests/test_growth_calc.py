"""
ทดสอบฟังก์ชันล้วนของ growth_calc — ไม่แตะฐานข้อมูล

รัน:  python tests/test_growth_calc.py
"""
import asyncio
import sys
from datetime import date

from _stubs import add_project_root_to_path, stub_sqlalchemy_if_missing, FakeSession, RefRow

add_project_root_to_path()
stub_sqlalchemy_if_missing()

from growth_calc import (  # noqa: E402
    calculate_age_months,
    calculate_growth_result,
    calculate_sds,
    sds_to_percentile,
)

failures = []


def check(name, fn, expect_exc=None, expect=None, tol=1e-6):
    try:
        got = fn()
    except Exception as exc:
        if expect_exc and isinstance(exc, expect_exc):
            print(f"  ok   {name} -> {type(exc).__name__}: {exc}")
        else:
            failures.append(f"{name}: {type(exc).__name__}: {exc}")
            print(f"  FAIL {name} -> {type(exc).__name__}: {exc}")
        return

    if expect_exc:
        failures.append(f"{name}: ควรได้ {expect_exc.__name__} แต่ได้ {got!r}")
        print(f"  FAIL {name} -> ควรได้ {expect_exc.__name__} แต่ได้ {got!r}")
    elif expect is not None and abs(got - expect) > tol:
        failures.append(f"{name}: ควรได้ {expect} แต่ได้ {got}")
        print(f"  FAIL {name} -> ควรได้ {expect} แต่ได้ {got}")
    else:
        print(f"  ok   {name} = {got}")


print("calculate_age_months")
check("ครบ 12 เดือนพอดี",
      lambda: calculate_age_months(date(2020, 1, 15), date(2021, 1, 15)), expect=12)
check("ก่อนวันครบรอบ 1 วัน = 11 เดือน",
      lambda: calculate_age_months(date(2020, 1, 15), date(2021, 1, 14)), expect=11)
check("วันเดียวกัน = 0 เดือน",
      lambda: calculate_age_months(date(2020, 1, 15), date(2020, 1, 15)), expect=0)
check("วัดก่อนวันเกิดต้อง error (เดิมคืน 0 เงียบ ๆ)",
      lambda: calculate_age_months(date(2021, 5, 1), date(2020, 1, 1)), expect_exc=ValueError)

print("\ncalculate_sds")
check("ค่าวัด = M, L!=0 ต้องได้ 0",
      lambda: calculate_sds(100.0, -1.5, 100.0, 0.04), expect=0.0)
check("ค่าวัด = M, L==0 ต้องได้ 0",
      lambda: calculate_sds(100.0, 0.0, 100.0, 0.04), expect=0.0)
check("สูงกว่า M ต้องได้ SDS บวก",
      lambda: calculate_sds(110.0, 1.0, 100.0, 0.04) > 0, expect=True)
check("ต่ำกว่า M ต้องได้ SDS ลบ",
      lambda: calculate_sds(90.0, 1.0, 100.0, 0.04) < 0, expect=True)
check("ค่าวัด = 0 ต้อง error (เดิม math domain error)",
      lambda: calculate_sds(0.0, 1.0, 100.0, 0.04), expect_exc=ValueError)
check("S = 0 ต้อง error (เดิมหารด้วยศูนย์)",
      lambda: calculate_sds(100.0, 1.0, 100.0, 0.0), expect_exc=ValueError)
check("M = 0 ต้อง error (เดิมหารด้วยศูนย์)",
      lambda: calculate_sds(100.0, 1.0, 0.0, 0.04), expect_exc=ValueError)

print("\nsds_to_percentile")
check("SDS 0 -> 50", lambda: sds_to_percentile(0.0), expect=50.0, tol=0.01)
check("SDS +2 -> ~97.72", lambda: sds_to_percentile(2.0), expect=97.72, tol=0.01)
check("SDS -2 -> ~2.28", lambda: sds_to_percentile(-2.0), expect=2.28, tol=0.01)
# ต้องไม่หลุดกรอบ 0-100 ไม่งั้นชน CHECK constraint ของ growth_records
check("SDS สุดขั้วยังอยู่ในกรอบ 0-100",
      lambda: 0.0 <= sds_to_percentile(50.0) <= 100.0, expect=True)
check("SDS ติดลบสุดขั้วยังอยู่ในกรอบ 0-100",
      lambda: 0.0 <= sds_to_percentile(-50.0) <= 100.0, expect=True)

print("\ncalculate_growth_result (ตรวจ input ก่อนถึง DB)")


def run_growth(**overrides):
    args = dict(db=None, sex="male", date_of_birth=date(2020, 1, 1),
                measurement_date=date(2024, 1, 1), height_cm=110.0, weight_kg=20.0)
    args.update(overrides)
    return asyncio.run(calculate_growth_result(**args))


check("ส่วนสูง = 0 ต้อง error (เดิมเป็น ZeroDivisionError -> HTTP 500)",
      lambda: run_growth(height_cm=0.0), expect_exc=ValueError)
check("น้ำหนัก = 0 ต้อง error",
      lambda: run_growth(weight_kg=0.0), expect_exc=ValueError)
check("ส่วนสูงติดลบต้อง error",
      lambda: run_growth(height_cm=-5.0), expect_exc=ValueError)
check("วัดก่อนวันเกิดต้อง error",
      lambda: run_growth(measurement_date=date(2019, 1, 1)), expect_exc=ValueError)

print("\nguidance with missing reference data")

def result_with_references(rows):
    return run_growth(db=FakeSession(rows, 48))

missing = result_with_references({})
check("missing references must not report normal",
      lambda: "ปกติ" not in missing["guidance_message"], expect=True)
check("missing references keep SDS null",
      lambda: all(missing[f"{metric}_sds"] is None for metric in ("height", "weight", "bmi")), expect=True)
partial = result_with_references({"height": [RefRow(48, 1, 110, 0.1)]})
check("partial references must not report all normal",
      lambda: "ปกติ" not in partial["guidance_message"], expect=True)
flagged_partial = result_with_references({"height": [RefRow(48, 1, 80, 0.1)]})
check("partial references retain flagged metric guidance and explain missing data",
      lambda: flagged_partial["is_flagged"] and "ส่วนสูง" in flagged_partial["guidance_message"]
      and "ข้อมูลอ้างอิง" in flagged_partial["guidance_message"], expect=True)
complete = result_with_references({
    "height": [RefRow(48, 1, 110, 0.1)], "weight": [RefRow(48, 1, 20, 0.1)],
    "bmi": [RefRow(48, 1, 16.53, 0.1)],
})
check("complete normal references retain normal result",
      lambda: "ทั้งหมดอยู่ในเกณฑ์ปกติ" in complete["guidance_message"] and not complete["is_flagged"], expect=True)

print()
if failures:
    print(f"ไม่ผ่าน {len(failures)} เคส")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("ผ่านทั้งหมด")
