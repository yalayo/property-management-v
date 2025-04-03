import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';
import { type Env } from './types';

// Reference to the database instance
let _db: any = null;

/**
 * Access the Drizzle DB instance that was initialized in worker.ts
 * This function is used throughout the application for database access
 */
export function getDatabase() {
  // Return cached instance if available
  if (_db) return _db;
  
  // @ts-ignore - accessing the global Drizzle instance
  if (!globalThis.__D1_DB) {
    console.warn('Database not initialized yet. Returning null. Will retry on next call.');
    return null;
  }
  
  // @ts-ignore - accessing the global Drizzle instance
  _db = globalThis.__D1_DB;
  return _db;
}

/**
 * Lazy getter for the database. This will return null if the DB is not initialized yet,
 * which allows for import-time loading without errors.
 */
export const db = {
  get current() {
    return getDatabase();
  }
};