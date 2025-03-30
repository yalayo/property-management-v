import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// This function provides the appropriate database connection based on environment
// - For production (Cloudflare Workers): Uses Cloudflare D1
// - For development: Uses PostgreSQL
function getDatabaseConnection() {
  // Check if we're in production environment (Cloudflare Workers)
  if (process.env.NODE_ENV === 'production') {
    // Return D1 database instance if available (set in worker.ts)
    if (globalThis.__D1_DB) {
      return globalThis.__D1_DB;
    }
    throw new Error('D1 database not initialized in production environment');
  }

  // For local development, use PostgreSQL
  neonConfig.webSocketConstructor = ws;
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle({ client: pool, schema });
}

// For backward compatibility, still export these
export const pool = process.env.NODE_ENV !== 'production' 
  ? new Pool({ connectionString: process.env.DATABASE_URL || '' }) 
  : null;
export const db = getDatabaseConnection();
