-- ============================================================
-- GrowTH Database Schema — ส่วนหลัก
--
-- ── การตั้งชื่อตาราง ──────────────────────────────────────
-- ทุกตารางมีคำนำหน้าบอกโดเมนที่สังกัด
--
--   usr_  บัญชีผู้ปกครองและการเข้าสู่ระบบ
--   chd_  ข้อมูลเด็กและสุขภาพ
--   ref_  ข้อมูลอ้างอิงมาตรฐาน — ไม่ผูกกับผู้ใช้คนไหน ใช้ร่วมกันทั้งระบบ
--   adm_  ผู้ดูแลระบบและหลังบ้าน  (อยู่ใน admin_schema.sql)
--   cms_  เนื้อหาที่เผยแพร่        (อยู่ใน admin_schema.sql)
--
-- ── การตั้งชื่อคีย์ ────────────────────────────────────────
-- ไม่ใช้คอลัมน์ชื่อ "id" ซ้ำกันทุกตาราง เพราะพอเห็นคอลัมน์เดี่ยว ๆ
-- ในไดอะแกรมหรือใน query แล้วแยกไม่ออกว่าเป็น id ของตารางไหน
-- คีย์หลักแต่ละตารางจึงมีชื่อเฉพาะตัว:
--
--   usr_accounts             usr_id
--   usr_sessions             ses_id
--   usr_identities           idn_id
--   usr_password_resets      rst_id
--   usr_login_attempts       att_id
--   chd_profiles             chd_id
--   chd_growth_records       grw_id
--   chd_puberty_screenings   scr_id
--   chd_bone_age_predictions bon_id
--   ref_growth_lms           lms_id
--
-- และ FOREIGN KEY ใช้ "ชื่อเดียวกับคีย์หลักที่มันชี้ไปหา" เป๊ะ ๆ
-- เห็น usr_id ที่ไหนก็รู้ทันทีว่าชี้ไป usr_accounts โดยไม่ต้องเปิดดู
-- ผลพลอยได้คือ join เขียนสั้นลง:
--
--   SELECT * FROM chd_profiles JOIN usr_accounts USING (usr_id);
--   -- แทนที่จะเป็น ON chd_profiles.user_id = usr_accounts.id
--
-- หมายเหตุ:
-- - field "relationship" ใน chd_profiles: เอกสารตารางคอลัมน์ละเอียดทำเครื่องหมาย
--   ตัดออกไว้ชัดเจน แต่เอกสารสรุป schema ระดับสูงยังลิสต์ไว้อยู่ — ไฟล์นี้ยึดตาม
--   เอกสารละเอียด (ตัดออก) เพราะเป็นการตัดสินใจที่ระบุชัดกว่า เพิ่มกลับมาได้ภายหลัง
-- - usr_sessions.usr_id ใช้ ON DELETE CASCADE โดยสมมติ (ไม่ได้ระบุชัดในเอกสาร)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";   -- อีเมลต้องไม่แยกตัวพิมพ์เล็ก-ใหญ่

-- ------------------------------------------------------------
-- ENUM
-- sex_type กับ metric_type ไม่ใส่คำนำหน้า เพราะเป็นคำศัพท์ร่วมที่หลายโดเมนใช้
-- ส่วน ENUM ที่เป็นของโดเมนเดียวจะมีคำนำหน้า (ดู adm_role, cms_article_status)
-- ------------------------------------------------------------
CREATE TYPE sex_type AS ENUM ('male', 'female');
CREATE TYPE metric_type AS ENUM ('height', 'weight', 'bmi');

-- updated_at ไม่ขยับเองแม้ตั้ง DEFAULT now() ไว้ เพราะ DEFAULT ทำงานตอน INSERT
-- เท่านั้น ต้องมี trigger คอยเซ็ตให้ทุกครั้งที่ UPDATE
-- (ฟังก์ชันนี้เป็นของกลาง ไม่สังกัดโดเมนไหน จึงไม่มีคำนำหน้า)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- usr_ — บัญชีผู้ปกครองและการเข้าสู่ระบบ
-- ============================================================

