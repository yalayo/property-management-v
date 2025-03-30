import { Env } from "./types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "@cloudflare/workers-types";
// Import initDatabase from db-cf to ensure proper initialization
import { initDatabase } from "./db-cf";

// Cloudflare Workers entry point
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Initialize D1 database connection when in production
    if (env.DB) {
      const db = drizzle(env.DB, { schema });
      
      // Set DB instance in a global variable or context
      // @ts-ignore - making the DB available to our adapters
      globalThis.__D1_DB = db;
      
      // Initialize the database using our async initialization function
      ctx.waitUntil(initDatabase());
    }

    const url = new URL(request.url);
    
    try {
      // For API requests, use the Hono API handler
      if (url.pathname.startsWith("/api/")) {
        // Import dynamically to avoid initialization issues
        const { handleApiRequest } = await import("./api-handler-hono");
        return await handleApiRequest(request, env, ctx);
      }
      
      // For all other routes, serve the SPA frontend
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>German Landlord Property Management</title>
    <link rel="stylesheet" href="/assets/index.css" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;

      // Try to serve static assets based on pathname
      try {
        if (url.pathname.endsWith(".js")) {
          const assetUrl = new URL("/assets/index.js", url.origin);
          const assetResponse = await fetch(assetUrl);
          if (assetResponse.ok) {
            const response = new Response(assetResponse.body, {
              headers: {
                "Content-Type": "application/javascript",
                "Cache-Control": "public, max-age=31536000",
              },
            });
            return response;
          }
        } else if (url.pathname.endsWith(".css")) {
          const assetUrl = new URL("/assets/index.css", url.origin);
          const assetResponse = await fetch(assetUrl);
          if (assetResponse.ok) {
            const response = new Response(assetResponse.body, {
              headers: {
                "Content-Type": "text/css",
                "Cache-Control": "public, max-age=31536000",
              },
            });
            return response;
          }
        } else if (url.pathname.includes(".")) {
          // For other assets like images, try to serve from origin
          const assetResponse = await fetch(new URL(url.pathname, url.origin));
          if (assetResponse.ok) {
            return assetResponse;
          }
        }
      } catch (e) {
        console.error("Failed to serve static asset:", e);
      }
      
      // Default case: serve the SPA HTML
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
