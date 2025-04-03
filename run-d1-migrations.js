/**
 * This script runs migrations for the D1 database
 * It uses Cloudflare's Wrangler CLI to execute migrations
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name using ESM pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to run SQLite migrations for D1 database
function runD1Migrations() {
  try {
    console.log('Running D1 migrations...');
    
    // Check if D1 migrations directory exists
    const migrationsDir = path.join(__dirname, 'migrations', 'd1');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No D1 migrations directory found. Create one first.');
      return;
    }
    
    // Get all migration files ordered by name
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
      .sort();
      
    if (migrationFiles.length === 0) {
      console.log('No migration files found in the D1 migrations directory.');
      return;
    }
    
    console.log(`Found ${migrationFiles.length} migration files: ${migrationFiles.join(', ')}`);
    
    // Generate JS migrations first
    try {
      console.log('Generating D1 schema and migrations...');
      execSync('node generate-d1-schema.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error generating D1 schema:', error.message);
      // Continue with migrations even if schema generation fails
    }
    
    // Use wrangler to apply migrations to D1 database
    try {
      console.log('Applying D1 migrations with wrangler...');
      
      // For local development with wrangler dev, use the --local flag
      if (process.env.NODE_ENV === 'development') {
        execSync('npx wrangler d1 migrations apply landlord-db --local', { stdio: 'inherit' });
      } else {
        // For production deployment
        execSync('npx wrangler d1 migrations apply landlord-db', { stdio: 'inherit' });
      }
      
      console.log('✅ D1 migrations applied successfully');
    } catch (error) {
      console.error('Error applying D1 migrations with wrangler:', error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running D1 migrations:', error.message);
    process.exit(1);
  }
}

// Run the function
runD1Migrations();