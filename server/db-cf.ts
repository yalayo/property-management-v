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
  
  // For local development, use PostgreSQL with dynamic imports
  try {
    const { Pool } = await import('@neondatabase/serverless');
    const ws = await import('ws');
    const { neonConfig } = await import('@neondatabase/serverless');
    const { drizzle: drizzlePg } = await import('drizzle-orm/postgres-js');
    
    // Configure neon for WebSocket support
    neonConfig.webSocketConstructor = ws.default;
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || '',
    });
    
    _db = drizzlePg(pool, { schema });
    return _db;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw new Error('Database connection failed');
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