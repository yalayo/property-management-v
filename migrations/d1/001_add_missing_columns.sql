-- D1 Migration: Add missing columns to users table
-- These columns support secure authentication and additional user features

-- Check if password_salt column exists and add if it doesn't
SELECT 1 FROM pragma_table_info('users') WHERE name = 'password_salt';
ALTER TABLE users ADD COLUMN password_salt TEXT;

-- Check if password_change_required column exists and add if it doesn't
SELECT 1 FROM pragma_table_info('users') WHERE name = 'password_change_required';
ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT false;

-- Check if last_login column exists and add if it doesn't
SELECT 1 FROM pragma_table_info('users') WHERE name = 'last_login';
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Check if preferred_payment_gateway column exists and add if it doesn't
SELECT 1 FROM pragma_table_info('users') WHERE name = 'preferred_payment_gateway';
ALTER TABLE users ADD COLUMN preferred_payment_gateway TEXT;

-- Check if is_crowdfunding_contributor column exists and add if it doesn't
SELECT 1 FROM pragma_table_info('users') WHERE name = 'is_crowdfunding_contributor';
ALTER TABLE users ADD COLUMN is_crowdfunding_contributor BOOLEAN DEFAULT false;

-- D1 doesn't support transactions for schema changes, so we don't use BEGIN/COMMIT here