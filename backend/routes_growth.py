"""
Endpoint บันทึกและดูผลการเจริญเติบโต — /api/children/{child_id}/growth (FR-6 ถึง FR-11)

    POST /api/children/{child_id}/growth   บันทึกผลวัดใหม่ คำนวณ percentile/SDS/BMI ให้อัตโนมัติ
    GET  /api/children/{child_id}/growth   ดูประวัติผลวัดทั้งหมดของเด็กคนนี้ เรียงจากล่าสุด

ตรรกะคำนวณ (age → SDS → percentile → BMI → guidance message) อยู่ใน growth_calc.py
ทั้งหมดอยู่แล้ว — endpoint นี้มีหน้าที่แค่ตรวจสิทธิ์ (FR-24, ผ่าน get_owned_child ใน
routes_children.py), ตรวจ input พื้นฐาน, ส่งต่อให้คำนวณ, แล้วบันทึกผล

ทำไม percentile/SDS ถึงคำนวณตอนบันทึกแล้วเก็บลงฐานข้อมูลเลย ไม่คำนวณสดตอนอ่าน:
ref_growth_lms อาจถูกแก้ไขในอนาคต (เพิ่มช่วงอายุ, ปรับค่าอ้างอิง) ถ้าคำนวณสดทุกครั้ง
ประวัติเก่าจะขยับตามค่าปัจจุบันโดยไม่มีใครรู้ตัว ซึ่งผิดหลักการของข้อมูลประวัติศาสตร์
"""
import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from growth_calc import calculate_growth_result
from models import GrowthRecord, User
from routes_children import get_owned_child

router = APIRouter(prefix="/api/children/{child_id}/growth", tags=["growth"])

Db = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# ป้องกันค่าที่พิมพ์ผิดหลักแบบเห็นได้ชัด (เช่น พิมพ์ 1750 แทน 175.0) ไม่ใช่ขอบเขต
# ทางการแพทย์จริง — growth_calc.py เป็นคนตัดสินว่าค่าอยู่นอกเกณฑ์ปกติหรือไม่
#
# ขอบล่างต้องมี ไม่ใช่แค่ gt=0 — คอลัมน์เป็น NUMERIC(5,2) ค่าอย่าง 0.001 จะถูกปัดเป็น 0.00
# แล้วชน CHECK (height_cm > 0) ในฐานข้อมูล กลายเป็น error ที่ไม่ตรงกับความจริง
# ทารกคลอดก่อนกำหนดสุดขั้วยังยาวเกิน 20 ซม. และหนักเกิน 0.3 กก. อยู่ดี
MIN_PLAUSIBLE_HEIGHT_CM = 20.0
MAX_PLAUSIBLE_HEIGHT_CM = 250.0
MIN_PLAUSIBLE_WEIGHT_KG = 0.3
MAX_PLAUSIBLE_WEIGHT_KG = 300.0

# chd_growth_records.bmi เป็น NUMERIC(5,2) เก็บได้สูงสุด 999.99 — ส่วนสูง 30 ซม.
# กับน้ำหนัก 100 กก. ผ่านการตรวจแต่ละช่องได้ แต่ BMI = 1111 จะล้นคอลัมน์เป็น 500
# ค่าจริงของมนุษย์ไม่เคยเกิน 100 อยู่แล้ว ตั้งเพดานไว้ต่ำกว่าลิมิตของคอลัมน์มาก
MAX_PLAUSIBLE_BMI = 200.0


# ------------------------------------------------------------
# รูปแบบข้อมูลเข้า-ออก
# ------------------------------------------------------------

class GrowthEntryCreate(BaseModel):
    measurement_date: date
    height_cm: float = Field(ge=MIN_PLAUSIBLE_HEIGHT_CM, le=MAX_PLAUSIBLE_HEIGHT_CM)
    weight_kg: float = Field(ge=MIN_PLAUSIBLE_WEIGHT_KG, le=MAX_PLAUSIBLE_WEIGHT_KG)

    @field_validator("measurement_date")
    @classmethod
    def _not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("วันที่วัดต้องไม่อยู่ในอนาคต")
        return v

    @model_validator(mode="after")
    def _plausible_combination(self):
        # ตรวจคู่กัน ไม่ใช่ทีละช่อง — แต่ละค่าอยู่ในช่วงได้แต่รวมกันแล้วเป็นไปไม่ได้
        bmi = self.weight_kg / (self.height_cm / 100) ** 2
        if bmi > MAX_PLAUSIBLE_BMI:
            raise ValueError(
                f"ส่วนสูง {self.height_cm} ซม. กับน้ำหนัก {self.weight_kg} กก. "
                f"ให้ค่า BMI {bmi:.0f} ซึ่งเป็นไปไม่ได้ กรุณาตรวจหน่วยที่กรอก"
            )
        return self


