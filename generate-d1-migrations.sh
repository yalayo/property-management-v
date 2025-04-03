#!/bin/bash

# Script to generate D1 database migrations from schema

echo "Generating D1 migrations..."

# Create the migrations directory if it doesn't exist
mkdir -p ./migrations/d1

# Copy existing SQL migration files (to ensure idempotence)
if [ -d "./migrations/d1" ]; then
  echo "D1 migrations directory already exists."
else
  echo "Creating D1 migrations directory..."
  mkdir -p ./migrations/d1
fi

# Run the JavaScript generator for migrations
echo "Running JavaScript migration generator..."
node generate-d1-schema.js

echo "D1 migration generation complete"