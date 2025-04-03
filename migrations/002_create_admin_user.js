// Migration to create an admin user if one doesn't exist
import crypto from 'crypto';

/**
 * Generate a random salt for password hashing
 * @returns A random salt string
 */
async function generateSalt() {
  const saltBytes = crypto.randomBytes(16);
  return saltBytes.toString('hex');
}

/**
 * Hash a password with a salt using SHA-256
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
 * Generate a secure random password
 * @returns A secure random password
 */
function generateSecurePassword() {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // Excluding similar characters
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Excluding similar characters
  const numbers = '23456789';                         // Excluding 0 and 1
  const specialChars = '!@#$%^&*-_+=?';
  
  const allChars = uppercaseChars + lowercaseChars + numbers + specialChars;
  
  // Start with one of each required character type
  let password = 
    uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length)) +
    lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Add 8 more random characters for a total length of 12
  for (let i = 0; i < 8; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to make it more random
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

/**
 * Create admin users
 * @param {pg.Client} client - PostgreSQL client
 * @returns {Promise<object>} Migration result
 */
export async function createAdminUsers(client) {
  try {
    console.log('Starting admin user migration...');
    
    // First check if primary admin user exists
    const checkAdminQuery = `SELECT id FROM users WHERE username = 'admin'`;
    const adminResult = await client.query(checkAdminQuery);
    
    let primaryAdminPassword = null;
    
    // If admin doesn't exist, create one
    if (adminResult.rows.length === 0) {
      const username = 'admin';
      const password = generateSecurePassword();
      const salt = await generateSalt();
      const hashedPassword = await hashPassword(password, salt);
      
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
        RETURNING id
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
      
      console.log('✅ Created primary admin user with ID:', result.rows[0].id);
      primaryAdminPassword = password;
    } else {
      console.log('Primary admin user already exists with ID:', adminResult.rows[0].id);
    }
    
    // Check for test admin user (for development)
    if (process.env.NODE_ENV === 'development') {
      const checkTestAdminQuery = `SELECT id FROM users WHERE username = 'testadmin'`;
      const testAdminResult = await client.query(checkTestAdminQuery);
      
      if (testAdminResult.rows.length === 0) {
        const username = 'testadmin';
        const password = 'admin123'; // Fixed password for testing
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(password, salt);
        
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
          RETURNING id
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
          false // No password change required for testing
        ];
        
        const result = await client.query(insertQuery, values);
        console.log('✅ Created test admin user with ID:', result.rows[0].id);
        console.log('Test admin credentials:');
        console.log('Username: testadmin');
        console.log('Password: admin123');
      } else {
        console.log('Test admin user already exists with ID:', testAdminResult.rows[0].id);
      }
    }
    
    const response = { success: true };
    if (primaryAdminPassword) {
      response.adminPassword = primaryAdminPassword;
      console.log('Primary admin credentials:');
      console.log('Username: admin');
      console.log(`Password: ${primaryAdminPassword}`);
      console.log('NOTE: You will be required to change this password on first login.');
    }
    
    return response;
  } catch (error) {
    console.error('Admin user migration failed:', error);
    return { success: false, error: error.message };
  }
}

export default createAdminUsers;