class GrowthEntryReply(BaseModel):
    id: str
    measurement_date: date
    height_cm: float
    weight_kg: float
    bmi: float | None
    height_percentile: float | None
    height_sds: float | None
    weight_percentile: float | None
    weight_sds: float | None
    bmi_percentile: float | None
    bmi_sds: float | None
    guidance_message: str | None
    is_flagged: bool
    created_at: datetime


def _to_reply(r: GrowthRecord) -> GrowthEntryReply:
    return GrowthEntryReply(
        id=str(r.id),
        measurement_date=r.measurement_date,
        height_cm=r.height_cm,
        weight_kg=r.weight_kg,
        bmi=r.bmi,
        height_percentile=r.height_percentile,
        height_sds=r.height_sds,
        weight_percentile=r.weight_percentile,
        weight_sds=r.weight_sds,
        bmi_percentile=r.bmi_percentile,
        bmi_sds=r.bmi_sds,
        guidance_message=r.guidance_message,
        is_flagged=r.is_flagged,
        created_at=r.created_at,
    )


# ------------------------------------------------------------
# endpoint
# ------------------------------------------------------------

@router.post("", response_model=GrowthEntryReply, status_code=status.HTTP_201_CREATED)
async def record_growth(
    child_id: uuid.UUID, data: GrowthEntryCreate, user: CurrentUser, db: Db
):
    child = await get_owned_child(db, user, child_id)

    try:
        result = await calculate_growth_result(
            db,
            sex=child.sex,
            date_of_birth=child.date_of_birth,
            measurement_date=data.measurement_date,
            height_cm=data.height_cm,
            weight_kg=data.weight_kg,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    record = GrowthRecord(
        child_id=child.id,
        measurement_date=data.measurement_date,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        **result,
    )
    db.add(record)

    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        # แยกตาม SQLSTATE — IntegrityError ไม่ได้แปลว่าซ้ำเสมอไป CHECK constraint
        # ก็โยน IntegrityError เหมือนกัน ถ้าตอบ 409 "ซ้ำ" ทุกกรณี ผู้ใช้จะได้ข้อความผิด
        #   23505 unique_violation  → UNIQUE (chd_id, measurement_date) ซ้ำวันเดียวกัน
        #   23514 check_violation   → ค่าไม่ผ่าน CHECK ของตาราง
        if getattr(exc.orig, "pgcode", None) == "23505":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "มีบันทึกผลวัดของวันที่นี้อยู่แล้ว"
            ) from None
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "ค่าที่กรอกไม่ผ่านเงื่อนไขของฐานข้อมูล"
        ) from None
    except DataError:
        # numeric field overflow — ค่าที่คำนวณได้ (เช่น SDS) ใหญ่เกินคอลัมน์ NUMERIC
        # เกิดได้กับข้อมูลอ้างอิงบางช่วงอายุ + ค่าวัดสุดขั้ว ต้องเป็น 422 ไม่ใช่ 500
        await db.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "ค่าที่กรอกอยู่นอกช่วงที่ระบบคำนวณได้ กรุณาตรวจหน่วยและตัวเลขอีกครั้ง",
        ) from None

    await db.commit()
    await db.refresh(record)
    return _to_reply(record)


@router.get("", response_model=list[GrowthEntryReply])
async def list_growth(child_id: uuid.UUID, user: CurrentUser, db: Db):
    await get_owned_child(db, user, child_id)
    rows = (
        await db.execute(
            select(GrowthRecord)
            .where(GrowthRecord.child_id == child_id)
            .order_by(GrowthRecord.measurement_date.desc())
        )
    ).scalars().all()
    return [_to_reply(r) for r in rows]
