"""
ทดสอบค่าตั้งของ Google Sign-In และการส่งอีเมล
— config.parse_google_client_ids / parse_mail_settings / build_frontend_link

เทสต์ชุดนี้สำคัญด้วยเหตุผลเดียวกับ test_deploy_config.py: บั๊กของโค้ดส่วนนี้
ไม่โผล่ตอน dev เลย เพราะบนเครื่องตัวเองไม่ได้ตั้ง GOOGLE_CLIENT_IDS และไม่ได้ตั้ง
SMTP_HOST ทั้งสองอย่างจึงถูกข้ามไปเงียบ ๆ แล้วไปพังตอน deploy จริง ซึ่งอาการ
ที่เห็นคือ "กดปุ่ม Google แล้วไม่เข้า" กับ "กดลืมรหัสผ่านแล้วอีเมลไม่มา"
สองอาการที่ไล่หาสาเหตุยากที่สุด เพราะไม่มี error ให้ดู

ไม่ต้องต่อฐานข้อมูล ไม่ต้องติดตั้ง dependency ใด ๆ config.py ใช้แค่ standard library

รัน:  python tests/test_auth_config.py
"""
import sys

from _stubs import add_project_root_to_path

add_project_root_to_path()

from config import (  # noqa: E402
    DEFAULT_MAIL_PORTS,
    GOOGLE_ISSUERS,
    build_frontend_link,
    parse_google_client_ids,
    parse_mail_settings,
)

failures = []


def report(name, ok, fail_detail="", ok_detail=""):
    if ok:
        print(f"  ok   {name}{(' = ' + ok_detail) if ok_detail else ''}")
    else:
        failures.append(f"{name}: {fail_detail}")
        print(f"  FAIL {name}: {fail_detail}")


def check_equal(name, got, expected):
    report(name, got == expected,
           fail_detail=f"ควรได้ {expected!r} แต่ได้ {got!r}", ok_detail=repr(got))


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


WEB_ID = "1234567890-web.apps.googleusercontent.com"
IOS_ID = "1234567890-ios.apps.googleusercontent.com"


# ================================================================
print("parse_google_client_ids")
# ================================================================

check_equal("ไม่ตั้งค่า = list ว่าง (ปิดฟีเจอร์)", parse_google_client_ids(""), [])
check_equal("ค่าว่างล้วน = list ว่าง", parse_google_client_ids("   ,  , "), [])
check_equal("ค่าเดียว", parse_google_client_ids(WEB_ID), [WEB_ID])

# เว็บ / Android / iOS ของแอปเดียวกันได้คนละ client id แต่เป็นผู้ใช้คนเดียวกัน
check_equal("หลายค่าคั่นด้วยจุลภาค", parse_google_client_ids(f"{WEB_ID},{IOS_ID}"), [WEB_ID, IOS_ID])
check_equal("เว้นวรรครอบจุลภาคได้", parse_google_client_ids(f" {WEB_ID} , {IOS_ID} "), [WEB_ID, IOS_ID])
check_equal("ตัดค่าซ้ำทิ้ง", parse_google_client_ids(f"{WEB_ID},{WEB_ID}"), [WEB_ID])

# จุดที่คนพลาดบ่อยที่สุด: หยิบ client secret มาใส่แทน client id
check_raises(
    "client secret ไม่ผ่าน",
    lambda: parse_google_client_ids("GOCSPX-abcdefghijklmnop"),
    needle="apps.googleusercontent.com",
)
check_raises("ค่ามั่ว ๆ ไม่ผ่าน", lambda: parse_google_client_ids("my-client-id"))
check_raises(
    "ค่าถูกหนึ่ง ผิดหนึ่ง ต้องไม่ผ่านทั้งชุด",
    lambda: parse_google_client_ids(f"{WEB_ID},oops"),
)

# ต้องรับ iss ทั้งสองรูปแบบที่ Google ใช้สลับกัน ไม่งั้นผู้ใช้บางกลุ่มเข้าไม่ได้
report("รับ iss ทั้งสองรูปแบบของ Google",
       GOOGLE_ISSUERS == {"accounts.google.com", "https://accounts.google.com"},
       fail_detail=f"ได้ {sorted(GOOGLE_ISSUERS)}", ok_detail=str(sorted(GOOGLE_ISSUERS)))


# ================================================================
print("\nparse_mail_settings — ไม่ตั้ง SMTP_HOST = โหมดพิมพ์ลง log")
# ================================================================

check_equal("ไม่ตั้ง host = None", parse_mail_settings(""), None)
check_equal("host เป็นช่องว่าง = None", parse_mail_settings("   "), None)

# ไม่ตั้ง host แล้วต้องไม่บ่นเรื่อง MAIL_FROM — โหมด dev ต้องใช้งานได้โดยไม่ตั้งอะไรเลย
check_equal("ไม่ตั้ง host แล้วไม่บังคับ MAIL_FROM", parse_mail_settings("", port="587"), None)


# ================================================================
print("\nparse_mail_settings — ตั้ง SMTP_HOST แล้วต้องตั้งให้ครบ")
# ================================================================

