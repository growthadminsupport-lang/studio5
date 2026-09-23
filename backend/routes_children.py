"""
Endpoint จัดการโปรไฟล์เด็ก — /api/children (FR-4, FR-5)

    POST    /api/children              เพิ่มโปรไฟล์เด็กใหม่
    GET     /api/children              ดูโปรไฟล์เด็กทั้งหมดของบัญชีตัวเอง
    GET     /api/children/{child_id}   ดูโปรไฟล์เด็กคนเดียว
    PATCH   /api/children/{child_id}   แก้ไขโปรไฟล์เด็ก
    DELETE  /api/children/{child_id}   ลบโปรไฟล์เด็ก (ลบข้อมูลการเจริญเติบโตที่ผูกอยู่ไปด้วย — CASCADE)

ทุก endpoint ต้องเข้าสู่ระบบก่อน และเห็น/แก้ได้เฉพาะเด็กที่ผูกกับบัญชีตัวเองเท่านั้น
(TOR FR-24) — ทุก query จึงกรองด้วย usr_id ของคนที่ login อยู่เสมอ ไม่ใช่แค่ chd_id
ห้ามเปลี่ยนไปเชื่อ chd_id เพียงอย่างเดียวเด็ดขาด ไม่งั้น user คนหนึ่งเดา UUID ของเด็ก
คนอื่นแล้วเห็นข้อมูลได้
"""
import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, StringConstraints, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models import Child, GrowthRecord, User

router = APIRouter(prefix="/api/children", tags=["children"])

Db = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

VALID_SEX = ("male", "female")
ChildName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]


# ------------------------------------------------------------
# รูปแบบข้อมูลเข้า-ออก
# ------------------------------------------------------------

class ChildCreate(BaseModel):
    name: ChildName
    sex: str
    date_of_birth: date

    @field_validator("sex")
    @classmethod
    def _check_sex(cls, v: str) -> str:
        if v not in VALID_SEX:
            raise ValueError(f"sex ต้องเป็นค่าใดค่าหนึ่งใน {VALID_SEX}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _check_dob(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("วันเกิดต้องไม่อยู่ในอนาคต")
        return v


class ChildUpdate(BaseModel):
    """ทุกฟิลด์เป็น optional — ส่งมาเฉพาะฟิลด์ที่ต้องการแก้ (partial update)"""
    name: ChildName | None = None
    sex: str | None = None
    date_of_birth: date | None = None

    @field_validator("sex")
    @classmethod
    def _check_sex(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_SEX:
            raise ValueError(f"sex ต้องเป็นค่าใดค่าหนึ่งใน {VALID_SEX}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _check_dob(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("วันเกิดต้องไม่อยู่ในอนาคต")
        return v


class ChildReply(BaseModel):
    id: str
    name: str
    sex: str
    date_of_birth: date
    created_at: datetime


def _to_reply(child: Child) -> ChildReply:
    return ChildReply(
        id=str(child.id),
        name=child.name,
        sex=child.sex,
        date_of_birth=child.date_of_birth,
        created_at=child.created_at,
    )


async def get_owned_child(db: AsyncSession, user: User, child_id: uuid.UUID) -> Child:
    """หา child profile พร้อมตรวจว่าเป็นของ user ที่ login อยู่จริง — endpoint อื่น
    (growth, screening, bone age ในอนาคต) เรียกใช้ตัวนี้ก่อนเสมอเพื่อบังคับ FR-24"""
    child = (
        await db.execute(
            select(Child).where(Child.id == child_id, Child.user_id == user.id)
        )
    ).scalar_one_or_none()
    if child is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ไม่พบโปรไฟล์เด็ก")
    return child


# ------------------------------------------------------------
# endpoint
# ------------------------------------------------------------

@router.post("", response_model=ChildReply, status_code=status.HTTP_201_CREATED)
async def create_child(data: ChildCreate, user: CurrentUser, db: Db):
    child = Child(
        user_id=user.id,
        name=data.name,
        sex=data.sex,
        date_of_birth=data.date_of_birth,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return _to_reply(child)


@router.get("", response_model=list[ChildReply])
async def list_children(user: CurrentUser, db: Db):
    rows = (
        await db.execute(
            select(Child).where(Child.user_id == user.id).order_by(Child.created_at)
        )
    ).scalars().all()
    return [_to_reply(c) for c in rows]


@router.get("/{child_id}", response_model=ChildReply)
async def get_child(child_id: uuid.UUID, user: CurrentUser, db: Db):
    child = await get_owned_child(db, user, child_id)
    return _to_reply(child)


@router.patch("/{child_id}", response_model=ChildReply)
async def update_child(child_id: uuid.UUID, data: ChildUpdate, user: CurrentUser, db: Db):
    """
    แก้ไขโปรไฟล์เด็ก

    ข้อจำกัดที่ต้องรู้: percentile/SDS ในประวัติผลวัดถูกคำนวณตอนบันทึกจากเพศและวันเกิด
    ณ ตอนนั้น (ดูเหตุผลใน routes_growth.py) การแก้เพศหรือวันเกิดจึง **ไม่คำนวณประวัติ
    เก่าใหม่ให้** — ค่าเก่ายังอยู่ตามที่เคยคำนวณ ถ้าต้องการให้ตรง ผู้ใช้ต้องลบแล้วบันทึกใหม่
    """
    child = await get_owned_child(db, user, child_id)
    if data.name is not None:
        child.name = data.name
    if data.sex is not None:
        child.sex = data.sex
    if data.date_of_birth is not None:
        # POST growth ปฏิเสธผลวัดที่ลงวันก่อนวันเกิด PATCH จึงต้องไม่เลื่อนวันเกิดไปทับ
        # ผลวัดที่มีอยู่แล้ว ไม่งั้นจะได้ประวัติที่ "วัดก่อนเกิด" ซึ่ง POST เองก็ไม่ยอมรับ
        earliest = (
            await db.execute(
                select(func.min(GrowthRecord.measurement_date))
                .where(GrowthRecord.child_id == child.id)
            )
        ).scalar_one()
        if earliest is not None and data.date_of_birth > earliest:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"วันเกิดใหม่ต้องไม่อยู่หลังผลวัดที่มีอยู่แล้ว (ผลวัดแรกสุดคือ {earliest.isoformat()})",
            )
        child.date_of_birth = data.date_of_birth
    await db.commit()
    await db.refresh(child)
    return _to_reply(child)


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child(child_id: uuid.UUID, user: CurrentUser, db: Db):
    child = await get_owned_child(db, user, child_id)
    await db.delete(child)
    await db.commit()
