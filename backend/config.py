"""
แปลงค่าตั้งจาก environment variable ให้อยู่ในรูปที่โค้ดใช้ได้จริง

ทุกฟังก์ชันในไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ — รับ string เข้า คืนค่าออก ไม่แตะ
os.environ ไม่เปิด connection ไม่ import อะไรนอก standard library
ทำแบบนี้เพื่อให้ tests/test_deploy_config.py เทสต์ได้โดยไม่ต้องมีฐานข้อมูล
ไม่ต้องติดตั้ง dependency และไม่ต้องตั้ง environment variable ก่อนรัน

ส่วนที่อ่าน os.environ จริงอยู่ใน database.py, main.py, mailer.py กับ google_oauth.py
"""
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ASYNC_DRIVER = "postgresql+asyncpg"

# ใช้ตอน CORS_ORIGINS ไม่ได้ตั้งไว้ — ตั้งใจให้เป็นค่าของเครื่อง dev เท่านั้น
# ถ้าขึ้น production แล้วลืมตั้ง frontend จะถูกบล็อกทันทีและเห็นปัญหาเลย
# ซึ่งปลอดภัยกว่าการ default เป็น "*" ที่เปิดให้เว็บไหนก็ได้ยิงเข้ามา
DEFAULT_CORS_ORIGINS = ["http://localhost:3000"]

# ค่าที่ PostgreSQL รับใน sslmode — asyncpg รับ string ชุดเดียวกันนี้ผ่าน ssl=
_VALID_SSLMODES = frozenset({
    "disable", "allow", "prefer", "require", "verify-ca", "verify-full",
})

# Neon แถม channel_binding มากับ connection string แต่ asyncpg ไม่รู้จัก
# ปล่อยติดไปจะได้ TypeError: connect() got an unexpected keyword argument
_DROPPED_QUERY_KEYS = frozenset({"channel_binding"})

# พารามิเตอร์ใน query string ที่ SQLAlchemy จะส่งต่อเป็น keyword argument ให้
# asyncpg.connect() แล้ว asyncpg รับได้จริง (ดู asyncpg/connection.py::connect และ
# sqlalchemy/dialects/postgresql/asyncpg.py::create_connect_args) นอกรายการนี้
# ต้องปฏิเสธตั้งแต่ตอนอ่านค่า — ไม่งั้นเซิร์ฟเวอร์สตาร์ทผ่าน แล้วไประเบิดเป็น TypeError
# ตอนเปิด connection แรก ซึ่งคือตอน Render ยิง /health แล้วเห็นแค่ 500 กับ traceback
# ของ driver ไม่มีอะไรชี้กลับมาที่ DATABASE_URL เลย
_ASYNCPG_QUERY_KEYS = frozenset({
    "timeout", "command_timeout", "statement_cache_size",
    "max_cached_statement_lifetime", "max_cacheable_statement_size",
    "direct_tls", "target_session_attrs", "krbsrvname", "gsslib", "passfile",
    # ของ SQLAlchemy dialect เอง
    "prepared_statement_cache_size", "prepared_statement_name_func",
})

# พารามิเตอร์ของ libpq ที่ asyncpg ไม่รับเป็น keyword แต่มีทางไปที่ถูกต้องคือ
# server_settings (ส่งเป็น SET ให้ PostgreSQL ตอนต่อ) — ย้ายให้แทนที่จะปฏิเสธ
_SERVER_SETTING_KEYS = frozenset({"application_name"})


