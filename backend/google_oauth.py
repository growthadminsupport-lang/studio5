"""
ตรวจ Google ID token — ใช้กับปุ่ม "เข้าสู่ระบบด้วย Google"

ลำดับที่เกิดขึ้นจริง
────────────────────
1. ฝั่ง frontend เรียก Google Identity Services (ปุ่มของ Google หรือ One Tap)
   ผู้ใช้เลือกบัญชี แล้ว Google ส่ง **ID token** (JWT ที่ Google เซ็น) กลับมาให้ frontend
2. frontend ส่ง ID token ใบนั้นมาที่ POST /api/auth/google
3. ไฟล์นี้ตรวจว่าเป็นของจริงที่ Google เซ็น และออกให้แอปเรานี่แหละ
4. routes_auth.py เอาผลที่ได้ไปสร้างบัญชีหรือเข้าสู่ระบบ แล้วออก token ของระบบเราเอง

จุดที่พลาดกันบ่อยและพลาดแล้วเปิดช่องให้ยึดบัญชีได้ทั้งใบ
──────────────────────────────────────────────────────
**ห้าม decode JWT เฉย ๆ แล้วเชื่อค่าใน payload** — ใครก็ปลอม JWT ที่บอกว่า
`email: someone@gmail.com` ได้ในสิบวินาที ถ้าไม่ตรวจลายเซ็นก็เท่ากับให้ใครก็ได้
เข้าบัญชีคนอื่น ต้องตรวจครบทั้งสี่ข้อนี้ทุกครั้ง:

  1. **ลายเซ็น** ตรงกับกุญแจสาธารณะของ Google (ดึงจาก JWKS ตาม `kid` ใน header)
  2. **aud** ตรงกับ client id ของแอปเรา — ข้อนี้ขาดไม่ได้เด็ดขาด เพราะ ID token
     ที่ Google ออกให้ "แอปอื่น" ก็ลายเซ็นถูกต้องเหมือนกัน ถ้าไม่ตรวจ aud
     คนที่มีแอปของตัวเองบน Google จะเอา token ของผู้ใช้เขามาสวมรอยที่นี่ได้
  3. **iss** เป็นของ Google และ **exp** ยังไม่หมดอายุ
  4. **email_verified** เป็น true — เราผูกบัญชีด้วยอีเมล ถ้า Google เองยังไม่ยืนยัน
     ก็ห้ามเชื่อ ไม่งั้นคนสร้างบัญชี Google Workspace ของโดเมนตัวเองแล้วอ้างอีเมลใครก็ได้

ตัวจับคู่บัญชีคือ `sub` ไม่ใช่อีเมล — `sub` เป็น id ถาวรฝั่ง Google ที่ไม่เปลี่ยน
แม้เจ้าตัวจะเปลี่ยนอีเมล ส่วนอีเมลนั้นเปลี่ยนได้และเคยถูกนำกลับมาใช้ซ้ำ
"""
import logging
import os
import time
from dataclasses import dataclass

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import HTTPException, status

from config import GOOGLE_ISSUERS, GOOGLE_JWKS_URL, parse_google_client_ids

load_dotenv()

logger = logging.getLogger("growth.google")

# ตั้ง GOOGLE_CLIENT_IDS ใน .env — ใส่ได้หลายค่าคั่นด้วยจุลภาค (เว็บ/Android/iOS)
# ถ้าไม่ตั้ง endpoint /api/auth/google จะตอบ 503 ส่วนที่เหลือของระบบใช้ได้ตามปกติ
GOOGLE_CLIENT_IDS = parse_google_client_ids(os.environ.get("GOOGLE_CLIENT_IDS", ""))

GOOGLE_ENABLED = bool(GOOGLE_CLIENT_IDS)

# Google หมุนกุญแจทุกไม่กี่วัน จะดึง JWKS ใหม่ทุกคำขอก็ช้าเกินไป (เพิ่ม network
# round-trip ให้ทุกการเข้าสู่ระบบ) จะแคชถาวรก็พังตอนเขาหมุนกุญแจ
# แคชไว้ 1 ชั่วโมงคือจุดกลาง และถ้าเจอ kid ที่ไม่รู้จักจะบังคับดึงใหม่ทันที
# (ดู _find_key) จึงไม่ต้องรอครบชั่วโมงเวลาเขาหมุนกุญแจกลางคัน
_JWKS_CACHE_SECONDS = 3600
_HTTP_TIMEOUT_SECONDS = 5.0

