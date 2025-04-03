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
fi

echo "D1-compatible SQL migration generated in migrations/d1/001_initial_schema.sql"