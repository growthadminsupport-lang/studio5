-- ============================================================
-- ตรวจว่า constraint / trigger / CASCADE ในสคีมาทำงานจริงตามที่ออกแบบไว้
--
-- รัน:
--   psql -h localhost -U postgres -d growth_db -f tests/schema_smoke_test.sql
--
-- สคริปต์นี้ห่อทั้งหมดไว้ใน transaction แล้ว ROLLBACK ตอนจบ
-- ฐานข้อมูลจึงกลับสู่สภาพเดิมเสมอ รันซ้ำได้ไม่จำกัด
--
-- แต่ละเคสที่ "ต้อง error" ใช้ DO block ดักด้วย EXCEPTION
-- ถ้าคำสั่งผ่านไปได้ทั้งที่ควรพัง = ถือว่าไม่ผ่าน
-- ============================================================

\set ON_ERROR_STOP on

-- ============================================================
-- ส่วนที่ 1 — trigger updated_at
--
-- ต้องแยกออกมาทดสอบนอก transaction หลัก เพราะ now() ของ PostgreSQL
-- คืน "เวลาที่ transaction เริ่ม" ไม่ใช่เวลาปัจจุบัน ถ้า INSERT กับ UPDATE
-- อยู่ใน transaction เดียวกัน ทั้งคู่จะได้เวลาเท่ากันเป๊ะ แล้วเทสต์จะ
-- ฟ้องว่า trigger ไม่ทำงานทั้งที่จริง ๆ ทำงานถูก
--
-- ในการใช้งานจริงไม่มีปัญหานี้ เพราะ INSERT กับ UPDATE คนละคำขอกันเสมอ
-- ============================================================
\echo ''
\echo '--- ส่วนที่ 1: trigger updated_at (แต่ละคำสั่งเป็นคนละ transaction) ---'

DELETE FROM usr_accounts WHERE email = 'trigger-test@local';

INSERT INTO usr_accounts (full_name, email, password_hash)
VALUES ('ทดสอบ trigger', 'trigger-test@local', 'hash');

SELECT pg_sleep(0.05);

UPDATE usr_accounts SET full_name = 'ทดสอบ trigger แก้แล้ว' WHERE email = 'trigger-test@local';

SELECT
    CASE WHEN updated_at > created_at THEN 'ok  ' ELSE 'FAIL' END AS "ผล",
    'TRIGGER: updated_at ต้องขยับหลัง UPDATE'                    AS "รายการ",
    'created=' || created_at || '  updated=' || updated_at        AS "รายละเอียด"
FROM usr_accounts WHERE email = 'trigger-test@local';

DELETE FROM usr_accounts WHERE email = 'trigger-test@local';

-- ============================================================
-- ส่วนที่ 2 — constraint / CASCADE / ค่าตั้งต้น
-- ห่อไว้ใน transaction เดียวแล้ว ROLLBACK ตอนจบ
-- ============================================================
\echo ''
\echo '--- ส่วนที่ 2: constraint, CASCADE, ค่าตั้งต้น ---'

BEGIN;

CREATE TEMP TABLE _result (
    seq    SERIAL,
    name   TEXT,
    passed BOOLEAN,
    detail TEXT
);

-- id คงที่ เพื่อให้อ้างถึงข้ามคำสั่งได้โดยไม่ต้องส่งตัวแปร
\set uid   '''11111111-1111-1111-1111-111111111111'''
\set uid2  '''22222222-2222-2222-2222-222222222222'''
\set cid   '''33333333-3333-3333-3333-333333333333'''
\set aid   '''44444444-4444-4444-4444-444444444444'''

-- ------------------------------------------------------------
-- เตรียมข้อมูลตั้งต้น
-- ------------------------------------------------------------
INSERT INTO usr_accounts (usr_id, full_name, email, password_hash, terms_accepted, terms_accepted_at)
VALUES (:uid, 'สมชาย ทดสอบ', 'Somchai@Mail.com', 'hash', true, now());

INSERT INTO chd_profiles (chd_id, usr_id, name, sex, date_of_birth)
VALUES (:cid, :uid, 'น้องเอ', 'male', DATE '2020-01-01');

INSERT INTO chd_growth_records (chd_id, measurement_date, height_cm, weight_kg)
VALUES (:cid, DATE '2024-01-01', 110.0, 20.0);