-- 1. usr_accounts — ผู้ใช้งาน (ผู้ปกครอง)
CREATE TABLE usr_accounts (
    usr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email CITEXT UNIQUE NOT NULL,

    -- NULL ได้ตั้งแต่มี Google Sign-In — บัญชีที่สมัครผ่าน Google ไม่เคยตั้งรหัสผ่าน
    -- จึงไม่มีอะไรจะเก็บ ห้ามใส่ค่าหลอกอย่าง '' หรือ '!' แทน เพราะโค้ดฝั่งแอปจะต้อง
    -- มาไล่เดาว่าค่าไหนแปลว่า "ไม่มีรหัสผ่าน" ซึ่งพลาดง่ายและพลาดแล้วอันตราย
    -- ผู้ใช้กลุ่มนี้ตั้งรหัสผ่านทีหลังได้ผ่าน /password/forgot หรือ /password/change
    --
    -- ไม่มี CHECK บังคับว่า "ต้องมีรหัสผ่านหรือไม่ก็มีแถวใน usr_identities"
    -- เพราะ CHECK อ้างข้ามตารางไม่ได้ กติกานี้บังคับที่ routes_auth.py แทน
    password_hash VARCHAR(255),
    phone_number VARCHAR(30),
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    email_verification_required BOOLEAN NOT NULL DEFAULT false,

    -- ใช้ตัดสิทธิ์ access token ที่ออกก่อนหน้าการเปลี่ยนรหัสผ่าน
    -- JWT เพิกถอนกลางคันไม่ได้ แต่ถ้าฝัง timestamp นี้ไว้ใน token แล้วเทียบกับ
    -- ค่าในฐานข้อมูลตอนตรวจสิทธิ์ ก็ทำให้ token เก่าใช้ไม่ได้ทันทีที่เปลี่ยนรหัส
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- กันเดารหัสผ่านแบบยิงรัว
    failed_login_count SMALLINT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- CITEXT ไม่มีลิมิตความยาวในตัว ต้องกำหนดเองแทน VARCHAR(255) เดิม
    CONSTRAINT chk_usr_accounts_email_len CHECK (length(email) <= 255),
    -- ยอมรับเงื่อนไขแล้วต้องมีเวลาที่ยอมรับเสมอ (ใช้อ้างอิงทางกฎหมาย/PDPA)
    CONSTRAINT chk_usr_accounts_terms
        CHECK (terms_accepted = false OR terms_accepted_at IS NOT NULL),
    CONSTRAINT chk_usr_accounts_failed_count CHECK (failed_login_count >= 0)
);
CREATE TRIGGER trg_usr_accounts_updated_at BEFORE UPDATE ON usr_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. usr_sessions — เซสชัน (refresh token) ของผู้ปกครอง
--
-- family_id คือกลุ่มของ token ที่สืบทอดกันมาจากการเข้าสู่ระบบครั้งเดียว
-- ทุกครั้งที่ขอ access token ใหม่ เราจะออก refresh token ใบใหม่แล้วยกเลิกใบเก่า
-- (rotation) ถ้าวันหนึ่งมีคนเอา "ใบเก่าที่ถูกยกเลิกไปแล้ว" กลับมาใช้
-- แปลว่ามีคนขโมย token ไป — ระบบจะยกเลิกทั้ง family ทิ้งทันที
-- ไม่ใช่แค่ปฏิเสธใบนั้นใบเดียว (ตาม OAuth 2.0 Security BCP)
CREATE TABLE usr_sessions (
    ses_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    replaced_by_ses_id UUID REFERENCES usr_sessions(ses_id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT chk_usr_sessions_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idx_usr_sessions_usr_id ON usr_sessions(usr_id);
CREATE INDEX idx_usr_sessions_family_id ON usr_sessions(family_id);
-- ใช้ตอนกวาดเซสชันหมดอายุทิ้ง
CREATE INDEX idx_usr_sessions_expires_at
    ON usr_sessions(expires_at) WHERE revoked_at IS NULL;

-- 3. usr_identities — บัญชีจากผู้ให้บริการภายนอกที่ผูกกับ usr_accounts
--
-- ทำไมต้องแยกตาราง ไม่เก็บ google_sub เป็นคอลัมน์ใน usr_accounts
--   - ผู้ใช้คนเดียวผูกได้หลายผู้ให้บริการ วันหน้าเพิ่ม Apple/LINE ได้โดยไม่แตะตารางหลัก
--   - subject ของคนละผู้ให้บริการไม่รับประกันว่าไม่ชนกัน UNIQUE จึงต้องเป็นคู่
--     (provider, subject) ไม่ใช่ subject เดี่ยว
--
-- subject คือ `sub` ที่ผู้ให้บริการให้มา = id ถาวรของผู้ใช้ฝั่งเขา ไม่เปลี่ยนแม้
-- เจ้าตัวจะเปลี่ยนอีเมล จึงใช้ค่านี้เป็นตัวจับคู่บัญชี **ห้ามใช้อีเมลเป็นตัวจับคู่หลัก**
-- เพราะอีเมลเปลี่ยนได้และเคยถูกนำกลับมาใช้ซ้ำ
CREATE TYPE usr_identity_provider AS ENUM ('google');

CREATE TABLE usr_identities (
    idn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    provider usr_identity_provider NOT NULL,
    subject VARCHAR(255) NOT NULL,
    -- อีเมลที่ผู้ให้บริการรายงานมา เก็บไว้สอบย้อนเฉย ๆ ไม่ใช่ตัวตัดสินสิทธิ์
    -- ค่าที่ใช้จริงคือ usr_accounts.email
    email CITEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    -- บัญชี Google หนึ่งใบผูกกับผู้ใช้ในระบบเราได้คนเดียว ถ้าไม่มีข้อนี้
    -- คนเดียวจะเอาบัญชี Google ใบเดิมไปผูกกับหลายบัญชีในระบบเราได้
    CONSTRAINT uq_usr_identities_provider_subject UNIQUE (provider, subject),
    -- และผู้ใช้หนึ่งคนผูกกับผู้ให้บริการรายเดิมได้ครั้งเดียว
    CONSTRAINT uq_usr_identities_usr_provider UNIQUE (usr_id, provider)
);
CREATE INDEX idx_usr_identities_usr_id ON usr_identities(usr_id);

-- New password registrations require email proof. Existing rows are exempt in the migration.
CREATE TABLE usr_email_verifications (
    ver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);
CREATE INDEX idx_usr_email_verifications_usr_id ON usr_email_verifications(usr_id);

-- 4. usr_password_resets — โทเคนตั้งรหัสผ่านใหม่ ใช้ได้ครั้งเดียว
--    เก็บแค่ hash เหมือน refresh token — ฐานข้อมูลรั่วก็เอาไปใช้ต่อไม่ได้
--
--    โทเคนรีเซ็ตรหัสผ่านแยกจาก usr_email_verifications เพื่อให้แต่ละขั้นตอน
--    มีอายุและเงื่อนไขการใช้ต่างกันโดยไม่ปะปนกัน
CREATE TABLE usr_password_resets (
    rst_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    CONSTRAINT chk_usr_password_resets_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idx_usr_password_resets_usr_id ON usr_password_resets(usr_id);

-- 5. usr_login_attempts — บันทึกความพยายามเข้าสู่ระบบ
--    ใช้ทั้งจำกัดอัตราการยิง (rate limit) และสอบย้อนหลังเวลามีเหตุ
--    เก็บ email เป็นข้อความเปล่า ไม่ใช่ FK เพราะต้องบันทึกการยิงใส่อีเมล
--    ที่ไม่มีอยู่จริงด้วย ซึ่งเป็นสัญญาณของการกวาดหาบัญชี
CREATE TABLE usr_login_attempts (
    att_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL,
    ip_address INET,
    succeeded BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usr_login_attempts_email ON usr_login_attempts(email, attempted_at DESC);
CREATE INDEX idx_usr_login_attempts_ip ON usr_login_attempts(ip_address, attempted_at DESC);

-- ============================================================
-- chd_ — ข้อมูลเด็กและสุขภาพ
-- ทุกตารางในกลุ่มนี้ผูกกับ chd_profiles ผ่าน chd_id
-- และหายตามเมื่อลบโปรไฟล์เด็ก
-- ============================================================

-- 6. chd_profiles — โปรไฟล์เด็ก
CREATE TABLE chd_profiles (
    chd_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sex sex_type NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chd_profiles_usr_id ON chd_profiles(usr_id);
CREATE TRIGGER trg_chd_profiles_updated_at BEFORE UPDATE ON chd_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. chd_growth_records — บันทึกการเจริญเติบโต
CREATE TABLE chd_growth_records (
    grw_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chd_id UUID NOT NULL REFERENCES chd_profiles(chd_id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    height_cm NUMERIC(5,2) NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    bmi NUMERIC(5,2),
    height_percentile NUMERIC(5,2),
    height_sds NUMERIC(5,3),
    weight_percentile NUMERIC(5,2),
    weight_sds NUMERIC(5,3),
    bmi_percentile NUMERIC(5,2),
    bmi_sds NUMERIC(5,3),
    guidance_message TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chd_id, measurement_date),
    CONSTRAINT chk_chd_growth_records_measurements
        CHECK (height_cm > 0 AND weight_kg > 0),
    CONSTRAINT chk_chd_growth_records_percentiles CHECK (
        (height_percentile IS NULL OR height_percentile BETWEEN 0 AND 100) AND
        (weight_percentile IS NULL OR weight_percentile BETWEEN 0 AND 100) AND
        (bmi_percentile    IS NULL OR bmi_percentile    BETWEEN 0 AND 100)
    )
);
CREATE INDEX idx_chd_growth_records_chd_id ON chd_growth_records(chd_id);

-- 8. chd_puberty_screenings — แบบคัดกรองวัยเจริญพันธุ์
CREATE TABLE chd_puberty_screenings (
    scr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chd_id UUID NOT NULL REFERENCES chd_profiles(chd_id) ON DELETE CASCADE,
    screening_date DATE NOT NULL,
    responses JSONB NOT NULL,
    result_summary TEXT,
    recommended_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chd_puberty_screenings_chd_id
    ON chd_puberty_screenings(chd_id);

-- 9. chd_bone_age_predictions — ผลทำนายอายุกระดูกจากภาพ x-ray
CREATE TABLE chd_bone_age_predictions (
    bon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chd_id UUID NOT NULL REFERENCES chd_profiles(chd_id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    image_path TEXT NOT NULL,
    predicted_months NUMERIC(6,2) NOT NULL,
    margin_error NUMERIC(5,2),
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chd_bone_age_predictions_chd_id
    ON chd_bone_age_predictions(chd_id);

-- ============================================================
-- ref_ — ข้อมูลอ้างอิงมาตรฐาน
-- ไม่มี FK เชื่อมกับใคร แต่มีผลกับการคำนวณของเด็กทุกคน
-- คำนำหน้า ref_ ทำให้เห็นชัดว่านี่คือ master data ไม่ใช่ข้อมูลของผู้ใช้
-- ชื่อเดิม growth_reference_data ดูใกล้เคียงกับ growth_records มากเกินไป
-- ทั้งที่คนละบทบาทกันสิ้นเชิง
-- ============================================================

-- 10. ref_growth_lms — ค่า L, M, S สำหรับคำนวณ percentile/SDS
CREATE TABLE ref_growth_lms (
    lms_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sex sex_type NOT NULL,
    age_months INTEGER NOT NULL,
    metric_type metric_type NOT NULL,
    l_value DOUBLE PRECISION NOT NULL,
    m_value DOUBLE PRECISION NOT NULL,
    s_value DOUBLE PRECISION NOT NULL,
    UNIQUE (sex, age_months, metric_type),
    CONSTRAINT chk_ref_growth_lms_age CHECK (age_months >= 0),
    -- สูตร SDS คือ ((X/M)^L - 1) / (L*S)  [L=0 ใช้ ln(X/M)/S]
    -- ทั้ง M และ S ต้องเป็นบวกเสมอ ไม่งั้นหารด้วยศูนย์หรือได้ค่าไร้ความหมาย
    CONSTRAINT chk_ref_growth_lms_values CHECK (m_value > 0 AND s_value > 0)
);

-- ============================================================
-- cms_ — เนื้อหาที่เผยแพร่
-- สร้างโครงพื้นฐานไว้ตรงนี้ ส่วนคอลัมน์ที่เกี่ยวกับ admin (สถานะ, ผู้เขียน)
-- ถูกเติมใน admin_schema.sql เพราะเกิดขึ้นพร้อมกับระบบหลังบ้าน
-- ============================================================

-- 11. cms_articles — บทความให้ความรู้
CREATE TABLE cms_articles (
    art_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(100),
    summary TEXT,
    content TEXT,
    source_attribution TEXT,
    published_at TIMESTAMPTZ
);