# เจอ kid ที่ไม่รู้จักแล้วจะบังคับดึง JWKS ใหม่ได้ไม่ถี่กว่านี้ — endpoint นี้ไม่ต้อง
# ล็อกอิน ถ้าไม่มี cooldown ใครก็ยิง token ปลอมที่มี kid มั่ว ๆ ให้เราไปกระหน่ำ Google
# แทนได้ (Google หมุนกุญแจไม่บ่อยกว่านี้อยู่แล้ว)
_JWKS_FORCE_COOLDOWN_SECONDS = 60

_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0

UNCONFIGURED = HTTPException(
    status.HTTP_503_SERVICE_UNAVAILABLE,
    "ระบบยังไม่ได้เปิดใช้การเข้าสู่ระบบด้วย Google",
)

# ข้อความเดียวกันทุกกรณีที่ token ใช้ไม่ได้ ไม่บอกว่าพังตรงไหน
# รายละเอียดจริงไปอยู่ใน log ของเซิร์ฟเวอร์แทน
INVALID_TOKEN = HTTPException(
    status.HTTP_401_UNAUTHORIZED, "ข้อมูลยืนยันตัวตนจาก Google ใช้ไม่ได้ กรุณาลองใหม่"
)


@dataclass(frozen=True)
class GoogleProfile:
    """ข้อมูลผู้ใช้จาก ID token ที่ตรวจแล้วว่าเป็นของจริง"""

    subject: str        # `sub` — id ถาวรฝั่ง Google ใช้เป็นตัวจับคู่บัญชี
    email: str
    full_name: str
    picture: str | None
    email_authoritative: bool = False


async def _fetch_jwks(force: bool = False) -> tuple[dict, bool]:
    """
    ดึงกุญแจสาธารณะของ Google พร้อมแคช

    คืน (กุญแจ, เพิ่งดึงมาจริงหรือไม่) — ตัวหลังให้ _find_key รู้ว่าควรลองดึงซ้ำ
    อีกรอบไหม จะได้ไม่ยิงหา Google สองครั้งติดตอนแคชว่างอยู่แล้ว
    """
    global _jwks_cache, _jwks_fetched_at

    fresh = _jwks_cache is not None and (time.monotonic() - _jwks_fetched_at) < _JWKS_CACHE_SECONDS
    if fresh and not force:
        return _jwks_cache, False

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.get(GOOGLE_JWKS_URL)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("ดึงกุญแจของ Google ไม่สำเร็จ: %s", exc)
        # ถ้ายังมีของเก่าในแคชให้ใช้ต่อไปก่อน ดีกว่าล้มการเข้าสู่ระบบทั้งระบบ
        # เพราะ Google เน็ตสะดุดไปชั่วครู่ — กุญแจเก่ายังตรวจ token ปัจจุบันได้อยู่
        if _jwks_cache is not None:
            return _jwks_cache, False
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "ติดต่อ Google ไม่ได้ชั่วคราว กรุณาลองใหม่อีกครั้ง",
        ) from None

    _jwks_cache = data
    _jwks_fetched_at = time.monotonic()
    return data, True


def _match_kid(jwks: dict, kid: str):
    for key in jwks.get("keys", []):
        if key.get("kid") != kid:
            continue
        try:
            return jwt.PyJWK(key).key
        except jwt.PyJWTError as exc:
            # กุญแจชนิดที่ PyJWT แปลงไม่ได้ ถือว่าหาไม่เจอ ผู้เรียกจะตอบ 401
            # ดีกว่าปล่อยให้ระเบิดเป็น 500 ซึ่งบอกคนที่ยิงมาว่าทำให้เซิร์ฟเวอร์พังได้
            logger.error("แปลงกุญแจของ Google ไม่ได้ (kid=%s): %s", kid, exc)
            return None
    return None


async def _find_key(kid: str):
    """
    หากุญแจที่ตรงกับ kid ใน header ของ token

    ไม่เจอในแคชแปลว่า Google เพิ่งหมุนกุญแจ ให้ดึงใหม่หนึ่งรอบก่อนยอมแพ้
    ไม่งั้นทุกคนจะเข้าสู่ระบบด้วย Google ไม่ได้จนกว่าแคชจะหมดอายุเอง

    แต่ถ้ารอบแรกเป็นการดึงสด ๆ อยู่แล้ว (แคชว่าง) ก็ไม่ต้องดึงซ้ำ — kid ที่หา
    ไม่เจอในกุญแจชุดล่าสุดคือ token ปลอมหรือ token ที่เก่าเกินไป
    """
    jwks, was_fetched = await _fetch_jwks()
    key = _match_kid(jwks, kid)
    if key is not None or was_fetched:
        return key

    # แคชเพิ่งถูกดึงมาไม่ถึง cooldown แล้วยังไม่มี kid นี้ = token ปลอมหรือเก่ามาก
    # ไม่ต้องรบกวน Google อีก (กันการยิง kid มั่ว ๆ ให้เราไปกระหน่ำ Google แทน)
    if time.monotonic() - _jwks_fetched_at < _JWKS_FORCE_COOLDOWN_SECONDS:
        return None

    jwks, _ = await _fetch_jwks(force=True)
    return _match_kid(jwks, kid)