def normalize_database_url(raw: str) -> tuple[str, dict]:
    """
    แปลง connection string ที่ผู้ให้บริการฐานข้อมูลให้มา ให้ SQLAlchemy + asyncpg ใช้ได้

    Neon / Supabase / Render จะให้ URL หน้าตาแบบนี้:

        postgresql://user:pw@host/db?sslmode=require&channel_binding=require

    ซึ่งใช้ตรง ๆ ไม่ได้ 2 จุด
      1. scheme เป็น postgresql:// เฉย ๆ SQLAlchemy จะเลือก driver psycopg2 (แบบ sync)
         ต้องเปลี่ยนเป็น postgresql+asyncpg:// ให้ชัด
      2. sslmode กับ channel_binding เป็นพารามิเตอร์ของ libpq ไม่ใช่ของ asyncpg
         ถ้าปล่อยติดใน URL asyncpg จะรับเป็น keyword argument แล้ว error

    คืน (url, connect_args) — เอา connect_args ส่งต่อให้ create_async_engine()
    """
    if raw is None or not raw.strip():
        raise ValueError("DATABASE_URL ว่าง — ต้องใส่ connection string ของ PostgreSQL")

    parts = urlsplit(raw.strip())
    scheme = parts.scheme.lower()

    if scheme in ("postgres", "postgresql", ASYNC_DRIVER):
        # postgres:// เป็นรูปแบบเก่าที่ Heroku/Render ยังใช้อยู่ SQLAlchemy ไม่รับ
        scheme = ASYNC_DRIVER
    elif scheme.startswith("postgresql+"):
        raise ValueError(
            f"DATABASE_URL ระบุ driver เป็น {parts.scheme} แต่โปรเจกต์นี้ใช้ async ทั้งหมด "
            f"ต้องเป็น {ASYNC_DRIVER} เท่านั้น"
        )
    else:
        raise ValueError(
            f"DATABASE_URL ต้องขึ้นต้นด้วย postgresql:// แต่ได้ {parts.scheme or '(ไม่มี scheme)'}"
        )

    if not parts.netloc:
        raise ValueError("DATABASE_URL ไม่มีชื่อ host")

    connect_args: dict = {}
    kept: list[tuple[str, str]] = []

    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        low = key.lower()
        if low == "sslmode":
            mode = value.strip().lower()
            if mode not in _VALID_SSLMODES:
                raise ValueError(
                    f"sslmode={value} ไม่ถูกต้อง ใช้ได้เฉพาะ {', '.join(sorted(_VALID_SSLMODES))}"
                )
            connect_args["ssl"] = mode
        elif low in _DROPPED_QUERY_KEYS:
            continue
        elif low in _SERVER_SETTING_KEYS:
            connect_args.setdefault("server_settings", {})[low] = value
        elif low in _ASYNCPG_QUERY_KEYS:
            kept.append((key, value))
        else:
            raise ValueError(
                f"DATABASE_URL มีพารามิเตอร์ {key!r} ซึ่ง asyncpg ไม่รู้จัก — ถ้าปล่อยไว้จะพัง"
                f"ตอนเปิด connection แรก ไม่ใช่ตอนสตาร์ท ให้ลบออกจาก URL "
                f"(รองรับ: sslmode, {', '.join(sorted(_ASYNCPG_QUERY_KEYS | _SERVER_SETTING_KEYS))})"
            )

    url = urlunsplit((scheme, parts.netloc, parts.path, urlencode(kept), parts.fragment))
    return url, connect_args


def parse_cors_origins(raw: str) -> list[str]:
    """
    แปลง "https://a.com, https://b.com" เป็น list ของ origin

    origin ที่เบราว์เซอร์ส่งมาใน header Origin มีแค่ scheme://host[:port] ไม่มี path
    ถ้าตั้งค่าใส่ path มาด้วยจะไม่มีวันตรงกัน จึงตรวจจับให้ตั้งแต่ตอนอ่านค่า
    """
    origins: list[str] = []

    for chunk in (raw or "").split(","):
        origin = chunk.strip().rstrip("/")
        if not origin:
            continue

        if origin == "*":
            # Starlette ตั้ง allow_credentials=True อยู่ ซึ่งใช้คู่กับ "*" ไม่ได้ตามสเปก CORS
            # และถึงใช้ได้ก็ไม่ควร เพราะเท่ากับให้เว็บไหนก็ได้อ่านข้อมูลของผู้ใช้ที่ล็อกอินอยู่
            raise ValueError(
                'CORS_ORIGINS ใช้ "*" ไม่ได้เพราะระบบนี้ส่ง cookie/credential ข้าม origin '
                "ให้ระบุโดเมนของ frontend ตรง ๆ คั่นด้วยเครื่องหมายจุลภาค"
            )

        parsed = urlsplit(origin)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"CORS origin ไม่ถูกต้อง: {origin!r} ต้องอยู่ในรูป https://example.com")
        if parsed.path or parsed.query or parsed.fragment:
            raise ValueError(
                f"CORS origin ต้องมีแค่ scheme กับ host ห้ามมี path: {origin!r}"
            )

        if origin not in origins:
            origins.append(origin)

    return origins


