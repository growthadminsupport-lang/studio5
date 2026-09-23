"""
ฟังก์ชันด้านความปลอดภัยล้วน — ไม่แตะฐานข้อมูลและไม่ผูกกับ FastAPI
แยกไว้ต่างหากเพื่อให้ทดสอบได้โดยไม่ต้องตั้ง environment อะไรเลย

นโยบายรหัสผ่านอ้างอิง NIST SP 800-63B (Digital Identity Guidelines) ซึ่งเป็น
มาตรฐานที่แอปส่วนใหญ่ยึดตามในปัจจุบัน สาระสำคัญที่ต่างจากความเชื่อเดิม:

  - ความยาวสำคัญกว่าความซับซ้อน  ขั้นต่ำ 8 ตัว รองรับได้ยาว ๆ
  - **ไม่บังคับ** ให้มีตัวใหญ่/ตัวเลข/อักขระพิเศษ เพราะกฎพวกนี้ผลักให้คนตั้ง
    รหัสแบบ Password1! ซึ่งเดาง่ายกว่าวลียาว ๆ ที่จำได้เอง
  - **ไม่บังคับ** เปลี่ยนรหัสตามรอบเวลา ให้เปลี่ยนเมื่อมีเหตุว่าหลุดเท่านั้น
  - **ต้อง** เทียบกับรายการรหัสที่รู้กันว่าโดนเดาบ่อยหรือเคยหลุดมาแล้ว
  - **ต้อง** จำกัดจำนวนครั้งที่เดาผิดได้
"""
import hashlib
import hmac
import secrets
import unicodedata

# bcrypt อ่านแค่ 72 ไบต์แรก ส่วนที่เกินถูกตัดทิ้ง แปลว่ารหัสยาว ๆ ที่ต่างกัน
# เฉพาะท้ายจะกลายเป็นรหัสเดียวกัน จึงต้องปฏิเสธตั้งแต่แรกแทนที่จะปล่อยผ่าน
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72

# ตัวอย่างรหัสที่ติดอันดับต้น ๆ ของรายการรหัสหลุดทุกปี
# ของจริงควรใช้รายการเต็ม (เช่น rockyou หรือ Have I Been Pwned k-anonymity API)
# ที่นี่ฝังไว้ชุดเล็กเพื่อให้ทำงานได้โดยไม่ต้องต่อเน็ตหรือโหลดไฟล์เพิ่ม
COMMON_PASSWORDS = frozenset({
    "password", "password1", "password123", "passw0rd", "p@ssword", "p@ssw0rd",
    "12345678", "123456789", "1234567890", "123123123", "111111111", "000000000",
    "qwertyuiop", "qwerty123", "asdfghjkl", "zxcvbnm123", "1q2w3e4r", "1qaz2wsx",
    "iloveyou", "sunshine", "princess", "football", "baseball", "superman",
    "welcome1", "welcome123", "admin123", "administrator", "letmein1", "letmein123",
    "monkey123", "dragon123", "trustno1", "abc12345", "abcd1234", "a1b2c3d4",
    "changeme", "changeme1", "secret123", "master123", "shadow123", "michael1",
    "thailand", "bangkok123", "somchai123", "12341234", "11223344", "qazwsxedc",
})


class PasswordPolicyError(ValueError):
    """รหัสผ่านไม่ผ่านนโยบาย — ข้อความใน args[0] แสดงให้ผู้ใช้เห็นได้เลย"""


def normalize_password(password: str) -> str:
    """
    NIST กำหนดให้ normalize ข้อความเป็น NFKC ก่อนเสมอ

    ถ้าไม่ทำ ผู้ใช้ที่พิมพ์อักขระเดียวกันคนละวิธี (เช่น สระอาแบบ precomposed
    กับแบบ combining) จะได้ไบต์ต่างกัน แล้วเข้าสู่ระบบไม่ได้ทั้งที่พิมพ์ถูก
    """
    return unicodedata.normalize("NFKC", password)


