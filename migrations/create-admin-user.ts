import { clients } from '../server/db';
import { generateSalt, hashPassword } from '../server/utils/password';

/**
 * This migration creates an admin user if none exists and 
 * configures it to require a password change on first login
 */
async function createAdminUserMigration() {
  console.log('Starting admin user migration...');
  
  const client = await clients.getClient();
  try {
    // First check if primary admin user exists
    const checkAdminQuery = `SELECT id FROM users WHERE username = 'admin'`;
    const adminResult = await client.query(checkAdminQuery);
    
    let primaryAdminPassword = null;
    
    // If admin doesn't exist, create one with secure password
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
    
    if (primaryAdminPassword) {
      console.log('Primary admin credentials:');
      console.log('Username: admin');
      console.log(`Password: ${primaryAdminPassword}`);
      console.log('NOTE: You will be required to change this password on first login.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Admin user migration failed:', error);
    return { success: false, error };
  } finally {
    client.release();
  }
}

/**
 * Generate a secure random password
 * @returns A secure random password
 */
function generateSecurePassword(): string {
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

export default createAdminUserMigration;