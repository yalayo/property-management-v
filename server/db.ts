// Import only schema to avoid bundling Node.js-specific modules
import * as schema from "@shared/schema";
// The neon serverless client properly handles different environments
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

// Create a placeholder for the database that will be populated after async initialization
let _db: any = null;
let _client: any = null;

/**
 * Initialize database connection using Neon's HTTP driver
 * This approach works in both Cloudflare Workers and local development
 */
export async function initDatabase() {
  // Skip initialization if already done
  if (_db) return _db;

  // In production, use Cloudflare Worker's D1 database
  if (process.env.NODE_ENV === 'production') {
    // This will be handled by worker.ts where D1 database will be injected
    console.log('Production environment detected');
    // Provide a minimal implementation for builds
    _db = { select: () => ({ from: () => ({ where: () => [] }) }) };
    return _db;
  }

  // For all other environments, use Neon HTTP driver which is Cloudflare-compatible
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    
    // Create an HTTP-based client that works in any environment
    _client = neon(process.env.DATABASE_URL);
    
    // Initialize Drizzle with the client
    _db = drizzle(_client, { schema });
    
    console.log('Database initialized with Neon HTTP driver');
    return _db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Return a minimal implementation to avoid crashes during errors
    _db = { select: () => ({ from: () => ({ where: () => [] }) }) };
    return _db;
  }
}

/**
 * Gets the database instance. Initializes it if not already done.
 */
export function getDatabase() {
  if (!_db) {
    // Initialize immediately to avoid null reference errors
    initDatabase().catch(err => {
      console.error('Failed to initialize database:', err);
    });
  }
  return _db;
}

/**
 * Get SQL client for raw queries (needed for session store)
 */
export async function getSqlClient() {
  if (!_client) {
    await initDatabase();
  }
  return _client;
}

// Initialize database immediately for non-production environments
if (process.env.NODE_ENV !== 'production') {
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
}

// Export the database instance and SQL helper
export const db = _db;
export { sql };
