"""
SQLAlchemy ORM model

ชื่อ attribute ฝั่ง Python ใช้แบบสั้นตามธรรมเนียม (`id`, `user_id`) ส่วนชื่อคอลัมน์จริง
ในฐานข้อมูลเป็นแบบมีคำนำหน้าโดเมน (`usr_id`, `ses_id`, ...) จึงระบุไว้เป็น argument
ตัวแรกของ mapped_column() — ดูคำอธิบายเหตุผลใน growth_schema.sql

ทำแบบนี้เพื่อให้ฐานข้อมูลอ่านแล้วแยกออกทันทีว่า id ไหนของตารางไหน
โดยที่โค้ด Python ยังเขียน user.id ได้ตามปกติ ไม่ต้องพิมพ์ user.usr_id ทุกที่
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, SmallInteger, String, func,
)
from sqlalchemy.dialects.postgresql import CITEXT, ENUM as PgEnum, INET, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# ENUM ที่มีอยู่แล้วในฐานข้อมูล (สร้างโดย growth_schema.sql) — ประกาศตรงนี้ที่เดียวแล้ว
# ให้ทุก model อ้างถึง ค่าต้องตรงกับ CREATE TYPE ใน growth_schema.sql เป๊ะ
#
# create_type=False สำคัญมาก: บอก SQLAlchemy ว่า "อย่าพยายาม CREATE TYPE เอง"
# เพราะ schema สร้างด้วย SQL file ไม่ได้ใช้ metadata.create_all()
#
# ห้ามเปลี่ยนกลับเป็น String(10) เด็ดขาด — เคยเป็นแบบนั้นแล้ว POST /api/children กับ
# POST /api/children/{id}/growth ตอบ 500 ทุกครั้ง เพราะ SQLAlchemy ส่งพารามิเตอร์เป็น
# $1::VARCHAR แล้ว PostgreSQL หา operator `sex_type = character varying` ไม่เจอ
# (เทสต์ใน tests/ ใช้ stub จึงจับไม่ได้ ต้องยิงกับฐานข้อมูลจริงถึงจะเห็น — พบเมื่อ 2026-09-15)
SexType = PgEnum("male", "female", name="sex_type", create_type=False)
MetricType = PgEnum("height", "weight", "bmi", name="metric_type", create_type=False)
IdentityProvider = PgEnum("google", name="usr_identity_provider", create_type=False)


# ------------------------------------------------------------
# usr_ — บัญชีผู้ปกครองและการเข้าสู่ระบบ
# ------------------------------------------------------------

class User(Base):
    __tablename__ = "usr_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(150))
    # ต้องเป็น CITEXT ให้ตรงกับคอลัมน์จริง ถ้าประกาศเป็น String SQLAlchemy จะส่ง
    # พารามิเตอร์เป็น varchar แล้ว PostgreSQL จะเปลี่ยนไปเทียบแบบแยกตัวพิมพ์เล็ก-ใหญ่
    # ผลคือ UNIQUE constraint ยังกันอีเมลซ้ำได้ แต่ login ด้วยตัวพิมพ์ต่างจากตอนสมัคร
    # จะหาผู้ใช้ไม่เจอ (ความยาวคุมด้วย CHECK ในฐานข้อมูล — CITEXT ไม่รับ length)
    email: Mapped[str] = mapped_column(CITEXT, unique=True)
    # NULL ได้ตั้งแต่มี Google Sign-In — บัญชีที่สมัครผ่าน Google ไม่เคยตั้งรหัสผ่าน
    # จึงไม่มีอะไรจะเก็บ ห้ามใส่ค่าหลอกอย่าง "" หรือ "!" แทน เพราะ verify_password()
    # จะต้องมาไล่เดาว่าค่าไหนแปลว่า "ไม่มีรหัสผ่าน" ซึ่งพลาดง่ายและพลาดแล้วอันตราย
    # ผู้ใช้กลุ่มนี้ตั้งรหัสผ่านทีหลังได้ผ่าน /password/forgot หรือ /password/change
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Migration exempts existing accounts; new password registrations set this to True.
    email_verification_required: Mapped[bool] = mapped_column(Boolean, default=False)

    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    failed_login_count: Mapped[int] = mapped_column(SmallInteger, server_default="0")
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Session(Base):
    """refresh token หนึ่งใบ — ดูคำอธิบาย family_id ใน growth_schema.sql"""

    __tablename__ = "usr_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        "ses_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True),
        ForeignKey("usr_accounts.usr_id", ondelete="CASCADE"),
    )
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(
        "replaced_by_ses_id", UUID(as_uuid=True),
        ForeignKey("usr_sessions.ses_id", ondelete="SET NULL"), nullable=True,
    )
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Identity(Base):
    """
    บัญชีจากผู้ให้บริการภายนอกที่ผูกกับ usr_accounts หนึ่งแถว (ตอนนี้มีแค่ Google)

    ทำไมต้องแยกตาราง ไม่เก็บ google_sub เป็นคอลัมน์ใน usr_accounts:
      - ผู้ใช้คนเดียวผูกได้หลายผู้ให้บริการ (วันหน้าเพิ่ม Apple/LINE ได้โดยไม่แก้ตารางหลัก)
      - subject ของแต่ละผู้ให้บริการไม่รับประกันว่าไม่ชนกันข้ามผู้ให้บริการ
        UNIQUE จึงต้องเป็น (provider, subject) คู่กัน ไม่ใช่ subject เดี่ยว
    """

    __tablename__ = "usr_identities"

    id: Mapped[uuid.UUID] = mapped_column(
        "idn_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True),
        ForeignKey("usr_accounts.usr_id", ondelete="CASCADE"),
    )
    # ต้องประกาศเป็น ENUM ให้ตรงชนิดจริงในฐานข้อมูล ห้ามใช้ String แทน — คอลัมน์นี้
    # ถูกใช้ใน WHERE (find_identity) ซึ่งเป็นเคสที่ SQLAlchemy จะส่งพารามิเตอร์เป็น
    # varchar แล้ว PostgreSQL หา operator เทียบกับ ENUM ไม่เจอ (ดูข้อควรระวังท้ายไฟล์)
    # create_type=False เพราะ ENUM ถูกสร้างไว้แล้วใน growth_schema.sql
    # ไม่ได้ให้ SQLAlchemy สร้างให้
    provider: Mapped[str] = mapped_column(IdentityProvider)
    # `sub` ที่ผู้ให้บริการให้มา คือ id ถาวรของผู้ใช้ฝั่งเขา ไม่เปลี่ยนแม้เจ้าตัว
    # จะเปลี่ยนอีเมล — จึงใช้ค่านี้เป็นตัวจับคู่ ห้ามใช้อีเมลเป็นตัวจับคู่หลัก
    subject: Mapped[str] = mapped_column(String(255))
    # อีเมลที่ผู้ให้บริการรายงานมาตอนผูกครั้งแรก เก็บไว้สอบย้อนเฉย ๆ
    # ไม่ใช่ตัวตัดสินสิทธิ์ ค่าที่ใช้จริงคือ usr_accounts.email
    email: Mapped[str | None] = mapped_column(CITEXT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordReset(Base):
    """โทเคนตั้งรหัสผ่านใหม่ที่ส่งทางอีเมล ใช้ได้ครั้งเดียว"""

    __tablename__ = "usr_password_resets"

    id: Mapped[uuid.UUID] = mapped_column(
        "rst_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True),
        ForeignKey("usr_accounts.usr_id", ondelete="CASCADE"),
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EmailVerification(Base):
    __tablename__ = "usr_email_verifications"

    id: Mapped[uuid.UUID] = mapped_column("ver_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True), ForeignKey("usr_accounts.usr_id", ondelete="CASCADE")
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LoginAttempt(Base):
    """บันทึกทุกครั้งที่มีคนพยายามเข้าสู่ระบบ ใช้จำกัดอัตราและสอบย้อนหลัง"""

    __tablename__ = "usr_login_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        "att_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(CITEXT)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    succeeded: Mapped[bool] = mapped_column(Boolean)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ------------------------------------------------------------
# ref_ — ข้อมูลอ้างอิงมาตรฐาน
# ------------------------------------------------------------

class GrowthReferenceLMS(Base):
    __tablename__ = "ref_growth_lms"

    id: Mapped[uuid.UUID] = mapped_column(
        "lms_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # ทั้งสองคอลัมน์ถูกใช้ใน WHERE ของ get_lms_params() — ต้องเป็น ENUM ตรงชนิดจริง
    # (ดูคำอธิบายที่ SexType/MetricType ด้านบน)
    sex: Mapped[str] = mapped_column(SexType)
    age_months: Mapped[int] = mapped_column(Integer)
    metric_type: Mapped[str] = mapped_column(MetricType)
    l_value: Mapped[float] = mapped_column(Float)
    m_value: Mapped[float] = mapped_column(Float)
    s_value: Mapped[float] = mapped_column(Float)


# ------------------------------------------------------------
# chd_ — ข้อมูลเด็กและสุขภาพ
# ------------------------------------------------------------

class Child(Base):
    __tablename__ = "chd_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        "chd_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        "usr_id", UUID(as_uuid=True),
        ForeignKey("usr_accounts.usr_id", ondelete="CASCADE"),
    )
    name: Mapped[str] = mapped_column(String(150))
    # ENUM sex_type — เคยประกาศเป็น String(10) แล้ว INSERT/UPDATE พังเป็น 500 ทุกครั้ง
    sex: Mapped[str] = mapped_column(SexType)
    date_of_birth: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GrowthRecord(Base):
    __tablename__ = "chd_growth_records"

    id: Mapped[uuid.UUID] = mapped_column(
        "grw_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        "chd_id", UUID(as_uuid=True),
        ForeignKey("chd_profiles.chd_id", ondelete="CASCADE"),
    )
    measurement_date: Mapped[date] = mapped_column(Date)
    # asdecimal=False: growth_calc.py คำนวณด้วย float ล้วน ถ้าปล่อยให้ SQLAlchemy
    # แปลง NUMERIC เป็น Decimal ตามค่าเริ่มต้น จะต้องแปลงกลับไปกลับมาทุกจุดที่ใช้
    height_cm: Mapped[float] = mapped_column(Numeric(5, 2, asdecimal=False))
    weight_kg: Mapped[float] = mapped_column(Numeric(5, 2, asdecimal=False))
    bmi: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False), nullable=True)
    height_percentile: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False), nullable=True)
    height_sds: Mapped[float | None] = mapped_column(Numeric(5, 3, asdecimal=False), nullable=True)
    weight_percentile: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False), nullable=True)
    weight_sds: Mapped[float | None] = mapped_column(Numeric(5, 3, asdecimal=False), nullable=True)
    bmi_percentile: Mapped[float | None] = mapped_column(Numeric(5, 2, asdecimal=False), nullable=True)
    bmi_sds: Mapped[float | None] = mapped_column(Numeric(5, 3, asdecimal=False), nullable=True)
    guidance_message: Mapped[str | None] = mapped_column(String, nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ยังไม่มี model ของ chd_puberty_screenings, chd_bone_age_predictions,
# adm_accounts, adm_sessions, adm_audit_logs, cms_articles
# ต้องเพิ่มก่อนถึงจะเขียน endpoint ของส่วนนั้น ๆ ได้
#
# ข้อควรระวังตอนเพิ่ม: ถ้าคอลัมน์ในฐานข้อมูลเป็นชนิดเฉพาะของ PostgreSQL
# (CITEXT, ENUM, INET, JSONB) ต้องประกาศให้ตรงชนิดจริง ห้ามใช้ String แทน
# ไม่งั้น SQLAlchemy จะส่งพารามิเตอร์เป็น varchar แล้ว PostgreSQL หา operator
# ไม่เจอ กลายเป็น error ตอน query — เคยพลาดมาแล้วทั้งกับ CITEXT และ ENUM
# (ENUM พลาดซ้ำรอบสอง: Child.sex กับ GrowthReferenceLMS ประกาศเป็น String ทั้งที่
# คำเตือนนี้เขียนอยู่ตรงนี้แล้ว — ใช้ SexType/MetricType/IdentityProvider ที่หัวไฟล์
# สำหรับ ENUM ใหม่ให้เพิ่มตัวแปรที่นั่น)
#
# adm_role กับ cms_article_status ใน admin_schema.sql ก็เป็น ENUM — ตอนเพิ่ม model
# ของ adm_/cms_ ต้องประกาศ PgEnum(..., create_type=False) เหมือนกัน
