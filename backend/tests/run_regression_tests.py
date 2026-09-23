"""
รันเทสต์ทุกไฟล์ในโฟลเดอร์นี้รวดเดียว

    python tests/run_regression_tests.py

แต่ละไฟล์ถูกรันเป็น process แยก เพราะบางไฟล์ยุ่งกับ sys.modules ตอน stub sqlalchemy
ถ้ารันรวมใน process เดียวจะกวนกันเอง
"""
import os
import subprocess
import sys

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    # Windows redirected consoles may default to cp1252, which cannot print Thai.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    files = sorted(
        f for f in os.listdir(TESTS_DIR)
        if f.startswith("test_") and f.endswith(".py")
    )
    if not files:
        print("ไม่พบไฟล์เทสต์")
        return 1

    failed = []
    for name in files:
        # flush=True จำเป็น ไม่งั้น print ของ process นี้จะค้างใน buffer
        # แล้วโผล่ทีหลัง output ของ subprocess ทำให้อ่านไม่รู้เรื่องว่าอันไหนของไฟล์ไหน
        print(f"\n{'=' * 60}\n{name}\n{'=' * 60}", flush=True)
        result = subprocess.run([sys.executable, "-X", "utf8", os.path.join(TESTS_DIR, name)])
        if result.returncode != 0:
            failed.append(name)

    print(f"\n{'=' * 60}", flush=True)
    if failed:
        print(f"ไม่ผ่าน {len(failed)} จาก {len(files)} ไฟล์: {', '.join(failed)}")
        return 1
    print(f"ผ่านครบทั้ง {len(files)} ไฟล์")
    return 0


if __name__ == "__main__":
    sys.exit(main())
