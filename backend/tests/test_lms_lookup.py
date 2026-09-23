"""
ทดสอบการหาค่า LMS จากตารางอ้างอิง + การ interpolate + การคำนวณรวม
ใช้ FakeSession แทนฐานข้อมูลจริง (ดูคำอธิบายใน _stubs.py)

รัน:  python tests/test_lms_lookup.py
"""
import asyncio
import sys
from datetime import date

from _stubs import FakeSession, RefRow, add_project_root_to_path, stub_sqlalchemy_if_missing

add_project_root_to_path()
stub_sqlalchemy_if_missing()

from growth_calc import (  # noqa: E402
    MAX_EXTRAPOLATION_MONTHS,
    calculate_growth_result,
    evaluate_metric,
    get_lms_params,
)

failures = []


def report(name, ok, fail_detail="", ok_detail=""):
    if ok:
        print(f"  ok   {name}{(' = ' + ok_detail) if ok_detail else ''}")
    else:
        failures.append(f"{name}: {fail_detail}")
        print(f"  FAIL {name}: {fail_detail}")


def check_lms(name, rows, age, expected):
    """expected = None หรือ tuple (L, M, S)"""
    db = FakeSession({"height": rows}, age, metric_order=["height"])
    got = asyncio.run(get_lms_params(db, "male", age, "height"))

    if expected is None:
        report(name, got is None, fail_detail=f"ควรได้ None แต่ได้ {got}", ok_detail="None")
        return
    if got is None:
        report(name, False, fail_detail="ควรได้ค่า LMS แต่ได้ None")
        return
    ok = all(abs(a - b) < 1e-9 for a, b in zip(got, expected))
    report(name, ok,
           fail_detail=f"ควรได้ {expected} แต่ได้ {got}",
           ok_detail=str(tuple(round(x, 6) for x in got)))


# ตารางตัวอย่าง: มีข้อมูลที่อายุ 12 กับ 36 เดือนเท่านั้น
SPARSE = [
    RefRow(12, l_value=-1.0, m_value=100.0, s_value=0.040),
    RefRow(36, l_value=1.0, m_value=140.0, s_value=0.060),
]

print("get_lms_params — ตรงกับตารางพอดี")
check_lms("อายุ 12 ตรงกับแถวแรก", SPARSE, 12, (-1.0, 100.0, 0.040))
check_lms("อายุ 36 ตรงกับแถวสุดท้าย", SPARSE, 36, (1.0, 140.0, 0.060))

print("\nget_lms_params — interpolate ระหว่างสองแถว")
# อายุ 24 อยู่กึ่งกลางระหว่าง 12 กับ 36 พอดี ทุกค่าต้องเป็นค่ากลาง
check_lms("อายุ 24 = กึ่งกลาง", SPARSE, 24, (0.0, 120.0, 0.050))
# อายุ 18 = 25% ของช่วง
check_lms("อายุ 18 = 25% ของช่วง", SPARSE, 18, (-0.5, 110.0, 0.045))

print("\nget_lms_params — นอกช่วงตาราง (MAX_EXTRAPOLATION_MONTHS = %d)" % MAX_EXTRAPOLATION_MONTHS)
check_lms("ต่ำกว่าตารางเล็กน้อย ยังใช้แถวขอบได้",
          SPARSE, 12 - MAX_EXTRAPOLATION_MONTHS, (-1.0, 100.0, 0.040))
check_lms("ต่ำกว่าตารางเกินกำหนด ต้องได้ None",
          SPARSE, 12 - MAX_EXTRAPOLATION_MONTHS - 1, None)
check_lms("สูงกว่าตารางเล็กน้อย ยังใช้แถวขอบได้",
          SPARSE, 36 + MAX_EXTRAPOLATION_MONTHS, (1.0, 140.0, 0.060))
check_lms("สูงกว่าตารางเกินกำหนด ต้องได้ None (เดิมเอาค่าขอบมาใช้เงียบ ๆ)",
          SPARSE, 36 + MAX_EXTRAPOLATION_MONTHS + 1, None)
check_lms("อายุ 40 ปี กับตารางเด็ก ต้องได้ None", SPARSE, 480, None)

print("\nget_lms_params — ไม่มีข้อมูลเลย")
check_lms("ตารางว่าง", [], 24, None)

print("\nevaluate_metric")


def check_metric(name, rows, age, value, expect_sds=None, expect_flagged=None, expect_none=False):
    db = FakeSession({"height": rows}, age, metric_order=["height"])
    got = asyncio.run(evaluate_metric(db, "male", age, "height", value))

    if expect_none:
        report(name, got is None, fail_detail=f"ควรได้ None แต่ได้ {got}", ok_detail="None")
        return
    if got is None:
        report(name, False, fail_detail="ควรได้ผลลัพธ์ แต่ได้ None")
        return
    problems = []
    if expect_sds is not None and abs(got.sds - expect_sds) > 0.001:
        problems.append(f"sds ควรได้ {expect_sds} แต่ได้ {got.sds}")
    if expect_flagged is not None and got.is_flagged != expect_flagged:
        problems.append(f"is_flagged ควรได้ {expect_flagged} แต่ได้ {got.is_flagged}")
    if not 0.0 <= got.percentile <= 100.0:
        problems.append(f"percentile หลุดกรอบ 0-100: {got.percentile}")
    report(name, not problems,
           fail_detail="; ".join(problems),
           ok_detail=f"sds={got.sds} pct={got.percentile}")