# ------------------------------------------------------------
# ลิงก์ที่ส่งไปในอีเมล
# ------------------------------------------------------------

def build_frontend_link(base_url: str, path: str, **params: str) -> str:
    """
    ประกอบลิงก์ที่จะฝังในอีเมล เช่น https://app.example.com/reset-password?token=xxx

    ต้องประกอบผ่านฟังก์ชันนี้ ห้าม f-string ต่อ string ตรง ๆ เพราะโทเคนที่
    secrets.token_urlsafe() สร้างมี `-` กับ `_` ซึ่งปลอดภัยใน URL อยู่แล้วก็จริง
    แต่ถ้าวันหนึ่งเปลี่ยนวิธีสร้างโทเคนแล้วมี `+` หรือ `&` โผล่มา ลิงก์จะพังเงียบ ๆ
    urlencode จัดการ escape ให้เอง

    รับ base_url ที่มี path ต่อท้ายได้ (เช่น https://example.com/app) โดยไม่ทำให้
    เกิด `//` ซ้อน หรือกลืน path เดิมทิ้ง
    """
    base = (base_url or "").strip().rstrip("/")
    if not base:
        raise ValueError("APP_BASE_URL ว่าง — ต้องใส่ URL ของหน้าเว็บฝั่ง frontend")

    parsed = urlsplit(base)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(
            f"APP_BASE_URL ไม่ถูกต้อง: {base_url!r} ต้องอยู่ในรูป https://example.com"
        )

    joined = f"{parsed.path}/{path.lstrip('/')}" if path else parsed.path
    query = urlencode({k: v for k, v in params.items() if v is not None})
    return urlunsplit((parsed.scheme, parsed.netloc, joined, query, ""))


# ------------------------------------------------------------
# Google Sign-In
# ------------------------------------------------------------

# Google ออก ID token โดยระบุ iss เป็นสองรูปแบบนี้สลับกันมาตามยุค ต้องรับทั้งคู่
# (เอกสารของ Google ระบุไว้เองว่าให้ยอมรับทั้งสองค่า)
GOOGLE_ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})

# ที่อยู่กุญแจสาธารณะของ Google ใช้ตรวจลายเซ็น ID token
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"


def parse_google_client_ids(raw: str) -> list[str]:
    """
    แปลง "111-web.apps.googleusercontent.com, 222-ios.apps.googleusercontent.com"
    เป็น list ของ client id

    รับหลายค่าเพราะเว็บ / Android / iOS ของแอปเดียวกันได้คนละ client id จาก Google
    แต่ผู้ใช้เป็นคนเดียวกัน backend จึงต้องยอมรับ aud ได้หลายค่า

    ตรวจรูปแบบให้ตั้งแต่ตอนอ่านค่า เพราะถ้าตั้งผิดจะไปพังตอนผู้ใช้กดปุ่ม
    "เข้าสู่ระบบด้วย Google" ครั้งแรกบน production ซึ่งไล่หาสาเหตุยาก
    """
    ids: list[str] = []

    for chunk in (raw or "").split(","):
        client_id = chunk.strip()
        if not client_id:
            continue

        if not client_id.endswith(".apps.googleusercontent.com"):
            raise ValueError(
                f"GOOGLE_CLIENT_IDS ไม่ถูกต้อง: {client_id!r} — "
                "ค่าที่ Google ให้มาจะลงท้ายด้วย .apps.googleusercontent.com เสมอ "
                "(อย่าเอา client secret มาใส่ ตรงนี้ใช้ client id เท่านั้น)"
            )

        if client_id not in ids:
            ids.append(client_id)

    return ids


