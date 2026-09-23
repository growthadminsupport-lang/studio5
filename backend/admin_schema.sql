-- ============================================================
-- GrowTH Database Schema — ส่วนหลังบ้าน
-- โปรไฟล์ผู้ดูแลระบบ (adm_) และการจัดการเนื้อหา (cms_)
--
-- รันหลังจาก growth_schema.sql:
--   psql "your_connection_string" -f admin_schema.sql
--
-- ไฟล์นี้รันซ้ำได้ (idempotent) — รันแล้วพังกลางทางก็แก้แล้วรันใหม่ได้เลย
--
-- การตั้งชื่อ (ดูคำอธิบายเต็มใน growth_schema.sql):
--   adm_accounts    adm_id
--   adm_sessions    asn_id
--   adm_audit_logs  aud_id
--   cms_articles    art_id
-- FK ใช้ชื่อเดียวกับคีย์หลักที่ชี้ไปหา — เห็น adm_id ก็รู้ว่าชี้ไป adm_accounts
--
-- หมายเหตุการออกแบบ:
-- - แยก adm_accounts ออกจาก usr_accounts เพราะ usr_accounts เป็นบัญชีผู้ปกครอง
--   ที่ผูกกับ chd_profiles การรวม role ไว้ตารางเดียวจะต้อง filter role ทุก query
--   และเสี่ยงหลุด privilege
-- - adm_sessions แยกจาก usr_sessions ด้วยเหตุผลเดียวกัน + ให้ตั้งอายุ token
--   ของฝั่ง admin สั้นกว่าฝั่งผู้ปกครองได้อิสระ
-- ============================================================

-- growth_schema.sql สร้างไว้แล้ว แต่ประกาศซ้ำกันไฟล์นี้ถูกรันเดี่ยว ๆ
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ENUM ของโดเมนนี้ ใส่คำนำหน้าให้ตรงกับตารางที่ใช้
-- (CREATE TYPE ไม่มี IF NOT EXISTS ต้องห่อ DO block เอง)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adm_role') THEN
        CREATE TYPE adm_role AS ENUM ('superadmin', 'admin', 'editor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_article_status') THEN
        CREATE TYPE cms_article_status AS ENUM ('draft', 'published', 'archived');
    END IF;
END$$;

-- ============================================================
-- adm_ — ผู้ดูแลระบบ
-- ============================================================

