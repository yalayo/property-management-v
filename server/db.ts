// Import necessary modules
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Create a placeholder for the database that will be populated after async initialization
let _db: any = null;

// Configure neon for WebSocket support in development mode - but do it async
// without top-level await which isn't supported in some environments
let wsConfigPromise: Promise<void> | null = null;
if (process.env.NODE_ENV !== 'production') {
  wsConfigPromise = Promise.all([
    import('ws'),
    import('@neondatabase/serverless')
  ]).then(([ws, neon]) => {
    neon.neonConfig.webSocketConstructor = ws.default;
  }).catch(err => {
    console.error('Failed to configure WebSocket for Neon:', err);
  });
}

/**
 * Initialize database connection based on environment
 * - For production: Uses Cloudflare D1 (set in worker.ts)
 * - For development: Uses PostgreSQL via Neon Serverless
 */
export async function initDatabase() {
  // Skip initialization if already done
  if (_db) return _db;

  // Wait for websocket configuration to complete in development
  if (process.env.NODE_ENV !== 'production' && wsConfigPromise) {
    await wsConfigPromise;
  }

  // In production, use Cloudflare Worker's D1 database
  if (process.env.NODE_ENV === 'production') {
    // This will be handled by worker.ts
    console.log('Production environment detected');
    // Provide a minimal implementation for builds
    _db = { select: () => ({ from: () => ({ where: () => [] }) }) };
    return _db;
  }

  // For local development, use PostgreSQL via Neon Serverless
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool, { schema });
    console.log('Database initialized in development mode');
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
    // Initialize immediately to avoid null reference errors in development
    if (process.env.NODE_ENV !== 'production') {
      initDatabase().catch(err => {
        console.error('Failed to initialize database:', err);
      });
    }
  }
  return _db;
}

// Create and export the database pool for session store
// Only in development mode to avoid Node.js dependencies in Cloudflare Workers
export const pool = process.env.NODE_ENV !== 'production' 
  ? new Pool({ connectionString: process.env.DATABASE_URL || '' }) 
  : undefined;

// Initialize database immediately for development
if (process.env.NODE_ENV !== 'production') {
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
}

// Export the database instance
export const db = _db;
