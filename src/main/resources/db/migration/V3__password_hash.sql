-- V3: password storage for real authentication
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
UPDATE users SET password_hash = 'PENDING_SET_BY_ADMIN' WHERE password_hash IS NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
