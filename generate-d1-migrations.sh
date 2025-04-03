#!/bin/bash

# Generate SQL migrations for D1 from the Drizzle schema
echo "Generating SQL migrations for Cloudflare D1..."

# Create migrations directory if it doesn't exist
mkdir -p migrations

# Create D1 migrations directory
mkdir -p migrations/d1
mkdir -p migrations/d1-drizzle

# Always generate native SQLite migrations from our D1 schema
echo "Generating D1-compatible migrations with SQLite dialect..."
npx drizzle-kit generate --config=./drizzle.d1.config.ts

# Check if SQLite migrations were generated
SQLITE_MIGRATION=$(ls -t migrations/d1-drizzle/*.sql 2>/dev/null | head -1)

if [ -n "$SQLITE_MIGRATION" ]; then
  echo "Using native SQLite migration: $SQLITE_MIGRATION"
  
  # Copy the SQLite migration to our D1 directory with a consistent name
  cp "$SQLITE_MIGRATION" migrations/d1/001_initial_schema.sql
  echo "Copied SQLite migration to migrations/d1/001_initial_schema.sql"
else
  echo "Failed to generate SQLite migrations! This is unexpected with schema-d1.ts"
  
  # Generate PostgreSQL migrations as fallback (should not happen with schema-d1.ts)
  echo "Generating PostgreSQL migrations as fallback (not recommended)..."
  npx drizzle-kit generate
  
  # Get PostgreSQL migration file
  PG_MIGRATION=$(ls -t migrations/*.sql | grep -v "d1_migration.sql" | head -1)
  
  if [ -z "$PG_MIGRATION" ]; then
    echo "Error: No migration files found"
    exit 1
  fi
  
  echo "Using PostgreSQL migration file as fallback: $PG_MIGRATION"
  
  echo "WARNING: Adapting PostgreSQL migration to SQLite for D1 compatibility. This is not ideal!"
  
  # Create a new file with SQLite-compatible SQL
  cat > migrations/d1/001_initial_schema.sql << EOL
-- Migration adapted for Cloudflare D1 (SQLite)
-- WARNING: This file was automatically generated from PostgreSQL schema by conversion
-- It's recommended to use schema-d1.ts directly instead of this conversion approach

EOL
  
  # Extract table creation statements (skip CREATE TYPE)
  grep -A 1000 "CREATE TABLE" "$PG_MIGRATION" > migrations/tables_temp.sql
  
  # Convert PostgreSQL types to SQLite 
  cat migrations/tables_temp.sql | 
    sed 's/serial PRIMARY KEY NOT NULL/INTEGER PRIMARY KEY AUTOINCREMENT/g' |
    sed 's/serial/INTEGER/g' | 
    sed 's/text/TEXT/g' |
    sed 's/double precision/REAL/g' |
    sed 's/boolean/INTEGER/g' | 
    sed 's/timestamp/TEXT/g' |
    sed 's/"public"\.//g' |
    sed 's/jsonb/TEXT/g' |
    sed 's/date/TEXT/g' |
    sed 's/numeric/REAL/g' |
    sed 's/DEFAULT now()/DEFAULT CURRENT_TIMESTAMP/g' |
    sed 's/DEFAULT true/DEFAULT 1/g' |
    sed 's/DEFAULT false/DEFAULT 0/g' |
    sed "s/'t'/'1'/g" |
    sed "s/'f'/'0'/g" >> migrations/d1/001_initial_schema.sql
  
  # Clean up temporary file
  rm migrations/tables_temp.sql
fi

echo "D1-compatible SQL migration generated in migrations/d1/001_initial_schema.sql"
echo "You can use this file with 'wrangler d1 migrations apply --directory=./migrations/d1'"

# Debug information
echo "D1 migrations directory contents:"
ls -la migrations/d1