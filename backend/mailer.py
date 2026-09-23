"""
ส่งอีเมลขาออก — ลิงก์ตั้งรหัสผ่านใหม่ และอีเมลแจ้งเตือนความปลอดภัย

สองโหมด เลือกอัตโนมัติจาก environment
──────────────────────────────────────
ตั้ง `SMTP_HOST`      ส่งจริงผ่าน SMTP
ไม่ตั้ง               พิมพ์เนื้อหาลง log ของเซิร์ฟเวอร์แทน (โหมดพัฒนา)

โหมด log ทำให้เครื่อง dev ทำงานได้โดยไม่ต้องมีบัญชีผู้ให้บริการอีเมล — ลิงก์
ตั้งรหัสผ่านใหม่จะโผล่ใน console ให้คัดลอกไปทดสอบต่อได้เลย

**ห้ามส่งโทเคนกลับไปใน HTTP response เด็ดขาด** ไม่ว่าโหมดไหน ไม่งั้นใครยิง API
ก็รีเซ็ตรหัสผ่านคนอื่นได้ทันทีทั้งที่ไม่มีสิทธิ์เข้าอีเมลนั้น
โทเคนต้องเดินทางผ่านอีเมลเท่านั้น

ทำไมต้องเป็น async
──────────────────
smtplib เป็น blocking I/O การต่อ SMTP + TLS handshake + ส่ง ใช้เวลาหลักร้อย
มิลลิวินาทีถึงหลายวินาที ถ้าเรียกตรง ๆ ใน endpoint แบบ async event loop ทั้งเส้น
จะหยุดรอ แปลว่าผู้ใช้ **คนอื่นทุกคน** ค้างไปด้วยตลอดช่วงนั้น
จึงโยนไปรันใน thread ด้วย asyncio.to_thread() ทุกครั้ง

ทำไมส่งไม่ออกแล้วไม่โยน error
─────────────────────────────
ทุกฟังก์ชัน send_* กลืน error ของการส่ง แล้วบันทึกลง log แทน เพราะ:
  - /password/forgot ต้องตอบข้อความกลาง ๆ เหมือนกันทุกกรณี ถ้าปล่อยให้ล้มเป็น 500
    ตอนอีเมลไม่มีอยู่จริง คนยิงจะแยกออกทันทีว่าอีเมลไหนมีบัญชี
  - อีเมลแจ้งเตือน (เปลี่ยนรหัส/เปลี่ยนอีเมล) เป็นของแถมหลังงานหลักสำเร็จไปแล้ว
    รหัสผ่านถูกเปลี่ยนและ commit ไปแล้วจริง ๆ จะย้อนกลับเพราะส่งอีเมลไม่ออกไม่ได้
"""
import asyncio
import logging
import os
import smtplib
import ssl
from email.headerregistry import Address
from email.message import EmailMessage

from dotenv import load_dotenv

from config import build_frontend_link, parse_mail_settings

load_dotenv()

logger = logging.getLogger("growth.mailer")

# ที่อยู่ของหน้าเว็บฝั่ง frontend ที่จะรับโทเคนไปตั้งรหัสผ่านใหม่ — ต้องชี้ไปที่
# "หน้าเว็บ" ไม่ใช่ที่ API เพราะคนกดลิงก์นี้คือผู้ใช้ในกล่องจดหมาย
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")

SERVICE_NAME = "GrowTH"

# path ของหน้าเว็บที่รับโทเคน ถ้าฝั่ง frontend ใช้ path อื่นให้แก้ตรงนี้จุดเดียว
RESET_PASSWORD_PATH = "/reset-password"

# ประกอบลิงก์ทิ้งหนึ่งครั้งตั้งแต่ตอน import เพื่อให้ APP_BASE_URL ที่ผิดรูปแบบ
# ระเบิดตอนเซิร์ฟเวอร์สตาร์ท ไม่ใช่ตอนผู้ใช้คนแรกกดลืมรหัสผ่าน — ซึ่งจะกลายเป็น
# 500 จาก endpoint ที่ต้องตอบข้อความกลาง ๆ เสมอ
build_frontend_link(APP_BASE_URL, RESET_PASSWORD_PATH, token="startup-check")

# ตรวจค่าตั้งตั้งแต่ตอน import — ตั้งผิดจะรู้ตอนเซิร์ฟเวอร์สตาร์ท
# ไม่ใช่ตอนผู้ใช้จริงกดลืมรหัสผ่านแล้วอีเมลไม่มา
MAIL = parse_mail_settings(
    host=os.environ.get("SMTP_HOST", ""),
    port=os.environ.get("SMTP_PORT", ""),
    security=os.environ.get("SMTP_SECURITY", ""),
    sender=os.environ.get("MAIL_FROM", ""),
    username=os.environ.get("SMTP_USER", ""),
    password=os.environ.get("SMTP_PASSWORD", ""),
)

