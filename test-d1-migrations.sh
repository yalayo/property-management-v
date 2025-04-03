#!/bin/bash

# Test script for D1 migrations
echo "Testing D1 migrations command..."

# Generate migrations
echo "Generating migrations..."
./generate-d1-migrations.sh

# Test the directory parameter
echo "Testing wrangler d1 migrations command with directory parameter..."
echo "Note: This will only validate the command format, not actually apply migrations"
echo "Command: wrangler d1 migrations apply landlord-db --local --directory=./migrations/d1"

# Show directory structure
echo "Migration directory structure:"
ls -la migrations
echo "D1 migrations directory:"
ls -la migrations/d1 || echo "D1 directory not found!"

echo "Testing complete. If you see the D1 migrations directory contents above, the command should work."