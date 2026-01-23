ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
-- Default password for existing users (if any) could be set here, or handled in app logic.