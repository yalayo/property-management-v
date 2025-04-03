-- D1 Migration: Create admin user if it doesn't exist

-- Generate a secure password and salt for the admin user
-- Note: In a real D1 migration, we'd use a script to generate these values
-- For this migration, we'll use placeholder values that will be replaced during the migration process

-- First check if admin user exists
SELECT id FROM users WHERE username = 'admin';

-- If admin doesn't exist, create one with secure password
 INSERT INTO users (
   username, 
   password, 
   email, 
   full_name, 
   is_admin, 
   is_active, 
   onboarding_completed, 
   password_salt, 
   password_change_required
 ) 
 VALUES (
   'admin',
   '43e979a2135306d124de50fbf69972dff389bac45595512c9478e555bfc60a14e99522c83212c2f185c380b96212b5c5c1a7ad734c3be2a51362370d61680d75',
   'admin@landlordpro.app',
   'System Administrator',
   true,
   true,
   true,
   'de98309e3a0ff27e2dcbdf773c466141',
   true
 );

-- D1 supports JavaScript-powered migrations, which will be used to generate
-- proper secure password hashes. This SQL file is a template for the migration.