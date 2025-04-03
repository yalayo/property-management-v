import { storage } from "../storage";
import { generateSalt, hashPassword, generateSecurePassword } from "./password";

/**
 * Seed an admin user if none exists in the database
 * @returns The admin user credentials
 */
export async function seedAdminUser(): Promise<{
  username: string;
  password: string;
  isFirstAdmin: boolean;
}> {
  try {
    // Check if the standard admin user exists
    const existingAdmin = await storage.getUserByUsername('admin');
    
    if (existingAdmin) {
      // Admin already exists, return without creating a new one
      return {
        username: existingAdmin.username,
        password: '********', // Password not returned for security
        isFirstAdmin: false
      };
    }
    
    // Generate credentials for the new admin
    const username = 'admin';
    const password = generateSecurePassword();
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(password, salt);
    
    // Create the admin user
    const adminUser = await storage.createUser({
      username,
      password: hashedPassword,
      email: 'admin@landlordpro.app',
      passwordSalt: salt,
      fullName: 'System Administrator',
      isAdmin: true,
      isActive: true,
      onboardingCompleted: true,
      passwordChangeRequired: true,  // Force password change on first login
    });
    
    return {
      username,
      password, // Only return plain text password for initial setup
      isFirstAdmin: true
    };
  } catch (error) {
    console.error('Failed to seed admin user:', error);
    throw new Error('Failed to seed admin user');
  }
}

/**
 * Create a test admin user for development environments
 * @returns The test admin credentials
 */
export async function seedTestAdmin(): Promise<{
  username: string;
  password: string;
}> {
  // Only create this user in development environments
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test admin can only be created in development environments');
  }
  
  try {
    // Check if test admin already exists
    const existingTestAdmin = await storage.getUserByUsername('testadmin');
    
    if (existingTestAdmin) {
      // Test admin already exists, return without creating a new one
      return {
        username: 'testadmin',
        password: 'admin123'
      };
    }
    
    // Create test admin with a known password for development
    const username = 'testadmin';
    const password = 'admin123';
    const salt = await generateSalt();
    const hashedPassword = await hashPassword(password, salt);
    
    // Create the test admin user
    await storage.createUser({
      username,
      password: hashedPassword,
      email: 'testadmin@landlordpro.app',
      passwordSalt: salt,
      fullName: 'Test Administrator',
      isAdmin: true,
      isActive: true,
      onboardingCompleted: true,
      passwordChangeRequired: false,  // No need to change password for test user
    });
    
    return {
      username,
      password
    };
  } catch (error) {
    console.error('Failed to seed test admin user:', error);
    throw new Error('Failed to seed test admin user');
  }
}