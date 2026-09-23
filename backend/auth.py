"""
ตรรกะการยืนยันตัวตน — ส่วนที่ต้องคุยกับฐานข้อมูลและ FastAPI
(ส่วนที่เป็นการเข้ารหัสล้วนอยู่ใน security.py)

สรุปการออกแบบ
─────────────
access token   JWT อายุ 15 นาที ไม่เก็บลงฐานข้อมูล ตรวจจากลายเซ็นอย่างเดียว
refresh token  ค่าสุ่ม อายุ 30 วัน เก็บเฉพาะ hash ลง usr_sessions
               หมุนใบใหม่ทุกครั้งที่ใช้ และตรวจจับการนำใบเก่ากลับมาใช้

ทำไม access token ถึงอายุสั้น: JWT เพิกถอนกลางคันไม่ได้ ใครขโมยไปก็ใช้ได้
จนหมดอายุ การตั้งให้สั้นคือการจำกัดความเสียหาย ส่วนความสะดวกของผู้ใช้
ได้จาก refresh token ที่ต่ออายุให้อัตโนมัติโดยไม่ต้องพิมพ์รหัสใหม่

ข้อยกเว้นเดียวที่เพิกถอน access token ได้ทันทีคือตอนเปลี่ยนรหัสผ่าน —
เราฝัง password_changed_at ไว้ใน token แล้วเทียบกับค่าในฐานข้อมูลทุกครั้ง
ที่ตรวจสิทธิ์ ถ้าไม่ตรงแปลว่ารหัสถูกเปลี่ยนหลัง token นี้ออก จึงใช้ไม่ได้แล้ว
"""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Identity, LoginAttempt, PasswordReset, Session as SessionModel, User
from security import generate_token, hash_token, normalize_password

load_dotenv()

try:
    JWT_SECRET = os.environ["JWT_SECRET"]
except KeyError:
    raise RuntimeError(
        "ไม่พบ JWT_SECRET — เพิ่มบรรทัดนี้ในไฟล์ .env (สุ่ม string ยาว ๆ เก็บเป็นความลับ)\n"
        "  JWT_SECRET=..."
    ) from None

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "growth-api"

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30

# ล็อกบัญชีชั่วคราวเมื่อกรอกรหัสผิดติดกันหลายครั้ง
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# จำกัดจำนวนครั้งที่ IP เดียวยิงเข้ามาได้ กันการกวาดหาบัญชีทีละหลายอีเมล
IP_ATTEMPT_LIMIT = 20
IP_ATTEMPT_WINDOW_MINUTES = 15

PASSWORD_RESET_TOKEN_HOURS = 1

# จำนวนลิงก์ตั้งรหัสผ่านใหม่ที่บัญชีเดียวขอได้ต่อชั่วโมง
# กันการยิง /password/forgot ใส่อีเมลคนอื่นรัว ๆ จนกล่องจดหมายเขาถล่ม
PASSWORD_RESET_MAX_PER_HOUR = 3

# bcrypt cost — ยิ่งสูงยิ่งช้าและปลอดภัยขึ้น 12 คือค่าที่ใช้กันทั่วไปในปี 2020s
BCRYPT_ROUNDS = 12

# ใช้เทียบตอนไม่เจอผู้ใช้ เพื่อให้เวลาตอบสนองเท่ากับตอนเจอ
# ถ้าไม่ทำ คนยิงจะจับเวลาแล้วรู้ได้ว่าอีเมลไหนมีอยู่จริง (user enumeration)
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt(rounds=BCRYPT_ROUNDS))

bearer_scheme = HTTPBearer(auto_error=False)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------
# รหัสผ่าน
# ------------------------------------------------------------