MAIL_FROM_NAME = os.environ.get("MAIL_FROM_NAME", SERVICE_NAME)

SMTP_ENABLED = MAIL is not None

# กันเซิร์ฟเวอร์ SMTP ที่รับ connection แล้วเงียบ ทำให้ thread ค้างสะสมไปเรื่อย ๆ
_SMTP_TIMEOUT_SECONDS = 15


def _build_message(to_email: str, subject: str, body: str) -> EmailMessage:
    """
    ประกอบอีเมลข้อความล้วน

    ใช้ EmailMessage ของ standard library ไม่ต่อ string เอง เพราะหัวข้ออีเมล
    เป็นภาษาไทยซึ่งต้องเข้ารหัสตามมาตรฐาน MIME ก่อนถึงจะอ่านออกฝั่งผู้รับ
    ถ้าประกอบเองจะได้หัวข้อเป็นตัวยึกยือ — EmailMessage จัดการให้อัตโนมัติ
    """
    message = EmailMessage()
    message["Subject"] = subject
    message["To"] = to_email

    sender = MAIL["sender"] if MAIL else "noreply@localhost"
    local, _, domain = sender.partition("@")
    message["From"] = Address(MAIL_FROM_NAME, local, domain)

    # อีเมลอัตโนมัติไม่ควรมีใครกด reply มาคุยด้วย และไม่ควรถูกตอบกลับอัตโนมัติ
    # ด้วยข้อความ "ไม่อยู่ที่โต๊ะ" ซึ่งจะเด้งกลับมาที่กล่องผู้ส่งเป็นร้อยฉบับ
    message["Auto-Submitted"] = "auto-generated"
    message.set_content(body)
    return message


def _send_via_smtp(message: EmailMessage) -> None:
    """
    ส่งจริง — ฟังก์ชัน blocking ต้องเรียกผ่าน asyncio.to_thread() เท่านั้น

    ห้ามเรียกตรงจาก endpoint แบบ async ดูเหตุผลในหัวไฟล์
    """
    assert MAIL is not None   # ผู้เรียกเช็ค SMTP_ENABLED มาก่อนแล้ว

    if MAIL["security"] == "ssl":
        server = smtplib.SMTP_SSL(
            MAIL["host"], MAIL["port"],
            timeout=_SMTP_TIMEOUT_SECONDS, context=ssl.create_default_context(),
        )
    else:
        server = smtplib.SMTP(MAIL["host"], MAIL["port"], timeout=_SMTP_TIMEOUT_SECONDS)

    with server:
        if MAIL["security"] == "starttls":
            # ต้องยกระดับเป็น TLS ก่อนส่งรหัสผ่าน ไม่งั้นรหัสของบัญชีผู้ส่ง
            # จะวิ่งเป็นข้อความเปล่าบนเครือข่าย
            server.starttls(context=ssl.create_default_context())

        if MAIL["username"]:
            server.login(MAIL["username"], MAIL["password"])

        server.send_message(message)


def _log_instead(to_email: str, subject: str, body: str) -> None:
    """โหมดพัฒนา — พิมพ์ลง log แทนการส่งจริง"""
    logger.warning(
        "\n"
        "========== อีเมลขาออก (โหมดพัฒนา ไม่ได้ส่งจริง) ==========\n"
        "ถึง:     %s\n"
        "เรื่อง:   %s\n"
        "%s\n"
        "ตั้ง SMTP_HOST ใน .env เพื่อให้ส่งจริง (ดู .env.example)\n"
        "==========================================================",
        to_email, subject, body,
    )


async def _deliver(to_email: str, subject: str, body: str) -> bool:
    """
    ทางออกทางเดียวของอีเมลทุกฉบับในไฟล์นี้ คืน True ถ้าส่งออกไปแล้ว

    ฟังก์ชัน send_* ข้างล่างเรียกผ่านนี่จุดเดียว จะเปลี่ยนไปใช้ HTTP API ของ
    ผู้ให้บริการ (Resend / SendGrid / SES) แทน SMTP ก็แก้แค่ฟังก์ชันนี้
    """
    if not SMTP_ENABLED:
        _log_instead(to_email, subject, body)
        return False

    message = _build_message(to_email, subject, body)

    try:
        await asyncio.to_thread(_send_via_smtp, message)
    except (smtplib.SMTPException, ssl.SSLError, OSError) as exc:
        # log ที่อยู่ผู้รับไว้ด้วยเพื่อให้ตามได้ว่าใครไม่ได้รับอีเมล
        # แต่ **ห้าม log เนื้อหา** เพราะข้างในมีโทเคนตั้งรหัสผ่านใหม่อยู่
        # ใครอ่าน log ได้ก็จะยึดบัญชีได้ทันที
        logger.error("ส่งอีเมลถึง %s ไม่สำเร็จ (%s): %s", to_email, subject, exc)
        return False

    logger.info("ส่งอีเมลถึง %s แล้ว (%s)", to_email, subject)
    return True


