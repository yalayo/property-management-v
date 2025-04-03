/**
 * Password utility functions for hashing, verification, and validation
 */

// Use browser-compatible crypto functions
const cryptoSubtle = globalThis.crypto?.subtle;

if (!cryptoSubtle) {
  throw new Error('Web Crypto API is not available');
}

/**
 * Generate a random salt for password hashing
 * @returns A random salt string
 */
export async function generateSalt(): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with a salt using SHA-256
 * @param password The plain text password
 * @param salt The salt to use
 * @returns The hashed password
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  // Combine password and salt
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}${salt}`);
  
  // Hash the combined string
  const hashBuffer = await cryptoSubtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Verify a password against a stored hash
 * @param password The password to check
 * @param storedHash The stored password hash
 * @param salt The salt used for the stored hash
 * @returns Whether the password is valid
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}

/**
 * Check password strength
 * @param password The password to check
 * @returns An object indicating if the password is valid and the reason if not
 */
export function checkPasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}

/**
 * Generate a secure random password
 * @returns A secure random password
 */
export function generateSecurePassword(): string {
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