# ทั้งสามฟังก์ชันเป็น async และโยน bcrypt ไปรันใน thread ผ่าน asyncio.to_thread()
#
# bcrypt cost 12 ใช้เวลาราว 0.2 วินาทีต่อครั้ง ถ้าเรียกตรง ๆ ใน endpoint แบบ async
# event loop ของ uvicorn จะหยุดรอทั้งเส้น = ผู้ใช้ **ทุกคน** ค้างไปด้วย 0.2 วินาที
# ต่อหนึ่งการเข้าสู่ระบบ ยิง /register ถี่ ๆ ก็ทำให้ทั้งเซิร์ฟเวอร์ตอบไม่ได้แล้ว
# (bcrypt ปล่อย GIL ระหว่างคำนวณ จึงขนานกันใน thread ได้จริง)
#
# เคยเป็น sync มาก่อน — ทุกที่ที่เรียกต้อง await ไม่งั้นได้ coroutine กลับไปแทนค่า
# แล้ว `if not verify_password(...)` จะเป็น False เสมอ = เข้าสู่ระบบผ่านด้วยรหัสอะไรก็ได้

def _hash_sync(password: str) -> str:
    pw = normalize_password(password).encode("utf-8")
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("ascii")


def _check_sync(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(
            normalize_password(plain).encode("utf-8"), hashed.encode("utf-8")
        )
    except ValueError:
        # รหัสยาวเกิน 72 ไบต์ หรือ hash ในฐานข้อมูลผิดรูปแบบ — ทั้งคู่ถือว่าไม่ผ่าน
        return False


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(_hash_sync, password)


async def verify_password(plain: str, hashed: str | None) -> bool:
    """
    รับ hashed เป็น None ได้ เพราะบัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน

    กรณีนั้นตอบ False แต่ต้องเผาเวลาให้เท่ากันก่อน ไม่งั้นคนยิงจับเวลาแล้วรู้ได้ว่า
    อีเมลไหนเป็นบัญชี Google — ซึ่งบอกเขาทันทีว่าให้เลิกเดารหัสผ่านแล้วไปโจมตี
    บัญชี Google ของคนนั้นแทน
    """
    if hashed is None:
        await burn_time()
        return False
    return await asyncio.to_thread(_check_sync, plain, hashed)


async def burn_time() -> None:
    """
    เผาเวลาให้เท่ากับการตรวจรหัสผ่านจริง ใช้ตอนไม่เจอผู้ใช้

    ถ้าข้ามขั้นตอน bcrypt ไปเลยเมื่อไม่เจออีเมล คำขอจะตอบกลับเร็วผิดปกติ
    คนยิงจับเวลาเทียบก็แยกออกทันทีว่าอีเมลไหนมีบัญชีอยู่จริง
    """
    await asyncio.to_thread(bcrypt.checkpw, b"dummy-password-for-timing", _DUMMY_HASH)


# ------------------------------------------------------------
# access token (JWT)
# ------------------------------------------------------------

def create_access_token(user: User) -> str:
    now = _now()
    payload = {
        "iss": JWT_ISSUER,
        "sub": str(user.id),
        "jti": str(uuid.uuid4()),          # ระบุ token ใบนี้ ใช้ตอนต้องสอบย้อน
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
        "typ": "access",                   # กัน refresh token ถูกเอามาใช้แทน
        "pwd": int(user.password_changed_at.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """คืน payload ถ้าใช้ได้ ไม่งั้นโยน HTTPException 401"""
    try:
        payload = jwt.decode(
            token, JWT_SECRET, algorithms=[JWT_ALGORITHM], issuer=JWT_ISSUER,
            options={"require": ["exp", "iat", "sub", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access token หมดอายุ")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access token ไม่ถูกต้อง")

    if payload.get("typ") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ต้องใช้ access token เท่านั้น")
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """ใช้กับทุก endpoint ที่ต้องเข้าสู่ระบบก่อน"""
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "ต้องแนบ access token มาด้วย",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access token ไม่ถูกต้อง")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ไม่พบบัญชีผู้ใช้")

    if user.email_verification_required and user.email_verified_at is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "กรุณายืนยันอีเมลก่อนใช้งาน")

    # token ที่ออกก่อนการเปลี่ยนรหัสผ่านครั้งล่าสุดถือว่าใช้ไม่ได้แล้ว
    if payload.get("pwd") != int(user.password_changed_at.timestamp()):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "รหัสผ่านถูกเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่",
        )

    return user


# ------------------------------------------------------------
# refresh token — ออก / หมุน / ตรวจจับการใช้ซ้ำ
# ------------------------------------------------------------

def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def client_agent(request: Request) -> str | None:
    ua = request.headers.get("user-agent")
    return ua[:500] if ua else None


async def issue_refresh_token(
    db: AsyncSession,
    user: User,
    request: Request,
    family_id: uuid.UUID | None = None,
) -> tuple[str, SessionModel]:
    """
    ออก refresh token ใบใหม่ ถ้าไม่ส่ง family_id มาถือว่าเป็นการเข้าสู่ระบบครั้งใหม่
    (เริ่ม family ใหม่) ถ้าส่งมาคือการหมุนต่อจากใบเดิมใน family เดียวกัน
    """
    raw = generate_token()
    session = SessionModel(
        user_id=user.id,
        family_id=family_id or uuid.uuid4(),
        token_hash=hash_token(raw),
        ip_address=client_ip(request),
        user_agent=client_agent(request),
        expires_at=_now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.flush()
    return raw, session


async def revoke_family(db: AsyncSession, family_id: uuid.UUID) -> int:
    """ยกเลิก refresh token ทั้งสายที่สืบทอดมาจากการเข้าสู่ระบบครั้งเดียวกัน"""
    result = await db.execute(
        update(SessionModel)
        .where(SessionModel.family_id == family_id, SessionModel.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    return result.rowcount or 0


async def revoke_all_sessions(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        update(SessionModel)
        .where(SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    return result.rowcount or 0


async def consume_refresh_token(
    db: AsyncSession, raw_token: str
) -> tuple[User, SessionModel]:
    """
    ตรวจ refresh token แล้วคืน (ผู้ใช้, เซสชัน) ถ้าใช้ได้

    ถ้าเจอว่าเป็นใบที่ถูกยกเลิกไปแล้ว = มีคนเอา token เก่ากลับมาใช้
    ซึ่งเกิดได้กรณีเดียวคือ token หลุดไปอยู่กับคนอื่น จะยกเลิกทั้ง family ทันที
    เจ้าของตัวจริงจะถูกให้ออกจากระบบด้วย แต่ดีกว่าปล่อยให้คนขโมยใช้ต่อ
    """
    session = (
        await db.execute(
            select(SessionModel).where(SessionModel.token_hash == hash_token(raw_token))
        )
    ).scalar_one_or_none()

    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token ไม่ถูกต้อง")

    if session.revoked_at is not None:
        revoked = await revoke_family(db, session.family_id)
        await db.commit()
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "ตรวจพบการใช้ refresh token ซ้ำ — ยกเลิกเซสชันทั้งหมดของการเข้าสู่ระบบครั้งนี้"
            f"แล้ว ({revoked} รายการ) กรุณาเข้าสู่ระบบใหม่",
        )

    if session.expires_at < _now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token หมดอายุ")

    user = (
        await db.execute(select(User).where(User.id == session.user_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "ไม่พบบัญชีผู้ใช้")

    if user.email_verification_required and user.email_verified_at is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "กรุณายืนยันอีเมลก่อนใช้งาน")

    return user, session


# ------------------------------------------------------------
# บัญชีจากผู้ให้บริการภายนอก (Google)
# ------------------------------------------------------------

PROVIDER_GOOGLE = "google"


async def find_identity(
    db: AsyncSession, provider: str, subject: str
) -> Identity | None:
    """
    หาการผูกบัญชีจาก (ผู้ให้บริการ, id ฝั่งผู้ให้บริการ)

    ต้องค้นด้วย subject ไม่ใช่อีเมล — subject คือ id ถาวรที่ไม่เปลี่ยนแม้เจ้าตัว
    จะเปลี่ยนอีเมลที่ Google ส่วนอีเมลนั้นเปลี่ยนได้และถูกนำกลับมาใช้ซ้ำได้
    """
    return (
        await db.execute(
            select(Identity).where(
                Identity.provider == provider, Identity.subject == subject
            )
        )
    ).scalar_one_or_none()


async def link_identity(
    db: AsyncSession, user: User, provider: str, subject: str, email: str
) -> Identity:
    """ผูกบัญชีภายนอกเข้ากับผู้ใช้ที่มีอยู่แล้ว"""
    identity = Identity(
        user_id=user.id,
        provider=provider,
        subject=subject,
        email=email,
        last_login_at=_now(),
    )
    db.add(identity)
    await db.flush()
    return identity


async def list_providers(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """รายชื่อผู้ให้บริการที่ผูกกับบัญชีนี้ ใช้แสดงในหน้าตั้งค่าของผู้ใช้"""
    rows = (
        await db.execute(
            select(Identity.provider)
            .where(Identity.user_id == user_id)
            .order_by(Identity.created_at)
        )
    ).scalars().all()
    return list(rows)


# ------------------------------------------------------------
# โทเคนตั้งรหัสผ่านใหม่ (ส่งทางอีเมล)
# ------------------------------------------------------------

async def password_reset_quota_exceeded(db: AsyncSession, user: User) -> bool:
    """
    เช็คว่าขอลิงก์ตั้งรหัสผ่านใหม่ถี่เกินไปหรือยัง

    ไม่มีตรงนี้ ใครก็ยิง /password/forgot ใส่อีเมลคนอื่นรัว ๆ ได้ กลายเป็นการ
    ก่อกวนด้วยอีเมลถล่มกล่องจดหมายเขา (mail bombing) และเปลืองโควตาของผู้ให้บริการ
    อีเมลจนอีเมลของผู้ใช้คนอื่นส่งไม่ออกตามไปด้วย

    เกินโควตาแล้ว **ห้ามตอบ 429** — endpoint นั้นต้องตอบข้อความกลาง ๆ เหมือนกันเสมอ
    ไม่งั้น 429 จะกลายเป็นสัญญาณบอกคนยิงว่าอีเมลนี้มีบัญชีอยู่จริง
    ผู้เรียกต้องแค่ข้ามการส่งไปเงียบ ๆ
    """
    since = _now() - timedelta(hours=1)
    recent = (
        await db.execute(
            select(func.count())
            .select_from(PasswordReset)
            .where(PasswordReset.user_id == user.id, PasswordReset.created_at >= since)
        )
    ).scalar_one()
    return recent >= PASSWORD_RESET_MAX_PER_HOUR


async def void_pending_password_resets(db: AsyncSession, user_id: uuid.UUID) -> int:
    """
    ล้มโทเคนตั้งรหัสผ่านใหม่ที่ยังค้างอยู่ทั้งหมดของผู้ใช้คนนี้

    ต้องเรียกทุกครั้งที่ credential ของบัญชีเปลี่ยน (เปลี่ยนรหัส, เปลี่ยนอีเมล, ผูก Google
    ทับบัญชีเดิม) — ไม่งั้นลิงก์ที่ขอไว้ก่อนหน้ายังใช้ได้อีก 1 ชั่วโมง ใครที่ดักอีเมล
    ฉบับเก่าไว้จะรีเซ็ตรหัสทับของใหม่ได้ทั้งที่เจ้าของเพิ่งเปลี่ยนไป
    """
    result = await db.execute(
        update(PasswordReset)
        .where(PasswordReset.user_id == user_id, PasswordReset.used_at.is_(None))
        .values(used_at=_now())
    )
    return result.rowcount or 0


async def issue_password_reset(db: AsyncSession, user: User) -> str:
    """สร้างโทเคนใช้ครั้งเดียว และล้มโทเคนเก่าที่ยังค้างอยู่ของผู้ใช้คนนี้ทิ้ง"""
    await void_pending_password_resets(db, user.id)

    raw = generate_token()
    db.add(PasswordReset(
        user_id=user.id,
        token_hash=hash_token(raw),
        expires_at=_now() + timedelta(hours=PASSWORD_RESET_TOKEN_HOURS),
    ))
    await db.flush()
    return raw


async def consume_password_reset(db: AsyncSession, raw_token: str) -> User:
    """ตรวจโทเคนจากอีเมลแล้วทำเครื่องหมายว่าใช้แล้ว คืนผู้ใช้เจ้าของโทเคน"""
    token = (
        await db.execute(
            select(PasswordReset).where(PasswordReset.token_hash == hash_token(raw_token))
        )
    ).scalar_one_or_none()

    # ข้อความเดียวกันทุกกรณี ไม่บอกว่าโทเคนผิด หมดอายุ หรือถูกใช้ไปแล้ว
    invalid = HTTPException(
        status.HTTP_400_BAD_REQUEST, "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่"
    )
    if token is None or token.used_at is not None or token.expires_at < _now():
        raise invalid

    token.used_at = _now()
    user = (
        await db.execute(select(User).where(User.id == token.user_id))
    ).scalar_one_or_none()
    if user is None:
        raise invalid
    return user


# ------------------------------------------------------------
# จำกัดอัตราการเข้าสู่ระบบ
# ------------------------------------------------------------

async def record_login_attempt(
    db: AsyncSession, email: str, request: Request, succeeded: bool
) -> None:
    db.add(LoginAttempt(email=email, ip_address=client_ip(request), succeeded=succeeded))


async def enforce_ip_rate_limit(db: AsyncSession, request: Request) -> None:
    """
    กันการกวาดหาบัญชีจาก IP เดียว — นับเฉพาะครั้งที่ล้มเหลว
    เพื่อไม่ให้ผู้ใช้ปกติที่เข้าสู่ระบบหลายอุปกรณ์โดนบล็อกไปด้วย
    """
    ip = client_ip(request)
    if ip is None:
        return

    since = _now() - timedelta(minutes=IP_ATTEMPT_WINDOW_MINUTES)
    failures = (
        await db.execute(
            select(func.count())
            .select_from(LoginAttempt)
            .where(
                LoginAttempt.ip_address == ip,
                LoginAttempt.succeeded.is_(False),
                LoginAttempt.attempted_at >= since,
            )
        )
    ).scalar_one()

    if failures >= IP_ATTEMPT_LIMIT:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"พยายามเข้าสู่ระบบผิดพลาดบ่อยเกินไป กรุณารออีก {IP_ATTEMPT_WINDOW_MINUTES} นาที",
            headers={"Retry-After": str(IP_ATTEMPT_WINDOW_MINUTES * 60)},
        )


def account_locked_error(user: User) -> HTTPException | None:
    if user.locked_until and user.locked_until > _now():
        remaining = int((user.locked_until - _now()).total_seconds() // 60) + 1
        return HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"บัญชีถูกล็อกชั่วคราวเพราะกรอกรหัสผ่านผิดหลายครั้ง กรุณารออีก {remaining} นาที",
            headers={"Retry-After": str(remaining * 60)},
        )
    return None


async def register_failed_attempt(db: AsyncSession, user: User) -> None:
    """
    นับรหัสผิดเพิ่มหนึ่ง แล้วล็อกบัญชีถ้าครบ

    ต้องเพิ่มด้วย UPDATE ... SET count = count + 1 ในฐานข้อมูล ไม่ใช่อ่านค่ามาบวกใน
    Python แล้วเขียนกลับ — แบบหลังคือ read-modify-write ที่ไม่มี lock ถ้ายิงรหัสผิด
    พร้อมกัน 20 คำขอ ทุกคำขออ่านได้ 0 แล้วเขียน 1 ทับกันหมด ตัวนับไม่มีวันถึง 5
    บัญชีจึงไม่เคยถูกล็อก = เดารหัสผ่านได้ไม่จำกัดแค่ยิงขนานกัน (ทดสอบแล้วว่าเกิดจริง)
    RETURNING ทำให้ได้ค่าหลังบวกกลับมาโดยไม่ต้อง SELECT ซ้ำ
    """
    new_count = (
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(failed_login_count=User.failed_login_count + 1)
            .returning(User.failed_login_count)
            .execution_options(synchronize_session=False)
        )
    ).scalar_one()

    if new_count >= MAX_FAILED_ATTEMPTS:
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(locked_until=_now() + timedelta(minutes=LOCKOUT_MINUTES), failed_login_count=0)
            .execution_options(synchronize_session=False)
        )


def clear_failed_attempts(user: User) -> None:
    user.failed_login_count = 0
    user.locked_until = None
