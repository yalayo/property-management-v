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
# Added external flag for Node.js built-in modules and problematic packages to avoid bundling errors
WRANGLER_EXTERNAL=crypto,postgres,pg,pg-native,url,path,util,fs,@neondatabase/serverless,ws,events,drizzle-orm/postgres-js,express-session,connect-pg-simple,memorystore wrangler deploy --env production --compatibility-flags=nodejs_compat --node-compat

# Restore original wrangler.toml
echo "Restoring wrangler.toml..."
mv wrangler.toml.bak wrangler.toml

echo "Deployment complete! Your application should now be accessible at your Cloudflare Workers domain."

# Provide additional debugging tips
echo ""
echo "Deployment Troubleshooting Tips:"
echo "--------------------------------"
echo "1. If your application displays a blank page or 'Cloudflare Worker is running', check the following:"
echo "   - Open browser developer tools and look for console errors"
echo "   - Make sure your assets are being served correctly from the correct path"
echo "   - Check wrangler.toml site configuration is pointing to the correct bucket"
echo ""
echo "2. If you see Node.js module errors in the console (e.g., 'crypto is not defined'):"
echo "   - Verify that node_compat = true is set in wrangler.toml"
echo "   - Make sure problematic modules are marked as external in the WRANGLER_EXTERNAL variable"
echo ""
echo "3. For session/auth issues:"
echo "   - The application uses Web Crypto API instead of Node.js crypto in production"
echo "   - Session management is handled via tokens rather than express-session"
echo ""
echo "4. To check your deployed worker assets, run:"
echo "   wrangler kv:namespace list"
echo "   wrangler kv:key list --namespace-id <YOUR_NAMESPACE_ID>"
echo ""
echo "5. Check that your database migrations have been applied correctly with:"
echo "   wrangler d1 execute landlord-db --command=\"SELECT name FROM sqlite_master WHERE type='table';\""