import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';

// DB variable will be populated during initialization
let _db: any = null;

/**
 * Initialize database connection based on environment
 * - For production: Uses Cloudflare D1
 * - For development: Uses PostgreSQL via dynamic imports
 */
export async function initDatabase() {
  // Check if we're in production environment (Cloudflare Workers)
  if (process.env.NODE_ENV === 'production') {
    try {
      // Check if D1 database is available (set in worker.ts)
      if (globalThis.__D1_DB) {
        _db = globalThis.__D1_DB;
        console.log('Successfully connected to D1 database in Cloudflare Workers environment');
        return _db;
      }
      
      // If we're trying to access the DB in a production environment
      // but don't have a D1 binding, this is a deployment configuration error
      console.error('D1 database binding missing in Cloudflare Workers environment');
      throw new Error('D1 database not initialized in production environment');
    } catch (error) {
      console.error('Error initializing D1 database:', error);
      throw error;
    }
  } 
  
  // For local development only - use PostgreSQL with dynamic imports
  // This code will never run in production (Cloudflare Workers)
  // We're using conditional import to prevent bundling issues
  try {
    // Check if we're in a Node.js environment before importing Node-specific modules
    if (typeof process !== 'undefined' && 
        process.versions && 
        process.versions.node && 
        process.env.NODE_ENV !== 'production') {
      
      // Use neon HTTP client which is Cloudflare-compatible
      const { neon } = await import('@neondatabase/serverless');
      const { drizzle } = await import('drizzle-orm/neon-http');
      
      const client = neon(process.env.DATABASE_URL || '');
      _db = drizzle(client, { schema });
      console.log('Successfully connected to PostgreSQL database for development');
      return _db;
    } else {
      throw new Error('Attempted to initialize PostgreSQL in non-Node.js environment');
    }
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw new Error('Database connection failed: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Gets the database instance. Initializes it if not already done.
 */
export function getDatabase() {
  if (!_db) {
    // In development, we'll initialize synchronously to maintain compatibility
    if (process.env.NODE_ENV !== 'production') {
      // This is a fallback - ideally the db should be initialized before being used
      console.warn('Database accessed before initialization - initializing now');
      initDatabase().catch(console.error);
    }
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

// Initialize DB - for development environments, do it now to avoid null references
// In production, this will be handled by the worker.ts file
if (process.env.NODE_ENV !== 'production') {
  // Initialize immediately for development
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
}

// Export the database instance - will be populated after initialization
export const db = _db;