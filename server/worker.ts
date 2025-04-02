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

      // If request is for the root page or any client route, load index.html from KV
      if (url.pathname === "/" || url.pathname === "" || url.pathname.endsWith("/index.html") || !url.pathname.startsWith("/api")) {
        try {
          // Check both possible bindings: __STATIC_CONTENT (KV namespace) or ASSETS (site binding)
          const staticBinding = env.__STATIC_CONTENT || env.ASSETS;
          
          if (staticBinding) {
            // Try common index.html paths with various possible hashes
            let indexHtmlKey = null;
            
            // Try predefined list of common paths for index.html
            const possibleIndexPaths = [
              "index.html",
              "public/index.html",
              // Add common hashed patterns
              "public/index.7831ed9bd0.html", // Previous known hash
              "public/index.*.html", // Won't work directly but shows intent
              "index", 
              "public/index"
            ];
            
            // Try each possible path
            for (const path of possibleIndexPaths) {
              try {
                console.log(`Trying to fetch index at: ${path} using binding: ${env.__STATIC_CONTENT ? '__STATIC_CONTENT' : 'ASSETS'}`);
                
                if (typeof staticBinding.fetch === 'function') {
                  const response = await staticBinding.fetch(new Request(path));
                  if (response.ok) {
                    indexHtmlKey = path;
                    const bodyContent = await response.text();
                    console.log(`Found and serving index.html from: ${path}`);
                    return new Response(bodyContent, {
                      headers: { "Content-Type": "text/html" }
                    });
                  }
                }
              } catch (err) {
                console.warn(`Error trying path ${path}:`, err);
                // Continue trying other paths
              }
            }
            
            // If specific paths didn't work, try to serve the default SPA index
            // This is a catch-all approach for client-side routing
            try {
              if (typeof staticBinding.fetch === 'function') {
                console.log('Trying to fetch root path /');
                const response = await staticBinding.fetch(new Request('/'));
                if (response.ok) {
                  const bodyContent = await response.text();
                  console.log('Successfully fetched root path, serving as index');
                  return new Response(bodyContent, {
                    headers: { "Content-Type": "text/html" }
                  });
                }
              }
            } catch (err) {
              console.error("Could not serve SPA index:", err);
            }
            
            console.warn("Could not find index.html in assets");
          } else {
            console.warn("No static content binding found: neither __STATIC_CONTENT nor ASSETS is available");
          }
        } catch (e) {
          console.error("Error fetching index.html from assets:", e);
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