def validate_password(password: str, email: str = "", full_name: str = "") -> None:
    """
    ตรวจรหัสผ่านตามนโยบาย ผ่านแล้วคืน None ไม่ผ่านให้โยน PasswordPolicyError

    รับ email กับ full_name มาด้วยเพื่อกันไม่ให้ตั้งรหัสเป็นข้อมูลตัวเอง
    ซึ่งเป็นสิ่งแรกที่คนเดารหัสจะลอง
    """
    pw = normalize_password(password)

    if len(pw) < PASSWORD_MIN_LENGTH:
        raise PasswordPolicyError(
            f"รหัสผ่านต้องยาวอย่างน้อย {PASSWORD_MIN_LENGTH} ตัวอักษร"
        )

    # นับเป็นไบต์ ไม่ใช่จำนวนตัวอักษร — ภาษาไทย 1 ตัวใช้ 3 ไบต์
    if len(pw.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise PasswordPolicyError(
            f"รหัสผ่านยาวเกินไป (สูงสุด {PASSWORD_MAX_BYTES} ไบต์ — "
            "ภาษาไทย 1 ตัวนับเป็น 3 ไบต์)"
        )

    if pw.strip() == "":
        raise PasswordPolicyError("รหัสผ่านต้องไม่เป็นช่องว่างทั้งหมด")

    lowered = pw.lower()

    if lowered in COMMON_PASSWORDS:
        raise PasswordPolicyError(
            "รหัสผ่านนี้ติดอยู่ในรายการรหัสที่ถูกเดาบ่อย กรุณาตั้งใหม่"
        )

    # ตัวเดียวซ้ำกันทั้งหมด เช่น aaaaaaaa
    if len(set(pw)) == 1:
        raise PasswordPolicyError("รหัสผ่านต้องไม่ใช่ตัวอักษรเดียวซ้ำกันทั้งหมด")

    # เรียงต่อเนื่อง เช่น 12345678 หรือ abcdefgh
    if _is_sequential(lowered):
        raise PasswordPolicyError("รหัสผ่านต้องไม่ใช่ตัวอักษรหรือตัวเลขเรียงติดกัน")

    if email:
        local_part = email.split("@")[0].lower()
        if len(local_part) >= 4 and local_part in lowered:
            raise PasswordPolicyError("รหัสผ่านต้องไม่มีชื่ออีเมลของตัวเองอยู่ในนั้น")

    if full_name:
        for word in full_name.lower().split():
            if len(word) >= 4 and word in lowered:
                raise PasswordPolicyError("รหัสผ่านต้องไม่มีชื่อของตัวเองอยู่ในนั้น")


def _is_sequential(text: str) -> bool:
    """เช็คว่าอักขระทุกตัวเรียงต่อกันทั้งขึ้นและลง เช่น 1234 หรือ dcba"""
    if len(text) < 4:
        return False
    diffs = {ord(b) - ord(a) for a, b in zip(text, text[1:])}
    return diffs in ({1}, {-1})


# ------------------------------------------------------------
# โทเคนที่ส่งทางอีเมล และ refresh token
# ------------------------------------------------------------

def generate_token(num_bytes: int = 32) -> str:
    """
    สร้างค่าสุ่มที่เดาไม่ได้ด้วย secrets (ใช้ CSPRNG ของระบบปฏิบัติการ)
    ห้ามใช้ random ธรรมดาเพราะคาดเดาลำดับถัดไปได้ถ้ารู้ค่าก่อนหน้า
    """
    return secrets.token_urlsafe(num_bytes)


def hash_token(token: str) -> str:
    """
    เก็บลงฐานข้อมูลแค่ hash ไม่เก็บตัวจริง ฐานข้อมูลรั่วก็สวมรอยไม่ได้

    ใช้ SHA-256 ธรรมดาพอ ไม่ต้อง bcrypt เพราะ token เป็นค่าสุ่ม 256 บิตอยู่แล้ว
    ไม่มีใครไล่เดาไหว ต่างจากรหัสผ่านที่คนตั้งเองซึ่งเดาได้จึงต้องใช้ตัวที่ช้า
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def tokens_equal(a: str, b: str) -> bool:
    """เทียบแบบใช้เวลาคงที่ กันการเดาค่าจากเวลาที่ใช้เปรียบเทียบ"""
    return hmac.compare_digest(a, b)