INSERT INTO usr_sessions (usr_id, family_id, token_hash, expires_at)
VALUES (:uid, gen_random_uuid(), 'token-hash-1', now() + INTERVAL '7 days');

INSERT INTO usr_identities (usr_id, provider, subject, email)
VALUES (:uid, 'google', 'google-sub-12345', 'somchai@mail.com');

-- ------------------------------------------------------------
-- 1. CITEXT — อีเมลต้องไม่แยกตัวพิมพ์เล็ก-ใหญ่
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO usr_accounts (full_name, email, password_hash)
    VALUES ('คนซ้ำ', 'somchai@mail.com', 'hash');   -- ตัวพิมพ์ต่างจากที่มีอยู่
    INSERT INTO _result(name, passed, detail)
    VALUES ('CITEXT: สมัครอีเมลเดิมด้วยตัวพิมพ์ต่างกันต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CITEXT: สมัครอีเมลเดิมด้วยตัวพิมพ์ต่างกันต้องไม่ได้', true, 'unique_violation ตามคาด');
END$$;

-- ค้นด้วยตัวพิมพ์ที่ต่างกันต้องเจอแถวเดิม
INSERT INTO _result(name, passed, detail)
SELECT 'CITEXT: ค้นด้วยตัวพิมพ์ต่างกันต้องเจอแถวเดิม',
       count(*) = 1,
       'เจอ ' || count(*) || ' แถว'
FROM usr_accounts WHERE email = 'SOMCHAI@MAIL.COM';

-- ------------------------------------------------------------
-- 2. chk_usr_accounts_terms — ยอมรับเงื่อนไขแล้วต้องมีเวลากำกับ
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO usr_accounts (full_name, email, password_hash, terms_accepted, terms_accepted_at)
    VALUES ('ไม่มีเวลา', 'noterms@mail.com', 'hash', true, NULL);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: terms_accepted=true แต่ไม่มี terms_accepted_at ต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: terms_accepted=true แต่ไม่มี terms_accepted_at ต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 3. chk_usr_accounts_email_len — CITEXT ไม่มีลิมิตในตัว ต้องคุมด้วย CHECK
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO usr_accounts (full_name, email, password_hash)
    VALUES ('อีเมลยาว', repeat('a', 250) || '@example.com', 'hash');
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: อีเมลยาวเกิน 255 ตัวต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: อีเมลยาวเกิน 255 ตัวต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 4. chk_usr_sessions_expiry — วันหมดอายุต้องอยู่หลังวันสร้าง
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO usr_sessions (usr_id, family_id, token_hash, created_at, expires_at)
    VALUES ('11111111-1111-1111-1111-111111111111', gen_random_uuid(),
            'token-bad', now(), now() - INTERVAL '1 day');
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: เซสชันหมดอายุก่อนวันสร้างต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: เซสชันหมดอายุก่อนวันสร้างต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 5. chk_chd_growth_records_measurements — ส่วนสูง/น้ำหนักต้องมากกว่า 0
--    (ตัวเดียวกับที่กัน ZeroDivisionError ในสูตร BMI ฝั่ง Python)
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO chd_growth_records (chd_id, measurement_date, height_cm, weight_kg)
    VALUES ('33333333-3333-3333-3333-333333333333', DATE '2024-02-01', 0, 20.0);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: ส่วนสูง 0 ต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: ส่วนสูง 0 ต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 6. chk_chd_growth_records_percentiles — percentile ต้องอยู่ในช่วง 0-100
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO chd_growth_records (chd_id, measurement_date, height_cm, weight_kg, height_percentile)
    VALUES ('33333333-3333-3333-3333-333333333333', DATE '2024-03-01', 110.0, 20.0, 150.0);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: percentile 150 ต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: percentile 150 ต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- percentile ที่ขอบพอดี (0 กับ 100) ต้องใส่ได้
DO $$
BEGIN
    INSERT INTO chd_growth_records (chd_id, measurement_date, height_cm, weight_kg,
                                height_percentile, weight_percentile)
    VALUES ('33333333-3333-3333-3333-333333333333', DATE '2024-04-01', 110.0, 20.0, 0, 100);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: percentile 0 และ 100 ต้องใส่ได้', true, 'ใส่ได้ตามคาด');
EXCEPTION WHEN others THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: percentile 0 และ 100 ต้องใส่ได้', false, SQLERRM);
END$$;

