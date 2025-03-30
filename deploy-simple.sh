#!/bin/bash

# Simple deployment script for Cloudflare Workers
# This deploys a simple landing page worker without any complex dependencies

echo "Deploying simplified landing page to Cloudflare Workers..."

# Use the simple wrangler configuration
cp simple-wrangler.toml wrangler.toml

# Deploy to Cloudflare Workers
echo "Deploying to Cloudflare Workers..."
wrangler deploy --env production

# Restore original wrangler.toml if it exists
if [ -f "wrangler.toml.bak" ]; then
  echo "Restoring original wrangler.toml..."
  mv wrangler.toml.bak wrangler.toml
fi

echo "Deployment complete! Your simple landing page should now be accessible at your Cloudflare Workers domain."
echo "This simple page doesn't rely on any client-side JavaScript or external assets, ensuring it will display correctly."