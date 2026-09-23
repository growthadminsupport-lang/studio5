"""
ทดสอบการอ่านค่าตั้งสำหรับ deploy — config.normalize_database_url / parse_cors_origins

เทสต์ชุดนี้สำคัญเพราะบั๊กของโค้ดส่วนนี้จะไม่โผล่ตอน dev เลย บนเครื่องตัวเอง
connection string ไม่มี sslmode และ CORS ก็เป็น localhost อยู่แล้ว ทุกอย่างจะดูปกติ
แล้วไปพังตอน deploy ขึ้น host จริงซึ่งเป็นจุดที่ debug ยากที่สุด

ไม่ต้องต่อฐานข้อมูล ไม่ต้องติดตั้ง dependency ใด ๆ config.py ใช้แค่ standard library

รัน:  python tests/test_deploy_config.py
"""
import sys

from _stubs import add_project_root_to_path

add_project_root_to_path()

from config import (  # noqa: E402
    ASYNC_DRIVER,
    DEFAULT_CORS_ORIGINS,
    normalize_database_url,
    parse_cors_origins,
)

failures = []


def report(name, ok, fail_detail="", ok_detail=""):
    if ok:
        print(f"  ok   {name}{(' = ' + ok_detail) if ok_detail else ''}")
    else:
        failures.append(f"{name}: {fail_detail}")
        print(f"  FAIL {name}: {fail_detail}")


def check_url(name, raw, expected_url, expected_args):
    try:
        url, args = normalize_database_url(raw)
    except Exception as exc:
        report(name, False, fail_detail=f"ไม่ควร error แต่ได้ {type(exc).__name__}: {exc}")
        return
    if url != expected_url:
        report(name, False, fail_detail=f"url ควรเป็น {expected_url!r} แต่ได้ {url!r}")
        return
    if args != expected_args:
        report(name, False, fail_detail=f"connect_args ควรเป็น {expected_args} แต่ได้ {args}")
        return
    report(name, True, ok_detail=f"{url} + {args}")


def check_raises(name, fn, needle=""):
    """ต้องโยน ValueError และข้อความต้องบอกสาเหตุพอให้คนแก้ถูก"""
    try:
        got = fn()
    except ValueError as exc:
        if needle and needle not in str(exc):
            report(name, False, fail_detail=f"ข้อความ error ควรมีคำว่า {needle!r} แต่ได้ {exc}")
            return
        report(name, True, ok_detail=f"ValueError: {str(exc)[:60]}")
        return
    except Exception as exc:
        report(name, False, fail_detail=f"ควรเป็น ValueError แต่ได้ {type(exc).__name__}: {exc}")
        return
    report(name, False, fail_detail=f"ควร error แต่ผ่านไปได้ ได้ {got!r}")


# ================================================================
print("normalize_database_url — เปลี่ยน scheme ให้เป็น async driver")
# ================================================================

check_url(
    "postgresql:// เปลี่ยนเป็น +asyncpg",
    "postgresql://postgres@localhost:5432/growth_db",
    f"{ASYNC_DRIVER}://postgres@localhost:5432/growth_db",
    {},
)

# Render กับ Heroku ยังคืน scheme รูปแบบเก่านี้อยู่ SQLAlchemy รับไม่ได้ตรง ๆ
check_url(
    "postgres:// (รูปแบบเก่า) เปลี่ยนเป็น +asyncpg",
    "postgres://user:pw@db.internal:5432/growth_db",
    f"{ASYNC_DRIVER}://user:pw@db.internal:5432/growth_db",
    {},
)

check_url(
    "ที่เป็น +asyncpg อยู่แล้วไม่ต้องแก้",
    f"{ASYNC_DRIVER}://postgres@localhost:5432/growth_db",
    f"{ASYNC_DRIVER}://postgres@localhost:5432/growth_db",
    {},
)

check_url(
    "ตัวพิมพ์ใหญ่ใน scheme ก็ยังรับได้",
    "POSTGRESQL://postgres@localhost/growth_db",
    f"{ASYNC_DRIVER}://postgres@localhost/growth_db",
    {},
)