-- ------------------------------------------------------------
-- 7. UNIQUE (chd_id, measurement_date) — เด็กหนึ่งคนบันทึกได้วันละครั้ง
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO chd_growth_records (chd_id, measurement_date, height_cm, weight_kg)
    VALUES ('33333333-3333-3333-3333-333333333333', DATE '2024-01-01', 111.0, 21.0);
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: เด็กคนเดิม วันเดิม ซ้ำไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: เด็กคนเดิม วันเดิม ซ้ำไม่ได้', true, 'unique_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 8. chk_ref_growth_lms_values — M และ S เป็นตัวหารในสูตร SDS ห้ามเป็น 0
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO ref_growth_lms (sex, age_months, metric_type, l_value, m_value, s_value)
    VALUES ('male', 24, 'height', 1.0, 100.0, 0.0);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: s_value = 0 ต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: s_value = 0 ต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

DO $$
BEGIN
    INSERT INTO ref_growth_lms (sex, age_months, metric_type, l_value, m_value, s_value)
    VALUES ('male', -1, 'height', 1.0, 100.0, 0.04);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: age_months ติดลบต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: age_months ติดลบต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

-- ------------------------------------------------------------
-- 9. Google Sign-In — usr_identities UNIQUE + password_hash เป็น NULL ได้
--    (เพิ่มพร้อมกับฟีเจอร์ Google Sign-In — ดู usr_identities ใน growth_schema.sql
--    และ Identity ใน models.py)
-- ------------------------------------------------------------
INSERT INTO usr_accounts (usr_id, full_name, email, password_hash)
VALUES (:uid2, 'สมหญิง ทดสอบ', 'somying@mail.com', 'hash');

-- (provider, subject) ต้องไม่ซ้ำข้ามบัญชี — กันบัญชี Google ใบเดียวถูกผูกกับ
-- ผู้ใช้ในระบบเราสองคน
DO $$
BEGIN
    INSERT INTO usr_identities (usr_id, provider, subject, email)
    VALUES ('22222222-2222-2222-2222-222222222222', 'google', 'google-sub-12345', 'somying@mail.com');
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: (provider, subject) ที่ผูกกับผู้ใช้อื่นแล้วผูกซ้ำต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: (provider, subject) ที่ผูกกับผู้ใช้อื่นแล้วผูกซ้ำต้องไม่ได้', true, 'unique_violation ตามคาด');
END$$;

-- (usr_id, provider) ต้องไม่ซ้ำ — ผู้ใช้คนเดียวผูกบัญชี Google ได้แค่ใบเดียว
DO $$
BEGIN
    -- ใช้ค่าตรง ๆ ไม่ใช่ :uid — psql ไม่แทนตัวแปรในบล็อก DO (dollar-quoted)
    -- และห้ามพิมพ์เครื่องหมายดอลลาร์คู่ในคอมเมนต์ข้างในบล็อกด้วย เพราะจะปิดบล็อกก่อนเวลา
    INSERT INTO usr_identities (usr_id, provider, subject, email)
    VALUES ('11111111-1111-1111-1111-111111111111', 'google', 'google-sub-different', 'somchai@mail.com');
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: ผู้ใช้คนเดิมผูกบัญชี Google ซ้ำสองใบต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN unique_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('UNIQUE: ผู้ใช้คนเดิมผูกบัญชี Google ซ้ำสองใบต้องไม่ได้', true, 'unique_violation ตามคาด');
END$$;

-- password_hash เป็น NULL ได้ตั้งแต่มี Google Sign-In — บัญชีที่สมัครผ่าน Google
-- ไม่เคยตั้งรหัสผ่าน (ก่อนหน้านี้คอลัมน์นี้เป็น NOT NULL)
DO $$
BEGIN
    INSERT INTO usr_accounts (full_name, email, password_hash)
    VALUES ('สมัครผ่าน Google', 'googleonly@mail.com', NULL);
    INSERT INTO _result(name, passed, detail)
    VALUES ('NULLABLE: password_hash เป็น NULL ได้ (บัญชีสมัครผ่าน Google)', true, 'ใส่ได้ตามคาด');
EXCEPTION WHEN others THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('NULLABLE: password_hash เป็น NULL ได้ (บัญชีสมัครผ่าน Google)', false, SQLERRM);
END$$;

DELETE FROM usr_accounts WHERE email = 'googleonly@mail.com';

