// Script to fix admin passwords without salt (CommonJS version)
const { Client } = require('pg');
const crypto = require('crypto');

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

/**
 * Generate a random salt for password hashing
 * @returns A random salt string
 */
async function generateSalt() {
  const saltBytes = crypto.randomBytes(16);
  return saltBytes.toString('hex');
}

/**
 * Hash a password with a salt using scrypt
 * @param password The plain text password
 * @param salt The salt to use
 * @returns The hashed password
 */
async function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Fix admin users with plaintext passwords
 */
async function fixAdminPasswords() {
  console.log('Starting admin password fix...');
  
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Find all users without a password_salt
    const { rows: usersToFix } = await client.query(`
      SELECT id, username, password
      FROM users
      WHERE password_salt IS NULL OR password_salt = ''
    `);
    
    if (usersToFix.length === 0) {
      console.log('No users with plaintext passwords found.');
      return;
    }
    
    console.log(`Found ${usersToFix.length} users with plaintext passwords.`);
    
    for (const user of usersToFix) {
      // Generate a new salt
      const salt = await generateSalt();
      
      // Hash the existing plaintext password with the new salt
      const hashedPassword = await hashPassword(user.password, salt);
      
      // Update the user record with the hashed password and salt
      await client.query(`
        UPDATE users
        SET password = $1, password_salt = $2
        WHERE id = $3
      `, [hashedPassword, salt, user.id]);
      
      console.log(`✅ Fixed password for user: ${user.username} (ID: ${user.id})`);
    }
    
    console.log('Successfully fixed all plaintext passwords.');
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    await client.end();
  }
}

// Run the function
fixAdminPasswords().catch(console.error);