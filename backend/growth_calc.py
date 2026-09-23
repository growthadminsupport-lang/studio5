import math
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import GrowthReferenceLMS

SDS_FLAG_THRESHOLD = 2.0  # |SDS| เกินนี้ = is_flagged (ปรับได้ตามเกณฑ์ที่ทีมกำหนด)

# ยอมให้อายุอยู่นอกช่วงของตาราง reference ได้ไม่เกินกี่เดือน
# ถ้าเกินนี้ถือว่าไม่มีข้อมูลอ้างอิง (คืน None) ดีกว่าเอาค่าขอบตารางมาใช้เงียบ ๆ
MAX_EXTRAPOLATION_MONTHS = 3

METRIC_LABELS = {
    "height": "ส่วนสูง",
    "weight": "น้ำหนัก",
    "bmi": "ดัชนีมวลกาย",
}


def calculate_age_months(date_of_birth: date, measurement_date: date) -> int:
    """แปลงวันเกิด + วันที่วัด เป็นอายุหน่วยเดือน"""
    # เดิม max(months, 0) จะกลืนกรณีวัดก่อนวันเกิดให้กลายเป็นอายุ 0 เดือนเงียบ ๆ
    # แล้วไปเทียบกับ reference ของทารกแรกเกิด — ผลที่ได้ผิดโดยไม่มีสัญญาณเตือน
    if measurement_date < date_of_birth:
        raise ValueError("วันที่วัดอยู่ก่อนวันเกิด")

    months = (measurement_date.year - date_of_birth.year) * 12
    months += measurement_date.month - date_of_birth.month
    if measurement_date.day < date_of_birth.day:
        months -= 1
    return max(months, 0)