check_url(
    "ช่องว่างหน้าหลังถูกตัดทิ้ง",
    "  postgresql://postgres@localhost/growth_db\n",
    f"{ASYNC_DRIVER}://postgres@localhost/growth_db",
    {},
)


# ================================================================
print("\nnormalize_database_url — ย้าย sslmode ไป connect_args")
# ================================================================

# นี่คือหน้าตาจริงของ connection string ที่ Neon ให้มา ถ้าไม่แปลงก่อนจะได้
# TypeError: connect() got an unexpected keyword argument 'sslmode'
check_url(
    "Neon: sslmode + channel_binding",
    "postgresql://u:pw@ep-cool-1.ap-southeast-1.aws.neon.tech/growth_db"
    "?sslmode=require&channel_binding=require",
    f"{ASYNC_DRIVER}://u:pw@ep-cool-1.ap-southeast-1.aws.neon.tech/growth_db",
    {"ssl": "require"},
)

check_url(
    "Supabase: sslmode=require อย่างเดียว",
    "postgresql://postgres:pw@db.abcd.supabase.co:5432/postgres?sslmode=require",
    f"{ASYNC_DRIVER}://postgres:pw@db.abcd.supabase.co:5432/postgres",
    {"ssl": "require"},
)

check_url(
    "sslmode=verify-full",
    "postgresql://u@h/db?sslmode=verify-full",
    f"{ASYNC_DRIVER}://u@h/db",
    {"ssl": "verify-full"},
)

check_url(
    "sslmode=disable",
    "postgresql://u@h/db?sslmode=disable",
    f"{ASYNC_DRIVER}://u@h/db",
    {"ssl": "disable"},
)

check_url(
    "SSLMODE ตัวพิมพ์ใหญ่และค่าตัวพิมพ์ใหญ่",
    "postgresql://u@h/db?SSLMODE=REQUIRE",
    f"{ASYNC_DRIVER}://u@h/db",
    {"ssl": "require"},
)

# application_name เป็นของ libpq — asyncpg ไม่รับเป็น keyword (จะ TypeError ตอนต่อ)
# ต้องย้ายไป server_settings ซึ่งเป็นช่องทางที่ถูกต้อง ไม่ใช่คาไว้ใน URL
check_url(
    "application_name ย้ายไป server_settings ไม่คาไว้ใน URL",
    "postgresql://u@h/db?sslmode=require&application_name=growth",
    f"{ASYNC_DRIVER}://u@h/db",
    {"ssl": "require", "server_settings": {"application_name": "growth"}},
)

# พารามิเตอร์ที่ asyncpg รับเป็น keyword ได้จริงต้องคาไว้ใน URL ห้ามตัดทิ้งมั่ว
check_url(
    "พารามิเตอร์ที่ asyncpg รู้จักไม่ถูกตัดทิ้ง",
    "postgresql://u@h/db?command_timeout=30",
    f"{ASYNC_DRIVER}://u@h/db?command_timeout=30",
    {},
)

# ของที่ asyncpg ไม่รู้จักต้องระเบิดตั้งแต่ตอนอ่านค่า ไม่ใช่ตอนเปิด connection แรก
# ซึ่งคือตอน Render ยิง /health แล้วเห็นแค่ 500 ไม่มีอะไรชี้กลับมาที่ DATABASE_URL
check_raises(
    "พารามิเตอร์ที่ asyncpg ไม่รู้จักต้อง error ทันที",
    lambda: normalize_database_url("postgresql://u@h/db?connect_timeout=10"),
    needle="connect_timeout",
)
check_raises(
    "options= ของ libpq ไม่ผ่าน",
    lambda: normalize_database_url("postgresql://u@h/db?options=-c%20search_path%3Dfoo"),
    needle="options",
)

check_url(
    "ไม่มี query string ก็ไม่มี ? ห้อยท้าย",
    "postgresql://u@h/db",
    f"{ASYNC_DRIVER}://u@h/db",
    {},
)


# ================================================================
print("\nnormalize_database_url — ค่าที่ต้องปฏิเสธ")
# ================================================================

