#!/bin/bash

# SPA Landing Page deployment script for Cloudflare Workers
# This deploys a fully functional SPA landing page with all assets inlined

echo "Deploying SPA landing page to Cloudflare Workers..."

# Create a temporary wrangler.toml for the SPA deployment
cat > wrangler.spa.toml << EOF
name = "pmanagement"
main = "server/spa-worker.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
node_compat = true

# Production settings
[env.production]
vars = { NODE_ENV = "production" }

# Define routes for the SPA
[[env.production.routes]]
pattern = "immo.busqandote.com"
custom_domain = true
EOF

# Backup the original wrangler.toml if it exists
if [ -f "wrangler.toml" ]; then
  cp wrangler.toml wrangler.toml.original
fi

# Use the SPA wrangler configuration
cp wrangler.spa.toml wrangler.toml

# Deploy to Cloudflare Workers
echo "Deploying SPA to Cloudflare Workers..."
wrangler deploy --env production

# Restore original wrangler.toml if it exists
if [ -f "wrangler.toml.original" ]; then
  echo "Restoring original wrangler.toml..."
  mv wrangler.toml.original wrangler.toml
  rm -f wrangler.spa.toml
fi

echo "SPA deployment complete! Your landing page should now be accessible at your Cloudflare Workers domain."
echo "This SPA page has all CSS inlined and minimal JavaScript, ensuring it will display correctly."
echo "It provides a complete landing page experience with modals, forms, and responsive design."