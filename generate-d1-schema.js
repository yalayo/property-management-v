/**
 * This script generates D1-compatible schema files from the Drizzle schema
 * It uses the D1 SQLite dialect instead of PostgreSQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// Get the directory name using ESM pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a random salt for password hashing
async function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash a password with a salt using SHA-256
async function hashPassword(password, salt) {
  try {
    // Use the crypto module to create a hash with the salt
    const hash = crypto.createHash('sha256')
      .update(password + salt)
      .digest('hex');
    
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

/**
 * Generate a JavaScript migration file for D1 that creates an admin user
 */
async function generateAdminUserMigration() {
  const salt = await generateSalt();
  const password = 'admin123'; // Default password, will be required to change on first login
  const hashedPassword = await hashPassword(password, salt);
  
  const migrationContent = `// D1 Migration: Create admin user
module.exports = async function(db) {
  // Check if admin user exists
  const adminExists = await db.prepare("SELECT id FROM users WHERE username = 'admin'").first();
  
  if (!adminExists) {
    // Create admin user with secure password
    await db.prepare(\`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).bind(
      'admin',
      '${hashedPassword}',
      'admin@landlordpro.app',
      'System Administrator',
      1,
      1,
      1,
      '${salt}',
      1
    ).run();
    
    console.log('✅ Created admin user');
    console.log('Username: admin');
    console.log('Password: ${password} (change on first login)');
  } else {
    console.log('Admin user already exists');
  }
  
  // Create test admin in development environments
  if (process.env.NODE_ENV === 'development') {
    const testAdminExists = await db.prepare("SELECT id FROM users WHERE username = 'testadmin'").first();
    
    if (!testAdminExists) {
      const testSalt = await crypto.randomBytes(16).toString('hex');
      const testPassword = 'admin123';
      const testHashedPassword = await crypto.createHash('sha256').update(testPassword + testSalt).digest('hex');
      
      await db.prepare(\`
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).bind(
        'testadmin',
        testHashedPassword,
        'testadmin@landlordpro.app',
        'Test Administrator',
        1,
        1,
        1,
        testSalt,
        0
      ).run();
      
      console.log('✅ Created test admin user');
      console.log('Username: testadmin');
      console.log('Password: admin123');
    } else {
      console.log('Test admin user already exists');
    }
  }
};`;

  // Write the migration to a file
  fs.writeFileSync(
    path.join(__dirname, 'migrations', 'd1', '003_create_admin_user.js'),
    migrationContent
  );

  console.log('Generated admin user migration file');
}

/**
 * Run the generator
 */
async function main() {
  try {
    // Make sure the directory exists
    const d1MigrationsDir = path.join(__dirname, 'migrations', 'd1');
    if (!fs.existsSync(d1MigrationsDir)) {
      fs.mkdirSync(d1MigrationsDir, { recursive: true });
    }
    
    // Generate the admin user migration
    await generateAdminUserMigration();
    
    console.log('Successfully generated D1 migration files');
  } catch (error) {
    console.error('Error generating D1 migrations:', error);
  }
}

main();