-- Preserve accounts and proof-of-ownership timestamps; remove the registration gate.
UPDATE usr_accounts SET email_verification_required = false
WHERE email_verification_required = true;
UPDATE usr_email_verifications SET used_at = now() WHERE used_at IS NULL;