check_raises("ค่าว่าง", lambda: normalize_database_url(""), "ว่าง")
check_raises("มีแต่ช่องว่าง", lambda: normalize_database_url("   "), "ว่าง")
check_raises("None", lambda: normalize_database_url(None), "ว่าง")
check_raises(
    "mysql:// ไม่ใช่ PostgreSQL",
    lambda: normalize_database_url("mysql://u@h/db"),
    "postgresql",
)
check_raises(
    "psycopg2 เป็น driver แบบ sync ใช้กับโปรเจกต์นี้ไม่ได้",
    lambda: normalize_database_url("postgresql+psycopg2://u@h/db"),
    ASYNC_DRIVER,
)
check_raises(
    "ไม่มี host",
    lambda: normalize_database_url("postgresql:///growth_db"),
    "host",
)
check_raises(
    "sslmode สะกดผิด",
    lambda: normalize_database_url("postgresql://u@h/db?sslmode=required"),
    "sslmode",
)


# ================================================================
print("\nparse_cors_origins")
# ================================================================


def check_origins(name, raw, expected):
    try:
        got = parse_cors_origins(raw)
    except Exception as exc:
        report(name, False, fail_detail=f"ไม่ควร error แต่ได้ {type(exc).__name__}: {exc}")
        return
    report(name, got == expected,
           fail_detail=f"ควรได้ {expected} แต่ได้ {got}", ok_detail=str(got))


check_origins("origin เดียว", "https://growth.vercel.app", ["https://growth.vercel.app"])
check_origins(
    "หลาย origin คั่นด้วยจุลภาค",
    "https://a.com,https://b.com",
    ["https://a.com", "https://b.com"],
)
check_origins(
    "มีช่องว่างหลังจุลภาค",
    "https://a.com,  https://b.com ",
    ["https://a.com", "https://b.com"],
)
# เบราว์เซอร์ส่ง Origin มาแบบไม่มี / ปิดท้าย ถ้าเก็บ / ไว้จะเทียบไม่ตรงตลอดกาล
check_origins("ตัด / ท้ายออก", "https://a.com/", ["https://a.com"])
check_origins("มีพอร์ตได้", "http://localhost:5173", ["http://localhost:5173"])
check_origins("ตัดตัวซ้ำออก", "https://a.com,https://a.com/", ["https://a.com"])
check_origins("จุลภาคเกินมาไม่นับ", "https://a.com,,", ["https://a.com"])
check_origins("ค่าว่างได้ list ว่าง", "", [])
check_origins("None ได้ list ว่าง", None, [])

check_raises(
    'ห้ามใช้ "*" คู่กับ credential',
    lambda: parse_cors_origins("*"),
    "*",
)
check_raises(
    'ห้ามใช้ "*" แม้ปนมากับโดเมนอื่น',
    lambda: parse_cors_origins("https://a.com,*"),
    "*",
)
check_raises(
    "ไม่มี scheme",
    lambda: parse_cors_origins("growth.vercel.app"),
    "https://example.com",
)
check_raises(
    "มี path ต่อท้ายจะไม่มีวันตรงกับ header Origin",
    lambda: parse_cors_origins("https://a.com/app"),
    "path",
)


# ================================================================
print("\nค่า default ตอนไม่ได้ตั้ง CORS_ORIGINS")
# ================================================================

# main.py เขียนว่า parse_cors_origins(...) or DEFAULT_CORS_ORIGINS จำลองพฤติกรรมนั้นตรงนี้
fallback = parse_cors_origins("") or DEFAULT_CORS_ORIGINS
report("ไม่ตั้งค่าแล้วได้ localhost", fallback == ["http://localhost:3000"],
       fail_detail=f"ได้ {fallback}", ok_detail=str(fallback))

# default ต้องไม่เปิดกว้าง ไม่งั้นลืมตั้งค่าตอน deploy = เว็บไหนก็ยิงเข้ามาได้
report('default ไม่มี "*"', "*" not in DEFAULT_CORS_ORIGINS,
       fail_detail=f"DEFAULT_CORS_ORIGINS = {DEFAULT_CORS_ORIGINS}")


# ================================================================
print(f"\n{'=' * 60}")
if failures:
    print(f"ไม่ผ่าน {len(failures)} เคส")
    for line in failures:
        print(f"  - {line}")
    sys.exit(1)
print("ผ่านทั้งหมด")