async def verify_google_id_token(id_token: str, max_age_seconds: int | None = None) -> GoogleProfile:
    """
    ตรวจ ID token จาก Google แล้วคืนข้อมูลผู้ใช้ ถ้าใช้ไม่ได้ให้โยน HTTPException

    ทุกสาเหตุที่ทำให้ไม่ผ่านตอบข้อความเดียวกันหมด เพื่อไม่ให้คนที่กำลังลองปลอม
    token ใช้ข้อความ error เป็นตัวไล่ว่าติดด่านไหน
    """
    if not GOOGLE_ENABLED:
        raise UNCONFIGURED

    try:
        kid = jwt.get_unverified_header(id_token).get("kid")
    except jwt.InvalidTokenError as exc:
        logger.warning("ID token รูปแบบไม่ถูกต้อง: %s", exc)
        raise INVALID_TOKEN from None

    if not kid:
        logger.warning("ID token ไม่มี kid ใน header")
        raise INVALID_TOKEN

    key = await _find_key(kid)
    if key is None:
        logger.warning("ไม่พบกุญแจของ Google ที่ตรงกับ kid=%s", kid)
        raise INVALID_TOKEN

    try:
        # audience= และ issuer= คือจุดที่ PyJWT ตรวจ aud/iss ให้ ถ้าไม่ส่งเข้ามา
        # มันจะ **ข้ามการตรวจไปเงียบ ๆ** ซึ่งคือช่องโหว่ที่อธิบายไว้ในหัวไฟล์
        payload = jwt.decode(
            id_token,
            key=key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_IDS,
            issuer=list(GOOGLE_ISSUERS),
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("ID token ไม่ผ่านการตรวจ: %s", exc)
        raise INVALID_TOKEN from None

    # Linking is a credential change, so a token captured earlier must not be
    # accepted merely because it has not reached Google's normal expiry yet.
    if max_age_seconds is not None:
        issued_at = payload.get("iat")
        if not isinstance(issued_at, (int, float)) or not 0 <= time.time() - issued_at <= max_age_seconds:
            raise INVALID_TOKEN

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.strip() or len(subject) > 255:
        raise INVALID_TOKEN
    raw_email = payload.get("email")
    if raw_email is not None and not isinstance(raw_email, str):
        raise INVALID_TOKEN
    email = (raw_email or "").strip()
    if not email:
        logger.warning("ID token ไม่มีอีเมล — frontend อาจไม่ได้ขอ scope email")
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "บัญชี Google นี้ไม่ได้ให้สิทธิ์เข้าถึงอีเมล จึงสร้างบัญชีให้ไม่ได้",
        )

    # `email_verified` มาเป็น bool จริง ๆ แต่บาง client library ส่งเป็น string "true"
    verified = payload.get("email_verified")
    if verified is not True and str(verified).lower() != "true":
        logger.warning("ปฏิเสธ ID token ที่ email_verified ไม่เป็นจริง (sub=%s)", payload.get("sub"))
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "อีเมลของบัญชี Google นี้ยังไม่ได้รับการยืนยันจาก Google จึงใช้เข้าสู่ระบบไม่ได้",
        )

    # ผู้ใช้บางคนไม่ได้ตั้งชื่อไว้ใน Google ใช้ชื่อหน้า @ ของอีเมลแทน
    # ห้ามปล่อยว่างเพราะ full_name ในฐานข้อมูลเป็น NOT NULL
    name = payload.get("name")
    full_name = (name.strip() if isinstance(name, str) else "") or email.split("@")[0]
    # Google is authoritative for Gmail or verified hosted-domain accounts only.
    # A third-party address may have changed owners since Google verified it.
    hd = payload.get("hd")
    email_authoritative = email.lower().endswith("@gmail.com") or (
        isinstance(hd, str) and bool(hd.strip())
    )

    return GoogleProfile(
        subject=str(payload["sub"]),
        email=email,
        full_name=full_name[:150],
        picture=payload.get("picture"),
        email_authoritative=email_authoritative,
    )
