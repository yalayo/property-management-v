// Simple script to create a test admin user with a known password
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

async function createTestAdmin() {
  try {
    await client.connect();
    
    // First check if the test admin user exists
    const checkQuery = "SELECT id FROM users WHERE username = 'testadmin'";
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('Test admin user already exists with ID:', checkResult.rows[0].id);
      console.log('Username: testadmin');
      console.log('Password: admin123');
      return;
    }
    
    // Create a new test admin user
    const username = 'testadmin';
    const password = 'admin123'; // Simple password for testing
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(password, salt);
    
    // Create the test admin user
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
      'testadmin@landlordpro.app',
      'Test Administrator',
      true,
      true,
      true,
      salt,
      false // No need to change password on first login for testing
    ];
    
    const result = await client.query(insertQuery, values);
    
    console.log('✅ Created test admin user successfully');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('Failed to create test admin user:', error);
  } finally {
    await client.end();
  }
}

// Run the function
createTestAdmin();