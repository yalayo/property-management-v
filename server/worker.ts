import { Env } from "./types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "@cloudflare/workers-types";
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// Cloudflare Workers entry point
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Initialize D1 database connection
    if (env.DB) {
      try {
        // Create Drizzle instance with schema
        const db = drizzle(env.DB, { schema });
        
        // Set DB instance in a global variable for access in other modules
        // @ts-ignore - making the DB available to our adapters
        globalThis.__D1_DB = db;
        
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
