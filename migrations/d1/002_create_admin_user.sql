-- D1 Migration: Create admin user if it doesn't exist

-- Generate a secure password and salt for the admin user
-- Note: In a real D1 migration, we'd use a script to generate these values
-- For this migration, we'll use placeholder values that will be replaced during the migration process

-- First check if admin user exists
SELECT id FROM users WHERE username = 'admin';

-- If admin doesn't exist, create one with secure password
-- INSERT INTO users (
--   username, 
--   password, 
--   email, 
--   full_name, 
--   is_admin, 
--   is_active, 
--   onboarding_completed, 
--   password_salt, 
--   password_change_required
-- ) 
-- VALUES (
--   'admin',
--   'HASHED_PASSWORD_PLACEHOLDER',
--   'admin@landlordpro.app',
--   'System Administrator',
--   true,
--   true,
--   true,
--   'SALT_PLACEHOLDER',
--   true
-- );

-- D1 supports JavaScript-powered migrations, which will be used to generate
-- proper secure password hashes. This SQL file is a template for the migration.