# ที่อายุ 12: L=-1, M=100, S=0.04 — วัดได้ 100 พอดีต้องได้ SDS 0 / percentile 50
check_metric("วัดได้เท่าค่ากลาง -> SDS 0 ไม่ flag", SPARSE, 12, 100.0,
             expect_sds=0.0, expect_flagged=False)
check_metric("สูงกว่าค่ากลางมาก -> flag", SPARSE, 12, 130.0, expect_flagged=True)
check_metric("ต่ำกว่าค่ากลางมาก -> flag", SPARSE, 12, 80.0, expect_flagged=True)
check_metric("ไม่มีข้อมูลอ้างอิง -> None", SPARSE, 480, 100.0, expect_none=True)

print("\ncalculate_growth_result — เส้นทางปกติครบทั้ง 3 metric")

# เด็กเกิด 2020-01-01 วัด 2022-01-01 = อายุ 24 เดือนพอดี
# ตั้งค่า M ของแต่ละ metric ให้ตรงกับค่าที่วัดได้ เพื่อให้ SDS = 0 ทุกตัว
# height 110, weight 20 -> bmi = 20 / 1.1^2 = 16.53 (ปัดจาก 16.5289...)
AT_24 = {
    "height": [RefRow(24, l_value=1.0, m_value=110.0, s_value=0.04)],
    "weight": [RefRow(24, l_value=1.0, m_value=20.0, s_value=0.10)],
    "bmi": [RefRow(24, l_value=1.0, m_value=16.53, s_value=0.08)],
}

db = FakeSession(AT_24, 24)
result = asyncio.run(calculate_growth_result(
    db=db, sex="male",
    date_of_birth=date(2020, 1, 1), measurement_date=date(2022, 1, 1),
    height_cm=110.0, weight_kg=20.0,
))

report("bmi คำนวณถูก", result["bmi"] == 16.53,
       fail_detail=f"ได้ {result['bmi']}", ok_detail=str(result["bmi"]))
report("height_sds = 0", abs(result["height_sds"]) < 0.001, fail_detail=f"ได้ {result['height_sds']}")
report("weight_sds = 0", abs(result["weight_sds"]) < 0.001, fail_detail=f"ได้ {result['weight_sds']}")
report("bmi_sds = 0", abs(result["bmi_sds"]) < 0.001, fail_detail=f"ได้ {result['bmi_sds']}")
report("height_percentile = 50", abs(result["height_percentile"] - 50.0) < 0.01,
       fail_detail=f"ได้ {result['height_percentile']}")
report("ไม่ถูก flag", result["is_flagged"] is False, fail_detail=f"ได้ {result['is_flagged']}")
report("ข้อความแนะนำเป็นแบบปกติ", "ปกติ" in result["guidance_message"],
       fail_detail=result["guidance_message"], ok_detail=result["guidance_message"])

print("\ncalculate_growth_result — ไม่มีข้อมูลอ้างอิงสำหรับอายุนี้")
# เกิด 2020-01-01 วัด 2030-01-01 = อายุ 120 เดือน ห่างจากแถวเดียวที่มี (24) เกินกำหนดมาก
# FakeSession ต้องถูกบอกอายุเดียวกับที่โค้ดจริงจะถาม ไม่งั้นมันจะคืนแถวผิดให้
db = FakeSession(AT_24, 120)
result = asyncio.run(calculate_growth_result(
    db=db, sex="male",
    date_of_birth=date(2020, 1, 1), measurement_date=date(2030, 1, 1),
    height_cm=140.0, weight_kg=35.0,
))
report("percentile เป็น None ทั้งหมด",
       result["height_percentile"] is None and result["weight_percentile"] is None
       and result["bmi_percentile"] is None,
       fail_detail=str(result))
report("sds เป็น None ทั้งหมด",
       result["height_sds"] is None and result["weight_sds"] is None
       and result["bmi_sds"] is None,
       fail_detail=str(result))
report("ยังคำนวณ bmi ได้ตามปกติ", result["bmi"] == round(35 / 1.4 ** 2, 2),
       fail_detail=f"ได้ {result['bmi']}", ok_detail=str(result["bmi"]))
report("ไม่ flag เมื่อไม่มีข้อมูลเทียบ", result["is_flagged"] is False,
       fail_detail=f"ได้ {result['is_flagged']}")

print()
if failures:
    print(f"ไม่ผ่าน {len(failures)} เคส")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("ผ่านทั้งหมด")