-- ------------------------------------------------------------
-- 10. ON DELETE CASCADE — ลบผู้ปกครองแล้วข้อมูลเด็กต้องหายตามครบ
-- ------------------------------------------------------------
DO $$
DECLARE
    n_children   INTEGER;
    n_records    INTEGER;
    n_sessions   INTEGER;
    n_identities INTEGER;
BEGIN
    DELETE FROM usr_accounts WHERE usr_id = '11111111-1111-1111-1111-111111111111';

    SELECT count(*) INTO n_children FROM chd_profiles
    WHERE usr_id = '11111111-1111-1111-1111-111111111111';
    SELECT count(*) INTO n_records FROM chd_growth_records
    WHERE chd_id = '33333333-3333-3333-3333-333333333333';
    SELECT count(*) INTO n_sessions FROM usr_sessions
    WHERE usr_id = '11111111-1111-1111-1111-111111111111';
    SELECT count(*) INTO n_identities FROM usr_identities
    WHERE usr_id = '11111111-1111-1111-1111-111111111111';

    INSERT INTO _result(name, passed, detail)
    VALUES ('CASCADE: ลบผู้ปกครองแล้ว chd_profiles/chd_growth_records/usr_sessions/usr_identities ต้องหายหมด',
            n_children = 0 AND n_records = 0 AND n_sessions = 0 AND n_identities = 0,
            'เหลือ chd_profiles=' || n_children || ' chd_growth_records=' || n_records ||
            ' usr_sessions=' || n_sessions || ' usr_identities=' || n_identities);
END$$;

-- ------------------------------------------------------------
-- 11. chk_cms_articles_published — status กับ published_at ต้องไม่หลุดจากกัน
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO cms_articles (title, status, published_at)
    VALUES ('บทความไม่มีวันเผยแพร่', 'published', NULL);
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: status=published แต่ไม่มี published_at ต้องไม่ได้', false, 'ผ่านไปได้ทั้งที่ควรพัง');
EXCEPTION WHEN check_violation THEN
    INSERT INTO _result(name, passed, detail)
    VALUES ('CHECK: status=published แต่ไม่มี published_at ต้องไม่ได้', true, 'check_violation ตามคาด');
END$$;

INSERT INTO cms_articles (title) VALUES ('บทความร่าง');

INSERT INTO _result(name, passed, detail)
SELECT 'DEFAULT: บทความใหม่ต้องเป็น draft',
       status = 'draft',
       'status = ' || status::text
FROM cms_articles WHERE title = 'บทความร่าง';

-- ------------------------------------------------------------
-- 12. adm_accounts — role ตั้งต้นต้องเป็น editor (least privilege)
-- ------------------------------------------------------------
INSERT INTO adm_accounts (adm_id, full_name, email, password_hash)
VALUES (:aid, 'แอดมินทดสอบ', 'admin@test.local', crypt('secret123', gen_salt('bf', 4)));

INSERT INTO _result(name, passed, detail)
SELECT 'DEFAULT: admin ใหม่ต้องได้ role = editor',
       role = 'editor',
       'role = ' || role::text
FROM adm_accounts WHERE adm_id = :aid;

-- ------------------------------------------------------------
-- 13. bcrypt — ตรวจรหัสผ่านด้วย crypt() ต้องทำงาน
-- ------------------------------------------------------------
INSERT INTO _result(name, passed, detail)
SELECT 'bcrypt: รหัสถูกต้องต้องผ่าน / รหัสผิดต้องไม่ผ่าน',
       bool_and(ok),
       'ถูก=' || (SELECT count(*) FROM adm_accounts
                  WHERE adm_id = '44444444-4444-4444-4444-444444444444'
                    AND password_hash = crypt('secret123', password_hash))
FROM (
    SELECT (password_hash = crypt('secret123', password_hash)) AS ok FROM adm_accounts WHERE adm_id = :aid
    UNION ALL
    SELECT (password_hash <> crypt('wrongpass', password_hash)) AS ok FROM adm_accounts WHERE adm_id = :aid
) AS t;

-- รหัสผ่านต้องไม่ถูกเก็บเป็นข้อความธรรมดา
INSERT INTO _result(name, passed, detail)
SELECT 'bcrypt: password_hash ต้องไม่ใช่รหัสจริง',
       password_hash <> 'secret123' AND password_hash LIKE '$2%',
       left(password_hash, 7) || '...'
FROM adm_accounts WHERE adm_id = :aid;