async def get_lms_params(
    db: AsyncSession, sex: str, age_months: int, metric_type: str
) -> tuple[float, float, float] | None:
    """หา L, M, S จาก ref_growth_lms — interpolate ระหว่าง 2 เดือนใกล้เคียงถ้าไม่มี exact match"""
    lower = (
        await db.execute(
            select(GrowthReferenceLMS)
            .where(
                GrowthReferenceLMS.sex == sex,
                GrowthReferenceLMS.metric_type == metric_type,
                GrowthReferenceLMS.age_months <= age_months,
            )
            .order_by(GrowthReferenceLMS.age_months.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    upper = (
        await db.execute(
            select(GrowthReferenceLMS)
            .where(
                GrowthReferenceLMS.sex == sex,
                GrowthReferenceLMS.metric_type == metric_type,
                GrowthReferenceLMS.age_months >= age_months,
            )
            .order_by(GrowthReferenceLMS.age_months.asc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if lower is None and upper is None:
        return None  # ไม่มีข้อมูลอ้างอิงช่วงอายุนี้เลย

    # อยู่นอกช่วงตาราง: เดิมหยิบค่าขอบมาใช้เท่าไหร่ก็ได้ เด็กอายุ 40 ปีจึงถูกเทียบ
    # กับเกณฑ์อายุ 20 ปีโดยไม่มีสัญญาณอะไรเลย — จำกัดระยะที่ยอมให้คลาดได้
    if lower is None:
        if upper.age_months - age_months > MAX_EXTRAPOLATION_MONTHS:
            return None
        return (upper.l_value, upper.m_value, upper.s_value)
    if upper is None:
        if age_months - lower.age_months > MAX_EXTRAPOLATION_MONTHS:
            return None
        return (lower.l_value, lower.m_value, lower.s_value)
    if lower.age_months == upper.age_months:
        return (lower.l_value, lower.m_value, lower.s_value)

    fraction = (age_months - lower.age_months) / (upper.age_months - lower.age_months)
    l = lower.l_value + fraction * (upper.l_value - lower.l_value)
    m = lower.m_value + fraction * (upper.m_value - lower.m_value)
    s = lower.s_value + fraction * (upper.s_value - lower.s_value)
    return (l, m, s)


def calculate_sds(value: float, l: float, m: float, s: float) -> float:
    """สูตร LMS มาตรฐาน (WHO/CDC) — ค่าที่วัดได้ → Z-score (SDS)"""
    # value <= 0 ทำให้ math.log ระเบิดเป็น ValueError, m == 0 หารด้วยศูนย์,
    # s == 0 หารด้วยศูนย์ทั้งสองสาขา — เช็คก่อนเพื่อให้ error สื่อสาเหตุได้
    if value <= 0:
        raise ValueError("ค่าที่วัดได้ต้องมากกว่า 0")
    if m <= 0 or s <= 0:
        raise ValueError(f"พารามิเตอร์ LMS ไม่ถูกต้อง (M={m}, S={s} ต้องมากกว่า 0)")

    if l == 0:
        return math.log(value / m) / s
    return ((value / m) ** l - 1) / (l * s)


def sds_to_percentile(sds: float) -> float:
    """Z-score → percentile (0-100) ด้วย standard normal CDF"""
    percentile = (1 + math.erf(sds / math.sqrt(2))) / 2 * 100
    return round(percentile, 2)


def build_guidance_message(metric_type: str, sds: float) -> str:
    """ข้อความแบบ plain-language — ไม่ใช่การวินิจฉัย แค่แนะนำให้ปรึกษาแพทย์ถ้าค่าออกนอกเกณฑ์"""
    label = METRIC_LABELS.get(metric_type, metric_type)
    if sds > SDS_FLAG_THRESHOLD:
        return f"ค่า{label}สูงกว่าเกณฑ์เฉลี่ยมาก แนะนำให้ปรึกษาแพทย์เพื่อประเมินเพิ่มเติม"
    if sds < -SDS_FLAG_THRESHOLD:
        return f"ค่า{label}ต่ำกว่าเกณฑ์เฉลี่ยมาก แนะนำให้ปรึกษาแพทย์เพื่อประเมินเพิ่มเติม"
    return f"ค่า{label}อยู่ในเกณฑ์ปกติ"


class MetricResult:
    """ผลลัพธ์การคำนวณของ 1 metric (height/weight/bmi)"""

    def __init__(self, sds: float, percentile: float, is_flagged: bool):
        self.sds = round(sds, 3)
        self.percentile = percentile
        self.is_flagged = is_flagged


async def evaluate_metric(
    db: AsyncSession, sex: str, age_months: int, metric_type: str, value: float
) -> MetricResult | None:
    """คำนวณ SDS + percentile + is_flagged สำหรับ metric เดียว"""
    params = await get_lms_params(db, sex, age_months, metric_type)
    if params is None:
        return None
    l, m, s = params
    sds = calculate_sds(value, l, m, s)
    return MetricResult(
        sds=sds,
        percentile=sds_to_percentile(sds),
        is_flagged=abs(sds) > SDS_FLAG_THRESHOLD,
    )


async def calculate_growth_result(
    db: AsyncSession,
    sex: str,
    date_of_birth: date,
    measurement_date: date,
    height_cm: float,
    weight_kg: float,
) -> dict:
    """ฟังก์ชันหลัก — เรียกใช้จาก endpoint POST /api/growth ตอนบันทึกผลวัดใหม่"""
    # height_cm = 0 ทำให้บรรทัดคำนวณ BMI เป็น ZeroDivisionError → 500
    if height_cm <= 0 or weight_kg <= 0:
        raise ValueError("ส่วนสูงและน้ำหนักต้องมากกว่า 0")

    age_months = calculate_age_months(date_of_birth, measurement_date)
    bmi = round(weight_kg / ((height_cm / 100) ** 2), 2)

    height_result = await evaluate_metric(db, sex, age_months, "height", height_cm)
    weight_result = await evaluate_metric(db, sex, age_months, "weight", weight_kg)
    bmi_result = await evaluate_metric(db, sex, age_months, "bmi", bmi)

    all_results = [("height", height_result), ("weight", weight_result), ("bmi", bmi_result)]
    flagged = any(r.is_flagged for _, r in all_results if r)

    messages = [build_guidance_message(m, r.sds) for m, r in all_results if r and r.is_flagged]
    missing = [METRIC_LABELS[m] for m, r in all_results if r is None]
    if missing:
        messages.append(
            f"ข้อมูลอ้างอิงไม่ครบ ({', '.join(missing)}) จึงยังสรุปเกณฑ์การเติบโตทั้งหมดไม่ได้"
        )
    guidance_message = " / ".join(messages) if messages else "ค่าการเจริญเติบโตทั้งหมดอยู่ในเกณฑ์ปกติ"

    return {
        "bmi": bmi,
        "height_percentile": height_result.percentile if height_result else None,
        "height_sds": height_result.sds if height_result else None,
        "weight_percentile": weight_result.percentile if weight_result else None,
        "weight_sds": weight_result.sds if weight_result else None,
        "bmi_percentile": bmi_result.percentile if bmi_result else None,
        "bmi_sds": bmi_result.sds if bmi_result else None,
        "is_flagged": flagged,
        "guidance_message": guidance_message,
    }
