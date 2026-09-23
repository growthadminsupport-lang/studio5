"""
Endpoint การยืนยันตัวตน

    POST /api/auth/register              สมัครสมาชิกด้วยอีเมล + รหัสผ่าน แล้วเข้าสู่ระบบให้เลย
    POST /api/auth/google                สมัคร/เข้าสู่ระบบด้วย Google (endpoint เดียวทำทั้งสองอย่าง)
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
ผู้ใช้เข้าระบบได้สองทาง: อีเมล+รหัสผ่าน หรือ Google และทั้งสองทางชี้ไปที่
usr_accounts แถวเดียวกันเมื่ออีเมลตรงกัน — ไม่แยกเป็นสองบัญชี

ผลคือบัญชีหนึ่งมีได้ 3 สถานะ
  รหัสผ่านอย่างเดียว   password_hash มีค่า · ไม่มีแถวใน usr_identities
  Google อย่างเดียว    password_hash เป็น NULL · มีแถวใน usr_identities
  ทั้งสองอย่าง         มีทั้งคู่ (เกิดจากการผูกบัญชีเข้าด้วยกัน)

**password_hash เป็น NULL ได้** ทุกจุดที่แตะรหัสผ่านจึงต้องคิดเผื่อกรณีนี้เสมอ
— ดู verify_password() ใน auth.py ที่รับ None แล้วตอบ False พร้อมเผาเวลาให้เท่ากัน

ไม่มีการยืนยันอีเมล
───────────────────
สมัครเสร็จเข้าใช้งานได้ทันที ไม่ต้องรอกดลิงก์ในอีเมล — TOR ไม่ได้กำหนดไว้
และการบังคับยืนยันทำให้ระบบใช้ไม่ได้เลยถ้าอีเมลส่งไม่ออก

ผลที่ตามมาสองข้อที่ต้องรับไว้:
  - /register บอกตรง ๆ ว่าอีเมลซ้ำหรือไม่ (409) เพราะผู้ใช้ต้องรู้ว่าเข้าระบบ
    ต่อได้ไหม จึงยอมเปิดเผยว่าอีเมลไหนมีบัญชีอยู่ ซึ่งแอปส่วนใหญ่ก็ทำแบบนี้
  - พิมพ์อีเมลผิดตอนสมัครแล้วจะกู้บัญชีไม่ได้ จึงต้องมี /email/change ไว้แก้

(ผูกบัญชีอัตโนมัติได้เฉพาะ Gmail หรือ Google Workspace ที่มี hd และยืนยันอีเมลแล้ว
อีเมลภายนอกต้องยืนยันเพิ่มเติม ดู google_oauth.py)

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
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator
from sqlalchemy import select
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
from models import Identity, Session as SessionModel, User
from security import PasswordPolicyError, hash_token, validate_password

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

    frontend ใช้ตัดสินว่าจะพาไปหน้าไหนต่อ — คนที่เพิ่งสมัคร (is_new_account)
    ควรไปหน้าเพิ่มโปรไฟล์เด็ก ส่วนคนที่เพิ่งถูกผูกบัญชี (linked) ควรเห็นข้อความ
    ว่า Google ถูกผูกกับบัญชีเดิมของเขาแล้ว ไม่ใช่ถูกสร้างบัญชีใหม่
    """

    is_new_account: bool
    linked: bool = False
    # true = ผูกกับบัญชีเดิมที่มีรหัสผ่านอยู่ และรหัสนั้นถูกล้างทิ้งเพื่อความปลอดภัย
    # (ดูเหตุผลใน google_sign_in เส้นทางที่ 2) frontend ควรพาไปหน้าตั้งรหัสผ่านใหม่
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