check_raises(
    "ตั้ง host แต่ไม่ตั้ง MAIL_FROM",
    lambda: parse_mail_settings("smtp.example.com"),
    needle="MAIL_FROM",
)
check_raises(
    "MAIL_FROM ไม่ใช่อีเมล",
    lambda: parse_mail_settings("smtp.example.com", sender="noreply"),
    needle="MAIL_FROM",
)
check_raises(
    "ตั้ง SMTP_USER แต่ไม่ตั้ง SMTP_PASSWORD",
    lambda: parse_mail_settings(
        "smtp.example.com", sender="noreply@example.com", username="bot"
    ),
    needle="SMTP_PASSWORD",
)
check_raises(
    "SMTP_SECURITY ค่าที่ไม่รู้จัก",
    lambda: parse_mail_settings(
        "smtp.example.com", sender="noreply@example.com", security="tls"
    ),
    needle="SMTP_SECURITY",
)
check_raises(
    "SMTP_PORT ไม่ใช่ตัวเลข",
    lambda: parse_mail_settings(
        "smtp.example.com", sender="noreply@example.com", port="ห้าแปดเจ็ด"
    ),
    needle="SMTP_PORT",
)
check_raises(
    "SMTP_PORT นอกช่วง",
    lambda: parse_mail_settings(
        "smtp.example.com", sender="noreply@example.com", port="70000"
    ),
    needle="SMTP_PORT",
)


# ================================================================
print("\nparse_mail_settings — ค่าที่ถูกต้อง")
# ================================================================

basic = parse_mail_settings("smtp.example.com", sender="noreply@example.com")
check_equal("ไม่ตั้ง security = starttls", basic["security"], "starttls")
check_equal("ไม่ตั้ง port ตอน starttls = 587", basic["port"], 587)
check_equal("ไม่ตั้ง user = ไม่ login", basic["username"], "")

ssl_mode = parse_mail_settings(
    "smtp.example.com", sender="noreply@example.com", security="ssl"
)
check_equal("ไม่ตั้ง port ตอน ssl = 465", ssl_mode["port"], 465)

plain = parse_mail_settings(
    "localhost", sender="dev@localhost.test", security="none"
)
check_equal("ไม่ตั้ง port ตอน none = 25", plain["port"], 25)

# port ที่ตั้งเองต้องชนะค่า default เสมอ ผู้ให้บริการบางเจ้าใช้พอร์ตนอกมาตรฐาน
custom = parse_mail_settings(
    "smtp.example.com", sender="noreply@example.com", port="2525"
)
check_equal("port ที่ตั้งเองชนะ default", custom["port"], 2525)

trimmed = parse_mail_settings(
    "  smtp.example.com  ", sender="  noreply@example.com  ",
    security=" STARTTLS ", username=" bot ", password="pw",
)
check_equal("ตัดช่องว่างหัวท้ายให้", trimmed["host"], "smtp.example.com")
check_equal("security ไม่แยกตัวพิมพ์เล็ก-ใหญ่", trimmed["security"], "starttls")
check_equal("sender ถูกตัดช่องว่าง", trimmed["sender"], "noreply@example.com")

report("ทุกโหมดมี port default", set(DEFAULT_MAIL_PORTS) == {"starttls", "ssl", "none"},
       fail_detail=f"ได้ {sorted(DEFAULT_MAIL_PORTS)}")


# ================================================================
print("\nbuild_frontend_link — ลิงก์ในอีเมลต้องกดแล้วไปถูกที่")
# ================================================================

check_equal(
    "ประกอบลิงก์พื้นฐาน",
    build_frontend_link("http://localhost:3000", "/reset-password", token="abc123"),
    "http://localhost:3000/reset-password?token=abc123",
)
check_equal(
    "base มี / ท้ายก็ไม่เกิด // ซ้อน",
    build_frontend_link("https://app.example.com/", "/reset-password", token="abc"),
    "https://app.example.com/reset-password?token=abc",
)
check_equal(
    "path ไม่มี / นำหน้าก็ได้",
    build_frontend_link("https://app.example.com", "reset-password", token="abc"),
    "https://app.example.com/reset-password?token=abc",
)
# frontend ที่ deploy ไว้ใต้ subpath ต้องไม่ถูกกลืน path เดิมทิ้ง
check_equal(
    "base ที่มี subpath ยังคงอยู่",
    build_frontend_link("https://example.com/app", "/reset-password", token="abc"),
    "https://example.com/app/reset-password?token=abc",
)
# จุดสำคัญ: อักขระพิเศษในโทเคนต้องถูก escape ไม่งั้นลิงก์ขาดกลางแล้วผู้ใช้กดไม่ได้
check_equal(
    "escape อักขระพิเศษในโทเคน",
    build_frontend_link("https://example.com", "/reset-password", token="a+b/c=d&e"),
    "https://example.com/reset-password?token=a%2Bb%2Fc%3Dd%26e",
)

check_raises("base ว่างไม่ผ่าน", lambda: build_frontend_link("", "/x", token="a"),
             needle="APP_BASE_URL")
check_raises("base ไม่มี scheme ไม่ผ่าน",
             lambda: build_frontend_link("example.com", "/x", token="a"),
             needle="APP_BASE_URL")


# ================================================================
print(f"\n{'=' * 60}")
if failures:
    print(f"ไม่ผ่าน {len(failures)} เคส")
    for line in failures:
        print(f"  - {line}")
    sys.exit(1)
print("ผ่านทั้งหมด")