-- 12. adm_accounts — โปรไฟล์ผู้ดูแลระบบ
--    superadmin = จัดการ admin คนอื่นได้
--    admin      = จัดการข้อมูลผู้ปกครอง/เด็ก/ข้อมูลอ้างอิง + บทความ
--    editor     = จัดการบทความอย่างเดียว
CREATE TABLE IF NOT EXISTS adm_accounts (
    adm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role adm_role NOT NULL DEFAULT 'editor',   -- least privilege เป็นค่าตั้งต้น
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    -- ชี้กลับมาตารางตัวเอง ตั้งชื่อต่างจาก adm_id เพราะคนละบทบาทกัน
    -- (adm_id = บัญชีนี้คือใคร · created_by_adm_id = ใครเป็นคนสร้างบัญชีนี้)
    created_by_adm_id UUID REFERENCES adm_accounts(adm_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_adm_accounts_email_len CHECK (length(email) <= 255)
);
CREATE INDEX IF NOT EXISTS idx_adm_accounts_role ON adm_accounts(role);

-- 13. adm_sessions — เซสชันการเข้าสู่ระบบของ admin
CREATE TABLE IF NOT EXISTS adm_sessions (
    asn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adm_id UUID NOT NULL REFERENCES adm_accounts(adm_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT chk_adm_sessions_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_adm_sessions_adm_id ON adm_sessions(adm_id);
CREATE INDEX IF NOT EXISTS idx_adm_sessions_expires_at
    ON adm_sessions(expires_at) WHERE revoked_at IS NULL;

-- 14. adm_audit_logs — บันทึกทุกการกระทำของ admin ที่เปลี่ยนแปลงข้อมูล
--     adm_id เป็น SET NULL เพื่อให้ log ไม่หายเมื่อลบบัญชี admin
CREATE TABLE IF NOT EXISTS adm_audit_logs (
    aud_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adm_id UUID REFERENCES adm_accounts(adm_id) ON DELETE SET NULL,
    -- สำเนาอีเมล ณ ขณะลงมือทำ ไม่ใช่อีเมลปัจจุบันของ admin คนนั้น
    -- ชื่อคอลัมน์บอกเจตนานี้ไว้ เพราะ admin เปลี่ยนอีเมลได้แต่ log เก่าต้องคงค่าเดิม
    adm_email_at_action CITEXT NOT NULL,
    action VARCHAR(100) NOT NULL,        -- เช่น 'cms_article.publish', 'usr_account.delete'
    target_table VARCHAR(100),
    target_id UUID,                      -- ชี้ได้ทุกตาราง จึงไม่ใช้ FK และไม่ใส่คำนำหน้า
    detail JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_adm_audit_logs_adm_id ON adm_audit_logs(adm_id);
CREATE INDEX IF NOT EXISTS idx_adm_audit_logs_created_at
    ON adm_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adm_audit_logs_target
    ON adm_audit_logs(target_table, target_id);

-- ============================================================
-- cms_ — เนื้อหา
-- เติมคอลัมน์ที่เกี่ยวกับการจัดการหลังบ้านให้ cms_articles
-- ============================================================

ALTER TABLE cms_articles
    ADD COLUMN IF NOT EXISTS status cms_article_status NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS author_adm_id UUID
        REFERENCES adm_accounts(adm_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_cms_articles_status ON cms_articles(status);

-- บทความเดิมที่มี published_at อยู่แล้วให้ถือว่าเผยแพร่แล้ว
-- (จำกัดที่ status = 'draft' เพื่อไม่ให้รันซ้ำแล้วไปทับของที่ถูก archive ไปแล้ว)
UPDATE cms_articles SET status = 'published'
WHERE published_at IS NOT NULL AND status = 'draft';

-- status กับ published_at ต้องไม่หลุดจากกัน
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_cms_articles_published'
    ) THEN
        ALTER TABLE cms_articles ADD CONSTRAINT chk_cms_articles_published
            CHECK (status <> 'published' OR published_at IS NOT NULL);
    END IF;
END$$;

-- trigger ให้ updated_at ขยับจริงตอน UPDATE
-- (set_updated_at() นิยามไว้ใน growth_schema.sql)
DROP TRIGGER IF EXISTS trg_adm_accounts_updated_at ON adm_accounts;
CREATE TRIGGER trg_adm_accounts_updated_at BEFORE UPDATE ON adm_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_articles_updated_at ON cms_articles;
CREATE TRIGGER trg_cms_articles_updated_at BEFORE UPDATE ON cms_articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Seed: superadmin คนแรก
-- ส่งค่าเข้ามาตอนรัน จะได้ไม่มีรหัสผ่านจริงติดอยู่ใน repo:
--   psql "$DB_URL" -v admin_email="you@example.com" -v admin_pw="รหัสจริง" \
--        -f admin_schema.sql
-- crypt(..., gen_salt('bf', 12)) = bcrypt cost 12 (มากับ pgcrypto)
-- ============================================================
-- \if ของ psql ต่อเงื่อนไขด้วย AND ไม่ได้ ต้องซ้อนสองชั้น
-- ถ้าเช็คแค่ admin_email แล้วผู้ใช้ลืมส่ง admin_pw ตัว :'admin_pw' จะถูกปล่อย
-- ทิ้งไว้ดิบ ๆ กลายเป็น syntax error แทนที่จะได้ข้อความบอกสาเหตุ
\if :{?admin_email}
  \if :{?admin_pw}
INSERT INTO adm_accounts (full_name, email, password_hash, role)
VALUES (
    'System Administrator',
    :'admin_email',
    crypt(:'admin_pw', gen_salt('bf', 12)),
    'superadmin'
)
ON CONFLICT (email) DO NOTHING;
  \else
    \echo '!! ส่ง -v admin_email มาแล้วแต่ขาด -v admin_pw — ยังไม่ได้สร้าง superadmin'
  \endif
\else
  \echo '>> ข้ามการสร้าง superadmin (ไม่ได้ส่ง -v admin_email / -v admin_pw)'
\endif

-- ตรวจรหัสผ่านตอน login:
--   SELECT adm_id, role FROM adm_accounts
--   WHERE email = $1 AND is_active AND password_hash = crypt($2, password_hash);
--
-- เปลี่ยนรหัสผ่านภายหลัง:
--   UPDATE adm_accounts SET password_hash = crypt('รหัสใหม่', gen_salt('bf', 12))
--   WHERE email = 'you@example.com';
