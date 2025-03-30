import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';
// For development, use the regular pg library since we're not in Workers environment
import { Pool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';

/**
 * Provides the appropriate database connection based on environment
 * - For production: Uses Cloudflare D1
 * - For development: Uses PostgreSQL
 */
export function getDatabase() {
  // Check if we're in production environment (Cloudflare Workers)
  if (process.env.NODE_ENV === 'production') {
    // Check if D1 database is available (should be set in worker.ts)
    if (globalThis.__D1_DB) {
      return globalThis.__D1_DB;
    }
    throw new Error('D1 database not initialized in production environment');
  } 
  
  // For local development, use PostgreSQL with regular pg
  // Only use pg-cloudflare in production
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || '',
  });
  return drizzlePg(pool, { schema });
}

// Exported for backward compatibility
export const db = getDatabase();