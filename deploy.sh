#!/bin/bash

# Deploy script for Cloudflare Workers with D1 database

# Build the application (both client and server)
echo "Building application..."
npm run build

# Ensure client dist directory exists
if [ ! -d "./client/dist" ]; then
    echo "Error: Client build directory not found. Make sure the build process completed successfully."
    exit 1
fi

# Check if landlord-db exists, if not create it
echo "Checking for D1 database..."
DATABASE_EXISTS=$(wrangler d1 list --json | jq -r '.[] | select(.name=="landlord-db") | .name')
if [ -z "$DATABASE_EXISTS" ]; then
    echo "Creating D1 database 'landlord-db'..."
    wrangler d1 create landlord-db
else
    echo "D1 database 'landlord-db' already exists."
fi

# Get the database ID
echo "Getting D1 database ID..."
DATABASE_ID=$(wrangler d1 list --json | jq -r '.[] | select(.name=="landlord-db") | .uuid')

if [ -z "$DATABASE_ID" ]; then
    echo "Error: Could not retrieve database ID. Make sure the database exists and you are authenticated with Cloudflare."
    exit 1
fi

echo "Using D1 database ID: $DATABASE_ID"

# Update wrangler.toml with the database ID
echo "Updating wrangler.toml with database ID..."
sed -i.bak "s/\${DATABASE_ID}/$DATABASE_ID/g" wrangler.toml

# Apply migrations to D1 database
echo "Applying D1 migrations..."
wrangler d1 migrations apply landlord-db --local

# Publish migrations to production
echo "Publishing migrations to production..."
wrangler d1 migrations apply landlord-db

# Deploy to Cloudflare Workers
echo "Deploying to Cloudflare Workers..."
wrangler deploy --env production

# Restore original wrangler.toml
echo "Restoring wrangler.toml..."
mv wrangler.toml.bak wrangler.toml

echo "Deployment complete! Your application should now be accessible at your Cloudflare Workers domain."
echo "If your application displays 'Cloudflare Worker is running', then your assets weren't deployed correctly."
echo "Check the wrangler.toml configuration and make sure your client/dist directory contains the built assets."