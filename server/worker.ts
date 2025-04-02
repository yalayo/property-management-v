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

      // If request is for the root page, load index from KV
      if (url.pathname === "/" || url.pathname.endsWith("/index.html")) {
        try {
          if (env.ASSETS) {
            const indexHtml = await env.ASSETS.fetch(new Request("public/index.7831ed9bd0.html"));
            if (indexHtml.ok) {
              const bodyContent = await indexHtml.text();
              return new Response(bodyContent, {
                headers: { "Content-Type": "text/html" } 
              });
            }
          }
        } catch (e) {
          console.error("Error fetching index.html from KV:", e);
        }
      }

      // If no asset or index page is found, return a 404 response
      return new Response("Not Found", { status: 404 });
    } catch (error: unknown) {
      console.error("Worker error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }
  },
};
