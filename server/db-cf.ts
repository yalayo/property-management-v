import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';
import { type Env } from './types';

/**
 * Access the Drizzle DB instance that was initialized in worker.ts
 * This function is used throughout the application for database access
 */
export function getDatabase() {
  // @ts-ignore - accessing the global Drizzle instance
  if (!globalThis.__D1_DB) {
    throw new Error('Database not initialized. Make sure the worker has initialized the database.');
  }
  // @ts-ignore - accessing the global Drizzle instance
  return globalThis.__D1_DB;
}

// For convenience, export a db reference that will resolve at runtime
export const db = getDatabase();