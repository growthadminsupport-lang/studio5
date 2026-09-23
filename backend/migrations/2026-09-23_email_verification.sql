-- Apply to databases created before email verification was introduced.
-- Existing accounts remain accessible, without being falsely marked verified.
BEGIN;
ALTER TABLE usr_accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE usr_accounts ADD COLUMN IF NOT EXISTS email_verification_required BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS usr_email_verifications (
    ver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id UUID NOT NULL REFERENCES usr_accounts(usr_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_usr_email_verifications_usr_id ON usr_email_verifications(usr_id);
COMMIT;
