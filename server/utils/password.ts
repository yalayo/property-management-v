import crypto from 'crypto';

/**
 * Check if we're in a Cloudflare Workers environment
 */
const isCloudflareWorker = typeof self !== 'undefined' && typeof self.crypto !== 'undefined';

/**
 * Hash a password using PBKDF2 with SHA-256
 * @param password The plain text password to hash
 * @returns An object containing the password hash and salt
 */
export async function hashPassword(password: string): Promise<{ hash: string, salt: string }> {
  try {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password using PBKDF2 (Password-Based Key Derivation Function 2)
    const iterations = 10000; // Higher is more secure but slower
    const keyLength = 64; // Length of the derived key in bytes
    
    // Use the appropriate crypto implementation based on environment
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keyLength, 'sha256', (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key);
        }
      });
    });
    
    // Convert the derived key to hex for storage
    const hash = derivedKey.toString('hex');
    
    return { hash, salt };
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a stored hash and salt
 * @param password The plain text password to verify
 * @param storedHash The stored password hash
 * @param storedSalt The stored salt used for the hash
 * @returns Boolean indicating if the password is valid
 */
export async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  try {
    // Hash the provided password with the stored salt
    const iterations = 10000;
    const keyLength = 64;
    
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, storedSalt, iterations, keyLength, 'sha256', (err, key) => {
        if (err) {
          reject(err);
        } else {
          resolve(key);
        }
      });
    });
    
    // Convert the derived key to hex for comparison
    const hash = derivedKey.toString('hex');
    
    // Compare the generated hash with the stored hash
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a random password of specified length
 * @param length The length of the password to generate
 * @returns A random password string
 */
export function generateRandomPassword(length: number = 10): string {
  // Define character sets
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded confusing characters I, O
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Excluded confusing character l
  const numberChars = '23456789'; // Excluded confusing characters 0, 1
  const specialChars = '!@#$%^&*-_=+?';
  
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure the password has at least one character from each set
  let password = '';
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Compare passwords without timing attacks (constant time)
 * @param a First string to compare
 * @param b Second string to compare
 * @returns Boolean indicating if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Check if a password meets strength requirements
 * @param password The password to check
 * @returns An object with validity and reason
 */
export function checkPasswordStrength(password: string): { valid: boolean, reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  
  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for numbers
  if (!/\d/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  
  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}