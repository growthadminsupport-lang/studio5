-- ============================================================
-- Migration — เพิ่ม Google Sign-In
--
-- ใช้กับฐานข้อมูลที่ **สร้างไว้ก่อนหน้านี้แล้ว** ด้วย growth_schema.sql เวอร์ชันเดิม
-- ฐานข้อมูลที่สร้างใหม่ตั้งแต่ต้นด้วย growth_schema.sql ปัจจุบันมีของพวกนี้อยู่แล้ว
-- ไม่ต้องรันไฟล์นี้ (รันซ้ำก็ไม่พัง — ทุกคำสั่งเขียนแบบรันซ้ำได้)
--
-- วิธีรัน ($psql = path ของ psql.exe — ดูหัวข้อ "วิธีรัน database" ใน README)
--   & $psql -h localhost -U postgres -d growth_db `
--       -f migrations\2026-08-22_google_signin.sql
--
-- รันทดสอบแล้วเมื่อ 2026-09-15 กับ PostgreSQL 18.1 — ทั้งกับฐานข้อมูลเปล่าที่สร้างจาก
-- growth_schema.sql ปัจจุบัน (ผ่านแบบ skip ทุกข้อ) ยืนยันว่ารันซ้ำได้จริง
--
-- ไฟล์นี้เปลี่ยนสองอย่าง
--   1. usr_accounts.password_hash ยอมให้เป็น NULL
--      บัญชีที่สมัครผ่าน Google ไม่เคยตั้งรหัสผ่าน จึงไม่มีอะไรจะเก็บ
--   2. เพิ่มตาราง usr_identities เก็บการผูกบัญชีกับผู้ให้บริการภายนอก
--
-- ปลอดภัยกับข้อมูลเดิม: ไม่แตะแถวที่มีอยู่เลย บัญชีเก่าทุกใบยังมี password_hash
-- เหมือนเดิมและเข้าสู่ระบบด้วยรหัสผ่านได้ตามปกติ
-- ============================================================

BEGIN;

-- 1. password_hash เป็น NULL ได้
--    DROP NOT NULL รันซ้ำได้อยู่แล้ว ไม่ error ถ้าถอดไปแล้ว
ALTER TABLE usr_accounts ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN usr_accounts.password_hash IS
    'NULL = บัญชีที่สมัครผ่านผู้ให้บริการภายนอกและยังไม่เคยตั้งรหัสผ่าน '
    'ห้ามใส่ค่าหลอกแทน NULL';

-- 2. ENUM ของผู้ให้บริการ — CREATE TYPE ไม่มี IF NOT EXISTS ต้องดักเอง
DO $$
BEGIN
    CREATE TYPE usr_identity_provider AS ENUM ('google');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- 3. ตารางการผูกบัญชี
--    UNIQUE (provider, subject) กันบัญชี Google ใบเดียวถูกผูกกับผู้ใช้หลายคน
--    UNIQUE (usr_id, provider) กันผู้ใช้คนเดียวผูกกับ Google ซ้ำหลายแถว
CREATE TABLE IF NOT EXISTS usr_identities (
    idn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    provider usr_identity_provider NOT NULL,
    subject VARCHAR(255) NOT NULL,
    email CITEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT uq_usr_identities_provider_subject UNIQUE (provider, subject),
    CONSTRAINT uq_usr_identities_usr_provider UNIQUE (usr_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_usr_identities_usr_id ON usr_identities(usr_id);

COMMIT;

-- ตรวจผลหลังรัน — ควรได้ is_nullable = YES และเจอตาราง usr_identities
SELECT is_nullable AS password_hash_nullable
FROM information_schema.columns
WHERE table_name = 'usr_accounts' AND column_name = 'password_hash';

SELECT to_regclass('public.usr_identities') AS usr_identities_table;