# ------------------------------------------------------------
# อีเมลแต่ละแบบ
# ------------------------------------------------------------

async def send_password_reset_email(to_email: str, full_name: str, token: str) -> bool:
    """ส่งลิงก์ตั้งรหัสผ่านใหม่ — โทเคนอยู่ในลิงก์นี้ที่เดียวเท่านั้น"""
    link = build_frontend_link(APP_BASE_URL, RESET_PASSWORD_PATH, token=token)
    return await _deliver(
        to_email,
        f"ตั้งรหัสผ่านใหม่ — {SERVICE_NAME}",
        f"สวัสดีคุณ{full_name}\n\n"
        f"กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่:\n{link}\n\n"
        f"ลิงก์ใช้ได้ภายใน 1 ชั่วโมง และใช้ได้ครั้งเดียว\n"
        f"ถ้าคุณไม่ได้ขอเปลี่ยนรหัสผ่าน ไม่ต้องทำอะไร รหัสเดิมยังใช้ได้ตามปกติ\n"
        f"แต่ถ้าได้รับอีเมลนี้บ่อยผิดปกติ แปลว่าอาจมีคนพยายามเข้าบัญชีคุณอยู่",
    )


async def send_password_setup_email(to_email: str, full_name: str, token: str) -> bool:
    """
    เหมือน send_password_reset_email แต่สำหรับบัญชีที่สมัครผ่าน Google
    ซึ่งยังไม่เคยมีรหัสผ่าน

    ต้องแยกข้อความ เพราะคนกลุ่มนี้ถ้าได้อีเมลว่า "ตั้งรหัสผ่านใหม่" จะงงว่า
    ตัวเองไม่เคยตั้งรหัสผ่านไว้เลย แล้วนึกว่าเป็นอีเมลหลอกลวง
    """
    link = build_frontend_link(APP_BASE_URL, RESET_PASSWORD_PATH, token=token)
    return await _deliver(
        to_email,
        f"ตั้งรหัสผ่านสำหรับบัญชีของคุณ — {SERVICE_NAME}",
        f"สวัสดีคุณ{full_name}\n\n"
        f"บัญชีนี้สมัครไว้ด้วย Google จึงยังไม่มีรหัสผ่าน\n"
        f"ถ้าต้องการเข้าสู่ระบบด้วยอีเมลและรหัสผ่านด้วย ให้กดลิงก์นี้เพื่อตั้งรหัสผ่าน:\n{link}\n\n"
        f"ลิงก์ใช้ได้ภายใน 1 ชั่วโมง และใช้ได้ครั้งเดียว\n"
        f"ตั้งแล้วยังเข้าสู่ระบบด้วย Google ได้เหมือนเดิม ใช้ได้ทั้งสองทาง\n\n"
        f"ถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร บัญชีของคุณยังปลอดภัยดี",
    )


async def send_password_changed_notice(to_email: str, full_name: str) -> bool:
    """
    แจ้งเตือนหลังรหัสผ่านถูกเปลี่ยน — ถ้าไม่ใช่เจ้าตัวทำ จะได้รู้ตัวทัน
    เป็นแนวปฏิบัติมาตรฐานที่ทุกบริการใหญ่ทำ
    """
    return await _deliver(
        to_email,
        f"รหัสผ่านของคุณถูกเปลี่ยนแล้ว — {SERVICE_NAME}",
        f"สวัสดีคุณ{full_name}\n\n"
        f"รหัสผ่านบัญชีของคุณเพิ่งถูกเปลี่ยน และอุปกรณ์ทั้งหมดถูกให้ออกจากระบบแล้ว\n\n"
        f"ถ้าคุณเป็นคนเปลี่ยนเอง ไม่ต้องทำอะไรต่อ\n"
        f"ถ้าไม่ใช่ ให้กดลืมรหัสผ่านเพื่อตั้งใหม่ทันที แล้วติดต่อทีมงาน",
    )


