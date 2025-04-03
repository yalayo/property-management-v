#!/bin/bash

# Generate SQL migrations for D1 from the Drizzle schema
echo "Generating SQL migrations for Cloudflare D1..."

# Create migrations directory if it doesn't exist
mkdir -p migrations

# Generate SQL schema based on drizzle schema (using sqlite dialect for D1)
npx drizzle-kit generate:sqlite --schema=shared/schema.ts --out=./migrations

# Let user know next steps
echo "SQL migrations generated successfully in the migrations directory."