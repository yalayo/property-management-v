// Migration runner script for GitHub Actions
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Import migration modules
import addMissingColumns from './migrations/001_add_missing_columns.js';
import createAdminUsers from './migrations/002_create_admin_user.js';

// Database connection using environment variables
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function runMigrations() {
  console.log('Starting database migrations...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  // Validate database connection string
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  // Create migration table if it doesn't exist
  const client = new pg.Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM schema_migrations'
    );
    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    
    console.log('Already applied migrations:', appliedMigrationNames);
    
    // Run migrations in order
    const migrations = [
      { name: '001_add_missing_columns', fn: addMissingColumns },
      { name: '002_create_admin_user', fn: createAdminUsers }
    ];
    
    for (const migration of migrations) {
      if (!appliedMigrationNames.includes(migration.name)) {
        console.log(`Applying migration: ${migration.name}`);
        
        // Start transaction
        await client.query('BEGIN');
        
        try {
          // Run the migration
          const result = await migration.fn(client);
          
          if (result.success) {
            // Record the migration
            await client.query(
              'INSERT INTO schema_migrations (name) VALUES ($1)',
              [migration.name]
            );
            
            // Commit the transaction
            await client.query('COMMIT');
            console.log(`Migration ${migration.name} completed successfully`);
            
            // Handle special case for admin password
            if (result.adminPassword) {
              console.log('NOTE: A new admin user was created with the following credentials:');
              console.log('Username: admin');
              console.log(`Password: ${result.adminPassword}`);
              console.log('IMPORTANT: Save this password immediately and change it after first login.');
            }
          } else {
            // Rollback on failure
            await client.query('ROLLBACK');
            console.error(`Migration ${migration.name} failed:`, result.error);
          }
        } catch (error) {
          // Rollback on exception
          await client.query('ROLLBACK');
          console.error(`Error during migration ${migration.name}:`, error);
        }
      } else {
        console.log(`Migration ${migration.name} already applied, skipping`);
      }
    }
    
    console.log('Migration process completed');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations
runMigrations();