@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, request: Request, db: Db):
    """
    สร้างบัญชีแล้วเข้าสู่ระบบให้เลย ไม่ต้องพิมพ์รหัสผ่านซ้ำอีกรอบ

    ตอบ 409 ถ้าอีเมลซ้ำ — ยอมเปิดเผยว่าอีเมลไหนมีบัญชีอยู่ เพราะเมื่อไม่มีขั้นตอน
    ยืนยันอีเมลแล้ว ผู้ใช้ต้องรู้ทันทีว่าสมัครผ่านหรือไม่ ถึงจะรู้ว่าควรกดเข้าสู่ระบบ
    หรือกดลืมรหัสผ่านต่อ

    409 นี้ครอบบัญชีที่สมัครไว้ด้วย Google ด้วย ข้อความจึงบอกทางออกทั้งสองแบบ
    ไม่งั้นคนที่เคยกดปุ่ม Google ไว้จะงงว่าทำไมอีเมลตัวเองซ้ำทั้งที่ไม่เคยสมัคร
    """
    if not data.terms_accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, TERMS_REQUIRED)

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
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError:
        # ปล่อยให้ UNIQUE constraint เป็นคนตัดสินแทนการ SELECT เช็คก่อน
        # เพราะถ้าเช็คก่อนแล้วค่อย INSERT สองคำขอที่เข้ามาพร้อมกันจะผ่านด่านเช็ค
        # ไปได้ทั้งคู่ แล้วตัวที่สองจะระเบิดเป็น 500 ตอน INSERT อยู่ดี
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{EMAIL_TAKEN} ให้เข้าสู่ระบบด้วยรหัสผ่าน หรือถ้าเคยสมัครด้วย Google "
            "ให้กดปุ่มเข้าสู่ระบบด้วย Google แทน",
        ) from None

    refresh_raw, _ = await issue_refresh_token(db, user, request)
    await db.commit()

    return TokenPair(
        access_token=create_access_token(user),
        refresh_token=refresh_raw,
    )


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

    สามเส้นทางที่เป็นไปได้ (ตอบ 200 ทั้งหมด ต่างกันที่ธงใน response)
      1. เคยผูกไว้แล้ว          → เข้าสู่ระบบ
      2. ยังไม่ผูก แต่อีเมลตรงกับบัญชีที่มีอยู่ → ผูกเข้ากับบัญชีนั้น (linked=true)
                                 และ **ล้างรหัสผ่านเดิมทิ้ง** (password_cleared=true)
      3. ไม่เคยมีมาก่อน         → สร้างบัญชีใหม่ (is_new_account=true)

    เส้นทางที่ 2 คือจุดที่ต้องระวังที่สุด มีสองด้านที่ต้องกันพร้อมกัน:
      - ต้องมี email_verified และ Google เป็นผู้ดูแลอีเมล (Gmail หรือมี hd)
        อีเมลภายนอกอาจเปลี่ยนเจ้าของหลัง Google ยืนยันครั้งแรก จึงห้ามผูกอัตโนมัติ
      - ฝั่งบัญชีเดิมในระบบเราถูกคนร้ายสร้างดักไว้ก่อน (pre-hijacking) → กันด้วยการ
        ล้าง credential เดิมทิ้งทั้งหมดตอนผูก ดูคอมเมนต์ในโค้ดเส้นทางที่ 2
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

    # ---- เส้นทางที่ 2: อีเมลตรงกับบัญชีที่มีอยู่ → ผูกเข้าด้วยกัน ----
    existing = (
        await db.execute(select(User).where(User.email == profile.email))
    ).scalar_one_or_none()

    if existing is not None:
        if not profile.email_authoritative:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "ไม่สามารถผูกบัญชีจากอีเมลนี้อัตโนมัติได้ กรุณาเข้าสู่ระบบด้วยรหัสผ่าน "
                "หรือใช้ลืมรหัสผ่านเพื่อยืนยันผ่านอีเมล",
            )
        # บัญชีนี้ผูก Google ไว้แล้วกับ subject อื่น — เกิดได้ถ้าเจ้าของเปลี่ยนอีเมลของ
        # บัญชีในระบบเราไปเป็นอีเมลของบัญชี Google อีกใบ ต้องตอบให้ชัดว่าติดอะไร
        # ไม่ใช่ปล่อยให้ชน UNIQUE (usr_id, provider) แล้วได้ 409 "ลองใหม่" ตลอดกาล
        already = (
            await db.execute(
                select(Identity).where(
                    Identity.user_id == existing.id, Identity.provider == PROVIDER_GOOGLE
                )
            )
        ).scalar_one_or_none()
        if already is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "อีเมลนี้ผูกกับบัญชี Google อีกใบไว้แล้ว กรุณาเข้าสู่ระบบด้วยบัญชี Google ใบเดิม "
                "หรือเข้าด้วยรหัสผ่านแล้วเปลี่ยนอีเมลก่อน",
            )

        # ---- จุดสำคัญด้านความปลอดภัย: credential เดิมของบัญชีนี้ **เชื่อไม่ได้** ----
        # ระบบไม่ยืนยันอีเมลตอน /register ใครก็สมัคร victim@gmail.com ด้วยรหัสของตัวเองได้
        # ก่อน แล้วรอให้เจ้าของอีเมลตัวจริงมากดปุ่ม Google — ถ้าเราแค่ผูกเฉย ๆ เจ้าของจะ
        # ถูกพาเข้าบัญชีที่คนร้ายสร้าง และคนร้ายยังเข้าด้วยรหัสผ่านของเขาได้ตลอดไป
        # (account pre-hijacking)
        #
        # Google ยืนยันแล้วว่าคนที่กดตอนนี้เป็นเจ้าของกล่องจดหมายจริง ส่วนรหัสผ่านที่ตั้งไว้
        # ก่อนหน้านั้นพิสูจน์อะไรไม่ได้เลย จึงต้องล้างทิ้งทั้งหมด: รหัสผ่าน, ทุกเซสชัน,
        # ลิงก์รีเซ็ตที่ค้าง แล้วบอกให้เจ้าของตั้งรหัสใหม่เองผ่าน /password/change
        # ถ้าเจ้าของตัวจริงเป็นคนตั้งรหัสนั้นเอง เขาก็แค่ตั้งใหม่ — เสียเวลานิดเดียว
        # แต่ถ้าเป็นคนร้ายตั้ง นี่คือจุดเดียวที่ตัดเขาออกจากบัญชีได้
        credentials_cleared = existing.password_hash is not None
        if credentials_cleared:
            existing.password_hash = None
            existing.password_changed_at = _now()   # ตัด access token เก่าทุกใบทันที
            await revoke_all_sessions(db, existing.id)
            await void_pending_password_resets(db, existing.id)

        await _link_google(db, existing, profile)
        result = await _finish_google_login(
            db, existing, request,
            is_new_account=False, linked=True, password_cleared=credentials_cleared,
        )
        # แจ้งเจ้าของบัญชีว่ามีอีกทางหนึ่งที่เข้าบัญชีเขาได้เพิ่มขึ้นมา
        # และถ้ารหัสผ่านถูกล้าง ต้องบอกด้วยว่าทำไม ไม่งั้นเข้าครั้งหน้าด้วยรหัสไม่ได้แล้วงง
        await mailer.send_google_linked_notice(
            existing.email, existing.full_name, password_cleared=credentials_cleared
        )
        return result

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
    ส่วนท้ายที่เหมือนกันทั้งสามเส้นทางของ /google — ออก token แล้ว commit

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
    )


# ------------------------------------------------------------
# อีเมล
# ------------------------------------------------------------

@router.post("/email/change", response_model=MessageReply)
async def change_email(data: ChangeEmailRequest, user: CurrentUser, db: Db):
    """
    เปลี่ยนอีเมลของบัญชีตัวเอง

    จำเป็นต้องมีเพราะระบบไม่บังคับยืนยันอีเมล ถ้าพิมพ์อีเมลผิดตอนสมัครแล้วไม่มี
    ทางแก้ ผู้ใช้จะกู้บัญชีไม่ได้ตลอดไป — ลิงก์ลืมรหัสผ่านจะวิ่งไปเข้ากล่องจดหมาย
    ที่ไม่มีอยู่จริง
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
