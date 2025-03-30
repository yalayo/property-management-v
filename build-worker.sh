#!/bin/bash
# Build script for Cloudflare Workers deployment

echo "Building client-side assets..."
npm run build

echo "Preparing for Cloudflare Workers deployment..."
# Use wrangler to build and validate the worker
npx wrangler deploy --dry-run --outdir=dist