# ------------------------------------------------------------
# อีเมลขาออก (SMTP)
# ------------------------------------------------------------

# starttls  ต่อพอร์ต 587 แบบธรรมดาแล้วยกระดับเป็น TLS — ผู้ให้บริการส่วนใหญ่ใช้แบบนี้
# ssl       ต่อพอร์ต 465 โดยเข้ารหัสตั้งแต่วินาทีแรก
# none      ไม่เข้ารหัสเลย ใช้ได้เฉพาะ SMTP จำลองบนเครื่องตัวเองตอน dev
MAIL_SECURITY_MODES = frozenset({"starttls", "ssl", "none"})

DEFAULT_MAIL_PORTS = {"starttls": 587, "ssl": 465, "none": 25}


def parse_mail_settings(
    host: str,
    port: str = "",
    security: str = "",
    sender: str = "",
    username: str = "",
    password: str = "",
) -> dict | None:
    """
    ตรวจและแปลงค่าตั้ง SMTP คืน dict ที่ mailer.py เอาไปใช้ต่อได้เลย

    คืน None ถ้าไม่ได้ตั้ง host ไว้ — แปลว่ายังไม่ต่อผู้ให้บริการอีเมล
    mailer.py จะกลับไปโหมดพิมพ์ลง log แทน ระบบยังใช้งานได้ทุกอย่างยกเว้นลืมรหัสผ่าน

    ตั้งใจให้ "ตั้งไม่ครบ = error ตั้งแต่เซิร์ฟเวอร์สตาร์ท" ไม่ใช่ "ส่งอีเมลไม่ออกเงียบ ๆ"
    เพราะอย่างหลังจะรู้ตัวก็ต่อเมื่อมีผู้ใช้จริงกดลืมรหัสผ่านแล้วไม่ได้อีเมล
    """
    host = (host or "").strip()
    if not host:
        return None

    mode = (security or "starttls").strip().lower()
    if mode not in MAIL_SECURITY_MODES:
        raise ValueError(
            f"SMTP_SECURITY={security!r} ไม่ถูกต้อง ใช้ได้เฉพาะ "
            f"{', '.join(sorted(MAIL_SECURITY_MODES))}"
        )

    raw_port = (port or "").strip()
    if raw_port:
        try:
            port_number = int(raw_port)
        except ValueError:
            raise ValueError(f"SMTP_PORT ต้องเป็นตัวเลข แต่ได้ {port!r}") from None
        if not 1 <= port_number <= 65535:
            raise ValueError(f"SMTP_PORT ต้องอยู่ระหว่าง 1-65535 แต่ได้ {port_number}")
    else:
        port_number = DEFAULT_MAIL_PORTS[mode]

    sender = (sender or "").strip()
    if not sender:
        raise ValueError(
            "ตั้ง SMTP_HOST แล้วต้องตั้ง MAIL_FROM ด้วย — เป็นที่อยู่ผู้ส่งที่โผล่ในกล่องจดหมาย "
            "ของผู้ใช้ และต้องเป็นโดเมนที่ยืนยันไว้กับผู้ให้บริการแล้ว ไม่งั้นอีเมลจะเด้งกลับ"
        )
    if "@" not in sender or sender.startswith("@") or sender.endswith("@"):
        raise ValueError(f"MAIL_FROM ต้องเป็นอีเมล แต่ได้ {sender!r}")

    username = (username or "").strip()
    if username and not password:
        raise ValueError("ตั้ง SMTP_USER แล้วต้องตั้ง SMTP_PASSWORD ด้วย")

    return {
        "host": host,
        "port": port_number,
        "security": mode,
        "sender": sender,
        "username": username,
        "password": password or "",
    }
