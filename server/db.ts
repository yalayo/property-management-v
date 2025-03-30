// Import only schema to avoid bundling Node.js-specific modules
import * as schema from "@shared/schema";

// Create a placeholder for the database that will be populated after async initialization
let _db: any = null;

// Instead of direct imports, we'll load all driver-specific modules dynamically
// This prevents Cloudflare Workers build from bundling Node.js modules
let Pool: any;
let drizzle: any;
let wsConfigPromise: Promise<void> | null = null;

// Configure environment-specific modules asynchronously
// NOTE: We're using a multi-step dynamic import approach to prevent any
// static dependencies on 'postgres' or other Node-specific modules
if (process.env.NODE_ENV !== 'production') {
  wsConfigPromise = (async () => {
    try {
      // Step 1: Import only the WebSocket module first
      const wsModule = await import('ws');
      
      // Step 2: Import Neon without any postgres dependencies yet
      const neonModule = await import('@neondatabase/serverless');
      
      // Step 3: Configure WebSocket support for Neon
      neonModule.neonConfig.webSocketConstructor = wsModule.default;
      
      // Step 4: Now it's safe to import drizzle with the configured dependencies
      // Using a more direct drizzle import to avoid postgres-js dependency
      const drizzleModule = await import('drizzle-orm/neon-serverless');
      
      // Store references to these modules for later use
      Pool = neonModule.Pool;
      drizzle = drizzleModule.drizzle;
      
      console.log('Database modules configured for development environment');
    } catch (err) {
      console.error('Failed to configure database modules:', err);
    }
  })();
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

// Create a pool getter function for session store
// This prevents top-level instantiation and avoids bundling issues
let _pool: any = undefined;

export function getPool() {
  if (process.env.NODE_ENV === 'production') {
    return undefined; // No pool needed in production (Cloudflare D1)
  }
  
  if (!_pool && Pool) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL || '' });
    } catch (err) {
      console.error('Failed to create database pool:', err);
    }
  }
  
  return _pool;
}

// Expose pool for backward compatibility
export const pool = process.env.NODE_ENV !== 'production' ? getPool() : undefined;

// Initialize database immediately for development
if (process.env.NODE_ENV !== 'production') {
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
}

// Export the database instance
export const db = _db;
