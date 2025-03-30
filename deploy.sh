#!/bin/bash

# Deploy script for Cloudflare Workers with D1 database

# Build the application
echo "Building application..."
npm run build

# Check if landlord_db exists, if not create it
echo "Checking for D1 database..."
DATABASE_EXISTS=$(wrangler d1 list --json | jq -r '.[] | select(.name=="landlord_db") | .name')
if [ -z "$DATABASE_EXISTS" ]; then
    echo "Creating D1 database 'landlord_db'..."
    wrangler d1 create landlord_db
else
    echo "D1 database 'landlord_db' already exists."
fi

# Get the database ID
echo "Getting D1 database ID..."
DATABASE_ID=$(wrangler d1 list --json | jq -r '.[] | select(.name=="landlord_db") | .uuid')

if [ -z "$DATABASE_ID" ]; then
    echo "Error: Could not retrieve database ID. Make sure the database exists and you are authenticated with Cloudflare."
    exit 1
fi

echo "Using D1 database ID: $DATABASE_ID"

# Update wrangler.toml with the database ID
echo "Updating wrangler.toml with database ID..."
sed -i.bak "s/\${DATABASE_ID}/$DATABASE_ID/g" wrangler.toml

# Apply migrations
echo "Applying D1 migrations..."
wrangler d1 migrations apply landlord_db --file=./migrations

# Deploy to Cloudflare Workers
echo "Deploying to Cloudflare Workers..."
wrangler deploy --env production

# Restore original wrangler.toml
echo "Restoring wrangler.toml..."
mv wrangler.toml.bak wrangler.toml

echo "Deployment complete!"