// Simple script to create an admin user
import pg from 'pg';
import crypto from 'crypto';

// Connect to the PostgreSQL database
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

async function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

async function createAdminUser() {
  try {
    await client.connect();
    
    // First check if the admin user exists
    const checkQuery = "SELECT id FROM users WHERE username = 'admin'";
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists with ID:', checkResult.rows[0].id);
      return;
    }
    
    // Create a new admin user
    const username = 'admin';
    const password = 'admin123'; // Default password that will require change
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(password, salt);
    
    // Check if the password_salt column exists, if not add it
    try {
      await client.query("SELECT password_salt FROM users LIMIT 1");
      console.log('password_salt column exists');
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log('Adding password_salt column to users table');
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT");
      } else {
        throw e;
      }
    }
    
    // Check if the password_change_required column exists, if not add it
    try {
      await client.query("SELECT password_change_required FROM users LIMIT 1");
      console.log('password_change_required column exists');
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log('Adding password_change_required column to users table');
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false");
      } else {
        throw e;
      }
    }
    
    // Create the admin user
    const insertQuery = `
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username
    `;
    
    const values = [
      username,
      hashedPassword,
      'admin@landlordpro.app',
      'System Administrator',
      true,
      true,
      true,
      salt,
      true // Require password change on first login
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Created admin user successfully');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('Note: You will be prompted to change this password on first login');
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
  } finally {
    await client.end();
  }
}

// Run the function
createAdminUser();