import { storage } from "../storage";
import { generateRandomPassword } from "./password";

/**
 * Seeds an admin user if none exists
 * @returns Promise<{username: string, password: string, isFirstAdmin: boolean}> The admin credentials and whether this is the first admin
 */
export async function seedAdminUser(): Promise<{username: string, password: string, isFirstAdmin: boolean}> {
  // Default admin credentials
  const adminUsername = 'admin';
  const adminEmail = 'admin@example.com';
  
  // Check if admin user already exists
  const existingUser = await storage.getUserByUsername(adminUsername);
  
  if (existingUser) {
    // Admin exists, check if password change is required
    const needsPasswordChange = existingUser.passwordChangeRequired === true;
    
    // For existing admins with plain text passwords, we don't want to expose the password
    // but we do want to indicate that a password change is needed
    return {
      username: adminUsername,
      password: '••••••••', // Masked password
      isFirstAdmin: false,
    };
  }
  
  // Create a new admin user with a random password that must be changed
  const initialPassword = generateRandomPassword(12);
  
  try {
    await storage.createUserWithPassword({
      username: adminUsername,
      email: adminEmail,
      fullName: 'System Administrator',
      isAdmin: true,
      isActive: true,
      passwordChangeRequired: true
    }, initialPassword);
    
    console.log('Created initial admin user');
    
    return {
      username: adminUsername,
      password: initialPassword,
      isFirstAdmin: true,
    };
  } catch (error) {
    console.error('Failed to create admin user:', error);
    throw error;
  }
}

/**
 * Creates a test admin user if in development mode
 * @returns Promise<void>
 */
export async function seedTestAdmin(): Promise<void> {
  // Only create test admin in development mode
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  const testAdminUsername = 'testadmin';
  
  // Check if test admin already exists
  const existingUser = await storage.getUserByUsername(testAdminUsername);
  
  if (existingUser) {
    return; // Test admin already exists
  }
  
  try {
    await storage.createUserWithPassword({
      username: testAdminUsername,
      email: 'testadmin@example.com',
      fullName: 'Test Administrator',
      isAdmin: true,
      isActive: true,
      passwordChangeRequired: false
    }, 'admin123');
    
    console.log('Created test admin user for development');
  } catch (error) {
    console.error('Failed to create test admin user:', error);
  }
}