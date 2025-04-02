import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';

// DB variable will be populated during initialization
let _db: any = null;

export async function initDatabase(env) {
  if (!env.DB) {
    throw new Error('D1 database binding is missing');
  }
  _db = drizzle(env.DB);
  return _db;
}

export function getDatabase() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

// Export the database instance - will be populated after initialization
export const db = _db;