-- ------------------------------------------------------------
-- 14. ON DELETE SET NULL — ลบ admin แล้ว audit log ต้องอยู่ต่อ
-- ------------------------------------------------------------
INSERT INTO adm_audit_logs (adm_id, adm_email_at_action, action, target_table)
VALUES (:aid, 'admin@test.local', 'cms_article.publish', 'cms_articles');

DO $$
DECLARE
    n_logs   INTEGER;
    kept_id  UUID;
    kept_mail CITEXT;
BEGIN
    DELETE FROM adm_accounts WHERE adm_id = '44444444-4444-4444-4444-444444444444';

    SELECT count(*) INTO n_logs FROM adm_audit_logs WHERE action = 'cms_article.publish';
    SELECT adm_id, adm_email_at_action INTO kept_id, kept_mail
    FROM adm_audit_logs WHERE action = 'cms_article.publish';

    INSERT INTO _result(name, passed, detail)
    VALUES ('SET NULL: ลบ admin แล้ว log ต้องอยู่ต่อ และยังรู้ว่าใครทำ',
            n_logs = 1 AND kept_id IS NULL AND kept_mail = 'admin@test.local',
            'log=' || n_logs || ' adm_id=' || coalesce(kept_id::text, 'NULL') ||
            ' adm_email_at_action=' || coalesce(kept_mail::text, 'NULL'));
END$$;

-- ------------------------------------------------------------
-- 15. ตรวจโครงสร้าง — จำนวนตารางและ ENUM
-- ------------------------------------------------------------
INSERT INTO _result(name, passed, detail)
SELECT 'โครงสร้าง: ต้องมี 14 ตาราง', count(*) = 14, 'พบ ' || count(*) || ' ตาราง'
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

INSERT INTO _result(name, passed, detail)
SELECT 'โครงสร้าง: ต้องมี 5 ENUM', count(*) = 5, 'พบ ' || count(*) || ' ตัว'
FROM pg_type WHERE typtype = 'e'
  AND typname IN ('sex_type', 'metric_type', 'usr_identity_provider', 'adm_role', 'cms_article_status');

-- ระบบเลิกบังคับยืนยันอีเมลแล้ว ของที่เกี่ยวข้องต้องถูกลบออกให้หมด ไม่ใช่แค่เลิกเรียกใช้
INSERT INTO _result(name, passed, detail)
SELECT 'ล้างของเก่า: ต้องไม่มี ENUM usr_token_purpose แล้ว', count(*) = 0, 'พบ ' || count(*) || ' ตัว'
FROM pg_type WHERE typtype = 'e' AND typname = 'usr_token_purpose';

INSERT INTO _result(name, passed, detail)
SELECT 'ล้างของเก่า: ต้องไม่มีคอลัมน์ email_verified_at แล้ว', count(*) = 0, 'พบ ' || count(*) || ' คอลัมน์'
FROM information_schema.columns
WHERE table_name = 'usr_accounts' AND column_name = 'email_verified_at';

INSERT INTO _result(name, passed, detail)
SELECT 'ล้างของเก่า: usr_auth_tokens ต้องถูกเปลี่ยนชื่อเป็น usr_password_resets',
       count(*) FILTER (WHERE table_name = 'usr_auth_tokens') = 0
       AND count(*) FILTER (WHERE table_name = 'usr_password_resets') = 1,
       'auth_tokens=' || count(*) FILTER (WHERE table_name = 'usr_auth_tokens') ||
       ' password_resets=' || count(*) FILTER (WHERE table_name = 'usr_password_resets')
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('usr_auth_tokens', 'usr_password_resets');

INSERT INTO _result(name, passed, detail)
SELECT 'โครงสร้าง: ต้องมี trigger updated_at 4 ตัว', count(*) = 4, 'พบ ' || count(*) || ' ตัว'
FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE '%updated_at';

-- ------------------------------------------------------------
-- สรุปผล
-- ------------------------------------------------------------
\echo ''
\echo '================ ผลการตรวจ ================'
SELECT
    CASE WHEN passed THEN 'ok  ' ELSE 'FAIL' END AS "ผล",
    name AS "รายการ",
    detail AS "รายละเอียด"
FROM _result ORDER BY seq;

SELECT
    count(*)                             AS "ทั้งหมด",
    count(*) FILTER (WHERE passed)       AS "ผ่าน",
    count(*) FILTER (WHERE NOT passed)   AS "ไม่ผ่าน"
FROM _result;

ROLLBACK;