async def send_email_changed_notice(old_email: str, full_name: str, new_email: str) -> bool:
    """
    แจ้งไปที่ "อีเมลเดิม" หลังผู้ใช้เปลี่ยนอีเมล

    ต้องส่งไปที่อีเมลเดิมเท่านั้น เพราะถ้ามีคนแอบเข้าบัญชีแล้วเปลี่ยนอีเมลหนี
    เจ้าของตัวจริงจะไม่มีทางรู้เลย การแจ้งกลับไปที่กล่องเดิมคือสัญญาณสุดท้าย
    ที่เขายังได้รับอยู่
    """
    return await _deliver(
        old_email,
        f"อีเมลของบัญชีคุณถูกเปลี่ยนแล้ว — {SERVICE_NAME}",
        f"สวัสดีคุณ{full_name}\n\n"
        f"อีเมลของบัญชีนี้เพิ่งถูกเปลี่ยนไปเป็น {new_email}\n"
        f"ต่อจากนี้ต้องใช้อีเมลใหม่ในการเข้าสู่ระบบ\n\n"
        f"ถ้าคุณเป็นคนเปลี่ยนเอง ไม่ต้องทำอะไรต่อ\n"
        f"ถ้าไม่ใช่ ให้ติดต่อทีมงานทันที บัญชีของคุณอาจถูกผู้อื่นเข้าถึง",
    )


async def send_google_linked_notice(
    to_email: str, full_name: str, password_cleared: bool = False
) -> bool:
    """
    แจ้งเตือนหลังบัญชี Google ถูกผูกเข้ากับบัญชีที่มีอยู่แล้ว

    การผูกอัตโนมัติทำได้เพราะ Google ยืนยันอีเมลนั้นให้แล้ว (ดู google_oauth.py)
    แต่เจ้าของบัญชีควรได้รู้ว่ามีอีกทางหนึ่งที่เข้าบัญชีเขาได้เพิ่มขึ้นมา
    ถ้าวันหนึ่งอีเมลของเขาที่ Google ถูกยึด นี่จะเป็นร่องรอยแรกที่เขาเห็น

    password_cleared=True เมื่อบัญชีเดิมมีรหัสผ่านอยู่และถูกล้างทิ้งตอนผูก (กัน
    pre-hijacking — ดู routes_auth.py เส้นทางที่ 2) ข้อความต้องต่างกัน เพราะครั้งหน้า
    เขาเข้าด้วยรหัสเดิมไม่ได้แล้ว ถ้าไม่บอกจะนึกว่าระบบพัง
    """
    if password_cleared:
        body = (
            f"สวัสดีคุณ{full_name}\n\n"
            f"บัญชี Google ของคุณถูกผูกกับบัญชี {SERVICE_NAME} ที่ใช้อีเมลนี้แล้ว\n\n"
            f"เพื่อความปลอดภัย รหัสผ่านที่เคยตั้งไว้กับบัญชีนี้ถูกยกเลิก และอุปกรณ์ทั้งหมดถูก\n"
            f"ให้ออกจากระบบ — เพราะระบบไม่สามารถยืนยันได้ว่ารหัสผ่านนั้นเป็นของคุณจริง\n"
            f"(บัญชีนี้สมัครด้วยอีเมลโดยไม่ได้ยืนยันอีเมลมาก่อน)\n\n"
            f"ตอนนี้เข้าสู่ระบบได้ด้วยปุ่ม \"เข้าสู่ระบบด้วย Google\"\n"
            f"ถ้าต้องการใช้รหัสผ่านด้วย ให้ตั้งใหม่ได้ที่หน้าตั้งค่าบัญชีหลังเข้าสู่ระบบ\n\n"
            f"ถ้าคุณไม่เคยสมัครบัญชีนี้ด้วยรหัสผ่านมาก่อน แปลว่ามีคนอื่นสมัครด้วยอีเมลของคุณไว้\n"
            f"ระบบตัดเขาออกให้แล้ว แต่กรุณาตรวจข้อมูลในบัญชีและติดต่อทีมงานถ้าพบสิ่งผิดปกติ"
        )
    else:
        body = (
            f"สวัสดีคุณ{full_name}\n\n"
            f"ตอนนี้บัญชีของคุณเข้าสู่ระบบด้วยปุ่ม \"เข้าสู่ระบบด้วย Google\" ได้แล้ว\n\n"
            f"ถ้าคุณเป็นคนทำเอง ไม่ต้องทำอะไรต่อ\n"
            f"ถ้าไม่ใช่ ให้ติดต่อทีมงานทันที"
        )
    return await _deliver(
        to_email, f"บัญชี Google ถูกผูกกับบัญชีของคุณแล้ว — {SERVICE_NAME}", body
    )
