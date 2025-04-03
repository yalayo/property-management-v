ALTER TABLE users ADD COLUMN password_salt TEXT;

ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT false;

ALTER TABLE users ADD COLUMN last_login TIMESTAMP;