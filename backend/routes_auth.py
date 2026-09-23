"""
Endpoint การยืนยันตัวตน

    POST /api/auth/register              สมัครสมาชิก รอยืนยันอีเมล
    POST /api/auth/email/verify          ยืนยันอีเมลด้วยลิงก์และรหัสผ่าน
    POST /api/auth/email/verification/resend  ส่งลิงก์ยืนยันอีกครั้ง
    POST /api/auth/google                สมัคร/เข้าสู่ระบบด้วย Google (endpoint เดียวทำทั้งสองอย่าง)
    POST /api/auth/google/link           ผูก Google หลังพิสูจน์รหัสผ่านและ Google
    POST /api/auth/login                 เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน
    POST /api/auth/refresh               ขอ access token ใหม่
    POST /api/auth/logout                ออกจากระบบอุปกรณ์นี้
    POST /api/auth/logout-all            ออกจากระบบทุกอุปกรณ์
    GET  /api/auth/sessions              ดูอุปกรณ์ที่ยังเข้าสู่ระบบอยู่
    GET  /api/auth/me                    ข้อมูลบัญชีตัวเอง
    POST /api/auth/email/change          เปลี่ยนอีเมล (ต้องเข้าสู่ระบบอยู่)
    POST /api/auth/password/forgot       ขอลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล
    POST /api/auth/password/reset        ตั้งรหัสผ่านใหม่ด้วยโทเคนจากอีเมล
    POST /api/auth/password/change       เปลี่ยนรหัสผ่าน (ต้องเข้าสู่ระบบอยู่)

สองทางเข้า บัญชีเดียว
─────────────────────
ผู้ใช้เข้าระบบได้สองทาง: อีเมล+รหัสผ่าน หรือ Google ทั้งสองทางจะชี้ไปที่
usr_accounts แถวเดียวกันหลังเจ้าของพิสูจน์ทั้งสองช่องทางและผูกบัญชีแล้ว

ผลคือบัญชีหนึ่งมีได้ 3 สถานะ
  รหัสผ่านอย่างเดียว   password_hash มีค่า · ไม่มีแถวใน usr_identities
  Google อย่างเดียว    password_hash เป็น NULL · มีแถวใน usr_identities
  ทั้งสองอย่าง         มีทั้งคู่ (เกิดจากการผูกบัญชีเข้าด้วยกัน)

**password_hash เป็น NULL ได้** ทุกจุดที่แตะรหัสผ่านจึงต้องคิดเผื่อกรณีนี้เสมอ
— ดู verify_password() ใน auth.py ที่รับ None แล้วตอบ False พร้อมเผาเวลาให้เท่ากัน

บัญชีที่สมัครใหม่ด้วยรหัสผ่านต้องยืนยันอีเมลและรหัสผ่านก่อนใช้งาน
บัญชีเดิมไม่ถูกล็อกระหว่างย้ายระบบ และไม่ถูกระบุว่าอีเมลยืนยันแล้วโดยไม่มีหลักฐาน
อีเมลตรงกันอย่างเดียวไม่เพียงพอที่จะผูก Google

หลักที่ยึดตลอดทั้งไฟล์
──────────────────────
1. /password/forgot ตอบข้อความกลาง ๆ เสมอ ไม่ว่าอีเมลจะมีอยู่จริงหรือไม่
   จุดนี้ห้ามผ่อน เพราะเป็น endpoint ที่คนยิงใช้กวาดหาบัญชีได้ง่ายที่สุด
   ต่อให้ส่งอีเมลไม่ออกหรือเกินโควตา ก็ยังต้องตอบข้อความเดิม

2. โทเคนเดินทางผ่านอีเมลเท่านั้น ไม่เคยอยู่ใน response

3. เปลี่ยนรหัสผ่านเมื่อไหร่ ให้ออกจากระบบทุกอุปกรณ์

4. ส่งอีเมลไม่สำเร็จ ห้ามทำให้คำขอที่สำเร็จไปแล้วกลายเป็น error
   (mailer กลืน error ให้เองแล้ว — ดูเหตุผลในหัวไฟล์ mailer.py)
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import mailer
from auth import (
    account_locked_error,
    clear_failed_attempts,
    consume_password_reset,
    consume_refresh_token,
    enforce_ip_rate_limit,
    find_identity,
    get_current_user,
    hash_password,
    burn_time,
    issue_password_reset,
    issue_refresh_token,
    link_identity,
    list_providers,
    password_reset_quota_exceeded,
    record_login_attempt,
    register_failed_attempt,
    revoke_all_sessions,
    verify_password,
    void_pending_password_resets,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    PROVIDER_GOOGLE,
    create_access_token,
)
from database import get_db
from google_oauth import (
    GOOGLE_ENABLED,
    UNCONFIGURED,
    GoogleProfile,
    verify_google_id_token,
)
from models import EmailVerification, Identity, Session as SessionModel, User
from security import PasswordPolicyError, generate_token, hash_token, validate_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

Db = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ข้อความกลาง ๆ ของ /password/forgot — ตอบแบบนี้เสมอไม่ว่าอีเมลจะมีอยู่จริงหรือไม่
# เพื่อไม่ให้ใครกวาดหาว่าอีเมลไหนมีบัญชีในระบบ
GENERIC_EMAIL_REPLY = (
    "ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งอีเมลไปให้แล้ว กรุณาตรวจกล่องจดหมาย"
)

EMAIL_TAKEN = "อีเมลนี้ถูกใช้ไปแล้ว"

TERMS_REQUIRED = "ต้องยอมรับเงื่อนไขการใช้งานก่อน"


# ------------------------------------------------------------
# รูปแบบข้อมูลเข้า-ออก
# ------------------------------------------------------------

class RegisterRequest(BaseModel):
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    email: EmailStr = Field(max_length=255)
    password: str
    terms_accepted: bool
    phone_number: str | None = Field(default=None, max_length=30)

    @field_validator("password")
    @classmethod
    def _check_policy(cls, v: str) -> str:
        # ตรวจเบื้องต้นตรงนี้ ส่วนที่ต้องใช้ email/full_name ประกอบไปตรวจใน endpoint
        try:
            validate_password(v)
        except PasswordPolicyError as exc:
            raise ValueError(str(exc)) from None
        return v


class GoogleRequest(BaseModel):
    """
    ID token ที่ frontend ได้จาก Google Identity Services

    ตั้งชื่อ id_token ตามที่ Google เรียก ไม่ใช่ access_token — คนละใบและใช้แทนกันไม่ได้
    ใบที่ต้องส่งมาคือใบที่ Google เซ็นและมีข้อมูลผู้ใช้อยู่ข้างใน
    (ฝั่ง JS อยู่ที่ `response.credential` ของ callback)
    """

    id_token: str = Field(min_length=1, max_length=4096)
    # ใช้เฉพาะตอนเป็นการสมัครใหม่ ถ้าเป็นการเข้าสู่ระบบของบัญชีเดิมจะไม่ถูกอ่าน
    # เพราะยอมรับเงื่อนไขไปแล้วตั้งแต่ครั้งแรก
    terms_accepted: bool = False


class GoogleLinkRequest(BaseModel):
    id_token: str = Field(min_length=1, max_length=4096)
    current_password: str


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=512)


class EmailRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    new_password: str


class ChangePasswordRequest(BaseModel):
    # ไม่บังคับ เพราะบัญชีที่สมัครผ่าน Google ยังไม่มีรหัสผ่านให้กรอก
    # endpoint จะบังคับเองถ้าบัญชีนั้นมีรหัสผ่านอยู่แล้ว
    current_password: str | None = None
    new_password: str


class ChangeEmailRequest(BaseModel):
    # ต้องยืนยันรหัสผ่านก่อน เพราะถ้าใครยืมเครื่องที่เปิดค้างไว้แล้วเปลี่ยนอีเมลได้เลย
    # เขาจะยึดบัญชีไปทั้งใบด้วยการกดลืมรหัสผ่านต่อ
    current_password: str
    new_email: EmailStr = Field(max_length=255)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60   # วินาที ตามธรรมเนียม OAuth


class GoogleTokenPair(TokenPair):
    """
    เหมือน TokenPair แต่บอกด้วยว่าเกิดอะไรขึ้นฝั่งบัญชี

    is_new_account ใช้แยกผู้ใช้ที่เพิ่งสมัครจากผู้ใช้เดิม
    linked และ password_cleared คงไว้เพื่อความเข้ากันได้กับ client เก่า
    """

    is_new_account: bool
    linked: bool = False
    password_cleared: bool = False


class MessageReply(BaseModel):
    message: str


class MeReply(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone_number: str | None
    created_at: datetime
    # บอก frontend ว่าจะโชว์ปุ่ม "เปลี่ยนรหัสผ่าน" หรือ "ตั้งรหัสผ่าน"
    # และจะให้เปลี่ยนอีเมลได้ไหม (บัญชีที่ยังไม่มีรหัสผ่านเปลี่ยนไม่ได้)
    has_password: bool
    providers: list[str]
    email_verified: bool
    verification_required: bool


class SessionReply(BaseModel):
    id: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    expires_at: datetime
    current: bool


# ------------------------------------------------------------
# สมัครสมาชิกด้วยอีเมล + รหัสผ่าน
# ------------------------------------------------------------

REGISTRATION_REPLY = "หากสมัครได้ เราได้ส่งลิงก์ยืนยันอีเมลแล้ว กรุณาตรวจกล่องจดหมาย"


async def _issue_email_verification(db: AsyncSession, user: User) -> str:
    raw = generate_token()
    db.add(EmailVerification(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=_now() + timedelta(hours=24),
    ))
    await db.flush()
    return raw


@router.post("/register", response_model=MessageReply, status_code=status.HTTP_202_ACCEPTED)
async def register(data: RegisterRequest, request: Request, db: Db):
    """
    สร้างบัญชีที่ยังไม่อนุญาตให้เข้าสู่ระบบและส่งลิงก์ยืนยันทางอีเมล
    ตอบข้อความกลางเหมือนกันเมื่ออีเมลซ้ำ เพื่อไม่เปิดเผยว่ามีบัญชีอยู่แล้ว
    """
    if not data.terms_accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, TERMS_REQUIRED)

    await enforce_ip_rate_limit(db, request)

    if mailer.APP_ENV == "production" and not mailer.SMTP_ENABLED:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "ยังไม่ได้ตั้งค่าระบบส่งอีเมลยืนยัน")

    # ตรวจซ้ำอีกรอบโดยเอาอีเมลกับชื่อมาประกอบ กันตั้งรหัสเป็นข้อมูลตัวเอง
    try:
        validate_password(data.password, email=str(data.email), full_name=data.full_name)
    except PasswordPolicyError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    user = User(
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        password_hash=await hash_password(data.password),
        terms_accepted=True,
        terms_accepted_at=_now(),
        email_verification_required=True,
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return MessageReply(message=REGISTRATION_REPLY)

    token = await _issue_email_verification(db, user)
    await db.commit()
    await mailer.send_email_verification(user.email, user.full_name, token)
    return MessageReply(message=REGISTRATION_REPLY)


@router.post("/email/verification/resend", response_model=MessageReply)
async def resend_email_verification(data: EmailRequest, request: Request, db: Db):
    await enforce_ip_rate_limit(db, request)
    user = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if user and user.email_verification_required and user.email_verified_at is None:
        sent_last_hour = (await db.execute(
            select(func.count()).select_from(EmailVerification).where(
                EmailVerification.user_id == user.id,
                EmailVerification.created_at > _now() - timedelta(hours=1),
            )
        )).scalar_one()
        if sent_last_hour < 3 and (mailer.SMTP_ENABLED or mailer.APP_ENV != "production"):
            token = await _issue_email_verification(db, user)
            await db.commit()
            await mailer.send_email_verification(user.email, user.full_name, token)
    return MessageReply(message=REGISTRATION_REPLY)


@router.post("/email/verify", response_model=MessageReply)
async def verify_email(data: VerifyEmailRequest, request: Request, db: Db):
    await enforce_ip_rate_limit(db, request)
    record = (await db.execute(
        select(EmailVerification)
        .where(EmailVerification.token_hash == hash_token(data.token))
        .with_for_update()
    )).scalar_one_or_none()
    if record is None or record.used_at is not None or record.expires_at <= _now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุ")
    user = (await db.execute(select(User).where(User.id == record.user_id).with_for_update())).scalar_one()
    if user.email_verified_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ลิงก์ยืนยันอีเมลถูกใช้ไปแล้ว")
    if not await verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "รหัสผ่านไม่ถูกต้อง")
    if user.email_verified_at is None:
        user.email_verified_at = _now()
    record.used_at = _now()
    await db.commit()
    return MessageReply(message="ยืนยันอีเมลแล้ว กรุณาเข้าสู่ระบบ")


# ------------------------------------------------------------
# สมัคร / เข้าสู่ระบบด้วย Google
# ------------------------------------------------------------

@router.post("/google", response_model=GoogleTokenPair)
async def google_sign_in(data: GoogleRequest, request: Request, db: Db):
    """
    endpoint เดียวใช้ได้ทั้งปุ่ม "สมัครด้วย Google" และ "เข้าสู่ระบบด้วย Google"

    เป็น endpoint เดียวโดยตั้งใจ เพราะฝั่ง Google ไม่มีอะไรบอกว่าผู้ใช้ตั้งใจ
    "สมัคร" หรือ "เข้าสู่ระบบ" — เขาแค่เลือกบัญชีเท่านั้น ถ้าแยกเป็นสอง endpoint
    คนที่มีบัญชีอยู่แล้วแต่ไปกดปุ่มสมัครจะโดนปฏิเสธทั้งที่ควรเข้าระบบได้เลย
    ซึ่งเป็นความหงุดหงิดที่ไม่มีเหตุผลรองรับ

    สามเส้นทางที่เป็นไปได้
      1. เคยผูกไว้แล้ว          → เข้าสู่ระบบ
      2. ยังไม่ผูก แต่อีเมลตรงกับบัญชีที่มีอยู่ → 409 LINK_REQUIRED
      3. ไม่เคยมีมาก่อน         → สร้างบัญชีใหม่ (is_new_account=true)
    การผูกต้องใช้ /google/link พร้อมรหัสผ่านเว็บและ Google ID token ที่ออกใหม่
    """
    if not GOOGLE_ENABLED:
        raise UNCONFIGURED

    await enforce_ip_rate_limit(db, request)

    profile = await verify_google_id_token(data.id_token)

    identity = await find_identity(db, PROVIDER_GOOGLE, profile.subject)

    # ---- เส้นทางที่ 1: เคยผูกไว้แล้ว ----
    if identity is not None:
        user = (
            await db.execute(select(User).where(User.id == identity.user_id))
        ).scalar_one_or_none()
        if user is None:
            # ผู้ใช้ถูกลบไปแล้วแต่แถวผูกยังค้าง — ไม่ควรเกิดเพราะ FK เป็น CASCADE
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ไม่พบบัญชีผู้ใช้")

        identity.last_login_at = _now()
        # อีเมลฝั่ง Google เปลี่ยนได้ อัปเดตไว้เพื่อการสอบย้อนเท่านั้น
        # ไม่แตะ user.email เพราะอีเมลใหม่อาจไปชนกับบัญชีอื่นในระบบเรา
        # และ user.email คือค่าที่ใช้เข้าสู่ระบบด้วยรหัสผ่าน ไม่ควรถูกเปลี่ยน
        # จากการกดปุ่มธรรมดา ๆ โดยที่เจ้าตัวไม่รู้
        identity.email = profile.email
        return await _finish_google_login(db, user, request, is_new_account=False)

    # ---- เส้นทางที่ 2: อีเมลตรงกับบัญชีที่มีอยู่ → ขอให้พิสูจน์ทั้งสองทาง ----
    existing = (
        await db.execute(select(User).where(User.email == profile.email))
    ).scalar_one_or_none()

    if existing is not None:
        # An email match alone is insufficient to merge website and Google credentials.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": "LINK_REQUIRED", "message": "Log in with your website password, then link Google in Settings."},
        )
    # ---- เส้นทางที่ 3: สมัครใหม่ ----
    if not data.terms_accepted:
        # ต้องกันไว้ตรงนี้ เพราะการยอมรับเงื่อนไขต้องมีหลักฐานเวลาที่ยอมรับ
        # (ใช้อ้างอิงทาง PDPA) และฐานข้อมูลมี CHECK บังคับไว้อีกชั้น
        # ฝั่ง frontend ให้โชว์ checkbox เงื่อนไขคู่กับปุ่ม Google ในหน้าสมัคร
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{TERMS_REQUIRED} (ส่ง terms_accepted=true มาด้วยตอนสมัครใหม่)",
        )

    user = User(
        full_name=profile.full_name,
        email=profile.email,
        # ไม่มีรหัสผ่าน — ตั้งทีหลังได้เองผ่าน /password/forgot หรือ /password/change
        password_hash=None,
        email_verified_at=_now() if profile.email_authoritative else None,
        terms_accepted=True,
        terms_accepted_at=_now(),
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError:
        # แข่งกันเข้ามาสองคำขอพร้อมกันด้วยบัญชี Google เดียวกัน ตัวที่สองมาถึงตรงนี้
        # แล้วชน UNIQUE ของอีเมล บอกให้ลองใหม่ รอบหน้าจะเข้าเส้นทางที่ 1 หรือ 2 เอง
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "มีการสมัครด้วยอีเมลนี้พร้อมกันพอดี กรุณาลองใหม่อีกครั้ง"
        ) from None

    await _link_google(db, user, profile)
    return await _finish_google_login(db, user, request, is_new_account=True)


@router.post("/google/link", response_model=MessageReply)
async def google_link(data: GoogleLinkRequest, user: CurrentUser, db: Db):
    # The current password is step-up proof. A stolen access token cannot attach Google.
    if user.password_hash is None or not await verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid password")
    profile = await verify_google_id_token(data.id_token, max_age_seconds=300)
    if profile.email.casefold() != user.email.casefold():
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Google email must match this account")

    locked_user = (await db.execute(select(User).where(User.id == user.id).with_for_update())).scalar_one()
    if locked_user.password_hash is None or not await verify_password(data.current_password, locked_user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid password")
    if await find_identity(db, PROVIDER_GOOGLE, profile.subject):
        raise HTTPException(status.HTTP_409_CONFLICT, "Google identity is already linked")
    already = (await db.execute(select(Identity).where(
        Identity.user_id == user.id, Identity.provider == PROVIDER_GOOGLE
    ))).scalar_one_or_none()
    if already is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account already has a Google identity")
    await _link_google(db, locked_user, profile)
    if profile.email_authoritative and locked_user.email_verified_at is None:
        locked_user.email_verified_at = _now()
    await db.commit()
    await mailer.send_google_linked_notice(locked_user.email, locked_user.full_name)
    return MessageReply(message="Google linked. Your website password still works.")


# สองคำขอที่เข้ามาพร้อมกันด้วยบัญชี Google เดียวกันจะผูกซ้ำแล้วชน UNIQUE
# (provider, subject) ตัวที่สองต้องได้ 409 ให้ลองใหม่ ไม่ใช่ 500
RETRY_CONFLICT = HTTPException(
    status.HTTP_409_CONFLICT,
    "มีการเข้าสู่ระบบด้วยบัญชี Google นี้พร้อมกันพอดี กรุณาลองใหม่อีกครั้ง",
)


async def _link_google(db: AsyncSession, user: User, profile: GoogleProfile) -> None:
    try:
        await link_identity(db, user, PROVIDER_GOOGLE, profile.subject, profile.email)
    except IntegrityError:
        await db.rollback()
        raise RETRY_CONFLICT from None


async def _finish_google_login(
    db: AsyncSession,
    user: User,
    request: Request,
    is_new_account: bool,
    linked: bool = False,
    password_cleared: bool = False,
) -> GoogleTokenPair:
    """
    ส่วนท้ายของเส้นทางเข้าสู่ระบบและสมัครใหม่ด้วย Google — ออก token แล้ว commit

    ล้างตัวนับรหัสผิดและปลดล็อกบัญชีให้ด้วย เพราะการล็อกมีไว้กันคนเดารหัสผ่าน
    ส่วนคนที่ผ่าน Google มาได้พิสูจน์ตัวตนแล้วด้วยวิธีที่แข็งแรงกว่ารหัสผ่าน
    ถ้าไม่ปลดให้ คนที่โดนคนอื่นยิงรหัสผิดจนบัญชีล็อกจะเข้าระบบไม่ได้ทั้งที่
    มีทางเข้าที่ถูกต้องอยู่ในมือ
    """
    clear_failed_attempts(user)
    refresh_raw, _ = await issue_refresh_token(db, user, request)
    await record_login_attempt(db, user.email, request, succeeded=True)
    await db.commit()

    return GoogleTokenPair(
        access_token=create_access_token(user),
        refresh_token=refresh_raw,
        is_new_account=is_new_account,
        linked=linked,
        password_cleared=password_cleared,
    )


# ------------------------------------------------------------
# เข้าสู่ระบบ
# ------------------------------------------------------------

@router.post("/login", response_model=TokenPair)
async def login(data: LoginRequest, request: Request, db: Db):
    await enforce_ip_rate_limit(db, request)

    user = (
        await db.execute(select(User).where(User.email == data.email))
    ).scalar_one_or_none()

    # ข้อความเดียวกันทุกกรณีที่เข้าสู่ระบบไม่สำเร็จ — รวมถึงกรณีที่บัญชีนั้นสมัคร
    # ไว้ด้วย Google และยังไม่มีรหัสผ่าน ถ้าแยกข้อความเป็น "บัญชีนี้ใช้ Google"
    # จะกลายเป็นการยืนยันให้คนยิงรู้ว่าอีเมลนี้มีบัญชีอยู่จริง
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "อีเมลหรือรหัสผ่านไม่ถูกต้อง")

    if user is None:
        await burn_time()   # ใช้เวลาเท่ากับตอนเจอผู้ใช้ ไม่ให้จับเวลาแล้วรู้ว่าอีเมลมีจริง
        await record_login_attempt(db, str(data.email), request, succeeded=False)
        await db.commit()
        raise invalid

    # บัญชี Google-only ยังไม่มีรหัสผ่านให้ตรวจ จึงตอบเหมือนรหัสผิดและเผาเวลาเท่ากัน
    # แต่ไม่เพิ่ม failed_login_count หรือเปิดเผยสถานะบัญชีล็อก เพราะไม่มี credential
    # แบบรหัสผ่านให้คนร้ายเดาอยู่จริง ผู้ใช้ต้องผ่าน Google แล้วตั้งรหัสครั้งแรกก่อน
    if user.password_hash is None:
        await burn_time()
        await record_login_attempt(db, str(data.email), request, succeeded=False)
        await db.commit()
        raise invalid

    if locked := account_locked_error(user):
        await record_login_attempt(db, str(data.email), request, succeeded=False)
        await db.commit()
        raise locked

    # verify_password รับ password_hash ที่เป็น None ได้ (บัญชีที่มีแต่ Google)
    # แล้วตอบ False พร้อมเผาเวลาให้เท่ากับการตรวจจริง
    if not await verify_password(data.password, user.password_hash):
        await register_failed_attempt(db, user)
        await record_login_attempt(db, str(data.email), request, succeeded=False)
        await db.commit()
        raise invalid

    if user.email_verification_required and user.email_verified_at is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            {"code": "EMAIL_VERIFICATION_REQUIRED", "message": "Verify your email before signing in."},
        )

    clear_failed_attempts(user)
    refresh_raw, _ = await issue_refresh_token(db, user, request)
    await record_login_attempt(db, str(data.email), request, succeeded=True)
    await db.commit()

    return TokenPair(
        access_token=create_access_token(user),
        refresh_token=refresh_raw,
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, request: Request, db: Db):
    """
    ขอ access token ใหม่ พร้อมหมุน refresh token ใบใหม่ไปด้วยทุกครั้ง

    การหมุนทุกครั้งทำให้ token ที่หลุดออกไปมีอายุใช้งานสั้นมาก และเปิดทางให้
    ตรวจจับได้ว่ามีคนขโมยไป — ดูคำอธิบายใน consume_refresh_token()
    """
    user, session = await consume_refresh_token(db, data.refresh_token)

    new_raw, new_session = await issue_refresh_token(
        db, user, request, family_id=session.family_id
    )
    session.revoked_at = _now()
    session.replaced_by_id = new_session.id
    await db.commit()

    return TokenPair(access_token=create_access_token(user), refresh_token=new_raw)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest, db: Db):
    """
    ออกจากระบบเฉพาะอุปกรณ์นี้

    access token ใบปัจจุบันยังใช้ได้จนหมดอายุเอง (สูงสุด 15 นาที) เพราะ JWT
    เพิกถอนกลางคันไม่ได้ ถ้าต้องตัดทันทีให้ใช้ /logout-all ซึ่งเปลี่ยนรหัสผ่าน
    หรือรอ access token หมดอายุ
    """
    session = (
        await db.execute(
            select(SessionModel).where(
                SessionModel.token_hash == hash_token(data.refresh_token)
            )
        )
    ).scalar_one_or_none()

    # ไม่บอกว่า token ผิดหรือถูก — ออกจากระบบควรสำเร็จเสมอในสายตาผู้ใช้
    if session is not None and session.revoked_at is None:
        session.revoked_at = _now()
        await db.commit()


@router.post("/logout-all", response_model=MessageReply)
async def logout_all(user: CurrentUser, db: Db):
    count = await revoke_all_sessions(db, user.id)
    await db.commit()
    return MessageReply(message=f"ออกจากระบบแล้ว {count} อุปกรณ์")


@router.get("/sessions", response_model=list[SessionReply])
async def list_sessions(user: CurrentUser, db: Db):
    """ดูว่ามีอุปกรณ์ไหนเข้าสู่ระบบค้างอยู่บ้าง — ผู้ใช้ควรเห็นและตัดออกได้เอง"""
    rows = (
        await db.execute(
            select(SessionModel)
            .where(
                SessionModel.user_id == user.id,
                SessionModel.revoked_at.is_(None),
                SessionModel.expires_at > _now(),
            )
            .order_by(SessionModel.created_at.desc())
        )
    ).scalars().all()

    return [
        SessionReply(
            id=str(s.id),
            ip_address=str(s.ip_address) if s.ip_address else None,
            user_agent=s.user_agent,
            created_at=s.created_at,
            expires_at=s.expires_at,
            current=False,
        )
        for s in rows
    ]


@router.get("/me", response_model=MeReply)
async def me(user: CurrentUser, db: Db):
    return MeReply(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        created_at=user.created_at,
        has_password=user.password_hash is not None,
        providers=await list_providers(db, user.id),
        email_verified=user.email_verified_at is not None,
        verification_required=user.email_verification_required,
    )


# ------------------------------------------------------------
# อีเมล
# ------------------------------------------------------------

@router.post("/email/change", response_model=MessageReply)
async def change_email(data: ChangeEmailRequest, user: CurrentUser, db: Db):
    """
    เปลี่ยนอีเมลของบัญชีตัวเอง

    บัญชีเดิมยังต้องมีทางแก้อีเมลที่สะกดผิด บัญชีที่สมัครใหม่และยังไม่ยืนยัน
    จะเข้า endpoint นี้ไม่ได้ เพราะต้องยืนยันอีเมลก่อนเข้าพื้นที่ที่ต้องล็อกอิน
    """
    if user.password_hash is None:
        # บัญชีที่มีแต่ Google ไม่มีรหัสผ่านให้ยืนยัน จะปล่อยให้เปลี่ยนอีเมลโดยไม่ต้อง
        # ยืนยันอะไรเลยก็ไม่ได้ เพราะใครยืมเครื่องที่เปิดค้างไว้จะยึดบัญชีได้ทันที
        # ทางออกคือให้ตั้งรหัสผ่านก่อน แล้วค่อยใช้รหัสนั้นยืนยัน
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "บัญชีนี้ยังไม่มีรหัสผ่าน กรุณาตั้งรหัสผ่านก่อนจึงจะเปลี่ยนอีเมลได้",
        )

    if not await verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "รหัสผ่านไม่ถูกต้อง")

    if user.email == data.new_email:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "อีเมลใหม่ต้องไม่ซ้ำกับอีเมลเดิม"
        )

    old_email = user.email
    user.email = data.new_email
    # Verification belongs to the previous address, not this new one.
    user.email_verified_at = None
    # This legacy flow is not a new registration; keep its access policy unchanged.
    user.email_verification_required = False

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, EMAIL_TAKEN) from None

    # ลิงก์รีเซ็ตที่ขอไว้ก่อนหน้าถูกส่งไปกล่องเดิม ต้องล้มทิ้ง ไม่งั้นคนที่เข้าถึงกล่องเดิม
    # ยังรีเซ็ตรหัสของบัญชีนี้ได้อีก 1 ชั่วโมงทั้งที่บัญชีย้ายไปอีเมลใหม่แล้ว
    await void_pending_password_resets(db, user.id)
    await db.commit()

    # แจ้งกล่องเดิม ไม่ใช่กล่องใหม่ — ถ้าเป็นคนอื่นแอบเปลี่ยน เจ้าของตัวจริงจะได้รู้
    await mailer.send_email_changed_notice(old_email, user.full_name, str(data.new_email))
    return MessageReply(message=f"เปลี่ยนอีเมลเป็น {data.new_email} เรียบร้อยแล้ว")


# ------------------------------------------------------------
# รหัสผ่าน
# ------------------------------------------------------------

@router.post("/password/forgot", response_model=MessageReply)
async def forgot_password(data: EmailRequest, db: Db):
    """
    ขอลิงก์ตั้งรหัสผ่านใหม่ทางอีเมล

    ตอบข้อความเดียวกันเป๊ะทุกกรณี — ไม่เจออีเมล เจอแต่ขอถี่เกินโควตา หรือส่ง
    อีเมลไม่ออก ก็ตอบเหมือนกันหมด ถ้าแยกข้อความเมื่อไหร่ endpoint นี้จะกลายเป็น
    เครื่องมือกวาดหาว่าอีเมลไหนมีบัญชีในระบบทันที ซึ่งสำหรับแอปข้อมูลสุขภาพเด็ก
    แค่รู้ว่า "อีเมลนี้มีลูกที่ติดตามการเจริญเติบโตอยู่" ก็ถือว่ารั่วแล้ว

    บัญชีที่สมัครด้วย Google และยังไม่มีรหัสผ่านก็ใช้ทางนี้ได้ ถือเป็นการ
    "ตั้งรหัสผ่านครั้งแรก" — ข้อความในอีเมลจะต่างกัน แต่ response เหมือนกัน
    """
    user = (
        await db.execute(select(User).where(User.email == data.email))
    ).scalar_one_or_none()

    if user is not None and not await password_reset_quota_exceeded(db, user):
        is_first_password = user.password_hash is None
        token = await issue_password_reset(db, user)
        await db.commit()

        # commit ก่อนส่งอีเมล — ถ้าส่งก่อนแล้ว commit ล้มเหลว ผู้ใช้จะได้ลิงก์ที่
        # ชี้ไปยังโทเคนซึ่งไม่มีอยู่ในฐานข้อมูล กดแล้วขึ้นว่าลิงก์ใช้ไม่ได้
        if is_first_password:
            await mailer.send_password_setup_email(user.email, user.full_name, token)
        else:
            await mailer.send_password_reset_email(user.email, user.full_name, token)

    return MessageReply(message=GENERIC_EMAIL_REPLY)


@router.post("/password/reset", response_model=MessageReply)
async def reset_password(data: ResetPasswordRequest, db: Db):
    """
    ตั้งรหัสผ่านใหม่ด้วยโทเคนจากอีเมล

    ใช้ได้ทั้งการตั้งใหม่แทนของเดิม และการตั้งรหัสผ่านครั้งแรกของบัญชีที่สมัคร
    ผ่าน Google — ตั้งแล้วยังเข้าสู่ระบบด้วย Google ได้เหมือนเดิม ได้ทั้งสองทาง
    """
    user = await consume_password_reset(db, data.token)

    try:
        validate_password(data.new_password, email=user.email, full_name=user.full_name)
    except PasswordPolicyError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    user.password_hash = await hash_password(data.new_password)
    user.password_changed_at = _now()
    if user.email_verified_at is None:
        user.email_verified_at = _now()
    if user.email_verification_required:
        rows = (await db.execute(select(EmailVerification).where(
            EmailVerification.user_id == user.id, EmailVerification.used_at.is_(None)
        ))).scalars().all()
        for row in rows:
            row.used_at = _now()
    clear_failed_attempts(user)

    # คนที่ขอรีเซ็ตมักเพราะสงสัยว่าบัญชีโดนเข้าถึง จึงต้องตัดทุกอุปกรณ์ทิ้ง
    # และล้มลิงก์รีเซ็ตใบอื่นที่อาจค้างอยู่ด้วย (consume_password_reset ทำเครื่องหมาย
    # แค่ใบที่ใช้ ใบพี่น้องที่ออกก่อนหน้ายังไม่ถูกแตะ)
    revoked = await revoke_all_sessions(db, user.id)
    await void_pending_password_resets(db, user.id)
    await db.commit()

    await mailer.send_password_changed_notice(user.email, user.full_name)
    return MessageReply(
        message=f"ตั้งรหัสผ่านใหม่เรียบร้อย และให้ออกจากระบบแล้ว {revoked} อุปกรณ์"
    )


@router.post("/password/change", response_model=MessageReply)
async def change_password(data: ChangePasswordRequest, user: CurrentUser, db: Db):
    """
    เปลี่ยนรหัสผ่านทั้งที่ยังเข้าสู่ระบบอยู่

    บัญชีที่สมัครผ่าน Google ใช้ทางนี้ตั้งรหัสผ่านครั้งแรกได้โดยไม่ต้องส่ง
    current_password มา (เพราะไม่มีให้ส่ง) — ตัวที่ยืนยันตัวตนแทนคือ access token
    ซึ่งจะได้มาก็ต่อเมื่อผ่าน Google มาแล้ว
    """
    has_password = user.password_hash is not None

    if has_password:
        if not data.current_password:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "ต้องกรอกรหัสผ่านปัจจุบันด้วย"
            )
        if not await verify_password(data.current_password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "รหัสผ่านปัจจุบันไม่ถูกต้อง")

    try:
        validate_password(data.new_password, email=user.email, full_name=user.full_name)
    except PasswordPolicyError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from None

    if has_password and await verify_password(data.new_password, user.password_hash):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"
        )

    user.password_hash = await hash_password(data.new_password)
    user.password_changed_at = _now()
    revoked = await revoke_all_sessions(db, user.id)
    # ลิงก์รีเซ็ตที่ค้างอยู่ต้องล้มไปพร้อมกัน ไม่งั้นใครดักอีเมลเก่าไว้จะรีเซ็ตทับรหัสใหม่ได้
    await void_pending_password_resets(db, user.id)
    await db.commit()

    await mailer.send_password_changed_notice(user.email, user.full_name)

    if not has_password:
        # ตั้งรหัสผ่านครั้งแรก ข้อความต้องบอกว่ายังใช้ Google ได้อยู่
        # ไม่งั้นผู้ใช้จะนึกว่าเพิ่งเปลี่ยนวิธีเข้าระบบไปแล้ว
        return MessageReply(
            message=f"ตั้งรหัสผ่านเรียบร้อย ต่อจากนี้เข้าสู่ระบบได้ทั้งด้วยรหัสผ่านและ Google "
                    f"· ให้ออกจากระบบแล้ว {revoked} อุปกรณ์ กรุณาเข้าสู่ระบบใหม่"
        )

    return MessageReply(
        message=f"เปลี่ยนรหัสผ่านเรียบร้อย และให้ออกจากระบบแล้ว {revoked} อุปกรณ์ "
                "กรุณาเข้าสู่ระบบใหม่"
    )
