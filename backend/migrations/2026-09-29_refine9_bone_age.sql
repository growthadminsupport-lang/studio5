BEGIN;
ALTER TABLE chd_bone_age_predictions ALTER COLUMN predicted_months DROP NOT NULL;
ALTER TABLE chd_bone_age_predictions
    ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS image_data BYTEA,
    ADD COLUMN IF NOT EXISTS image_type VARCHAR(20);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bone_age_status'
                   AND conrelid = 'chd_bone_age_predictions'::regclass) THEN
        ALTER TABLE chd_bone_age_predictions ADD CONSTRAINT chk_bone_age_status
            CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'));
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_bone_age_result'
                   AND conrelid = 'chd_bone_age_predictions'::regclass) THEN
        ALTER TABLE chd_bone_age_predictions ADD CONSTRAINT chk_bone_age_result
            CHECK (status <> 'COMPLETED' OR predicted_months IS NOT NULL);
    END IF;
END $$;
UPDATE chd_bone_age_predictions SET completed_at = created_at WHERE status = 'COMPLETED' AND completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bone_age_pending ON chd_bone_age_predictions (chd_id) WHERE status = 'PENDING';
COMMIT;
