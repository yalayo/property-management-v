import { Env } from "./types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "@cloudflare/workers-types";
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// Cloudflare Workers environment detection
const isCloudflareWorker = typeof globalThis.caches !== 'undefined';

// Only load db-cf module when needed - dynamic import to avoid Node.js module issues
async function getInitDatabaseFunction() {
  try {
    // In Cloudflare Workers environment, we can safely import db-cf
    const { initDatabase } = await import('./db-cf');
    return initDatabase;
  } catch (error) {
    console.error('Failed to import database initialization:', error);
    throw new Error('Database module loading failed');
  }
}

// Cloudflare Workers entry point
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Initialize D1 database connection when in production
    if (env.DB) {
      try {
        const db = drizzle(env.DB, { schema });
        
        // Set DB instance in a global variable or context
        // @ts-ignore - making the DB available to our adapters
        globalThis.__D1_DB = db;
        
        // Initialize the database using our async initialization function
        ctx.waitUntil(
          getInitDatabaseFunction()
            .then(initDatabaseFn => initDatabaseFn())
            .catch((err: Error) => {
              console.error('Failed to initialize database in worker:', err);
            })
        );
        
        console.log('Worker D1 database binding initialized successfully');
      } catch (error) {
        console.error('Failed to initialize D1 database in worker:', error);
        return new Response('Error initializing database. Please check your Cloudflare Worker configuration.', { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    } else {
      console.warn('No D1 database binding found in worker environment');
    }

    const url = new URL(request.url);
    
    try {
      // For API requests, use the Hono API handler
      if (url.pathname.startsWith("/api/")) {
        // Import dynamically to avoid initialization issues
        const { handleApiRequest } = await import("./api-handler-hono");
        return await handleApiRequest(request, env, ctx);
      }
      
      // Define HTML content with proper path references
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>PropManager - Property Management Solution</title>
    <meta name="description" content="The property management solution for German landlords" />
    <link rel="stylesheet" href="/index.css" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>`;

      // Try to serve static assets from the Assets binding first
      if (env.ASSETS) {
        try {
          // Check if this is a request for a static asset
          if (url.pathname.includes(".") && !url.pathname.endsWith('.html')) {
            // Request the asset from the ASSETS binding
            const assetUrl = new URL(url.pathname, url.origin);
            const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString()));
            
            if (assetResponse.status === 200) {
              console.log(`Serving asset from ASSETS: ${url.pathname}`);
              return assetResponse;
            }
          }
        } catch (e) {
          console.error("Error serving asset from KV:", e);
        }
      }
      
      // For all routes that aren't API routes or assets, serve the SPA HTML
      // This enables client-side routing to work properly
      return new Response(htmlContent, {
        headers: { 
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
      });
    } catch (error: unknown) {
      console.error("Worker error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }
  },
};
