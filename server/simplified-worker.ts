import { Env } from "./types";
import { ExecutionContext } from "@cloudflare/workers-types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";

// Simple Cloudflare Worker that serves static content without any complex logic
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Initialize D1 database connection if available
    if (env.DB) {
      try {
        // Create Drizzle instance with schema
        const db = drizzle(env.DB, { schema });
        
        // Set DB instance in a global variable for access in other modules
        // @ts-ignore - making the DB available to our adapters
        globalThis.__D1_DB = db;
        
        console.log('Simplified Worker: D1 database binding initialized successfully');
      } catch (error) {
        console.error('Failed to initialize D1 database in simplified worker:', error);
      }
    }
    const url = new URL(request.url);
    
    // API requests will be handled by a separate worker later
    if (url.pathname.startsWith("/api/")) {
      return new Response("API endpoints not yet implemented", { 
        status: 501, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Check if requesting static assets from KV store
    if (env.ASSETS && url.pathname !== "/" && url.pathname !== "") {
      try {
        // For static assets, try to serve directly from KV
        // Add a null check for ASSETS and its fetch method
        if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
          const assetResponse = await env.ASSETS.fetch(request);
          if (assetResponse.ok) {
            return assetResponse;
          }
        }
      } catch (err) {
        console.error(`Error fetching asset ${url.pathname}:`, err);
      }
    }
    
    // For root path or if asset not found, serve the SPA HTML
    if (env.ASSETS && (url.pathname === "/" || url.pathname === "" || !url.pathname.includes("."))) {
      try {
        // Try common index.html paths with various possible hashes
        const possibleIndexPaths = [
          "index.html",
          "public/index.html",
          // Previous known hash
          "public/index.7831ed9bd0.html",
          // Other possible paths
          "index", 
          "public/index"
        ];
        
        // Try each possible path
        for (const path of possibleIndexPaths) {
          try {
            console.log(`Trying to fetch index at: ${path}`);
            // Add a null check for ASSETS and its fetch method
            if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
              const response = await env.ASSETS.fetch(new Request(path));
              if (response.ok) {
                console.log(`Found and serving index.html from: ${path}`);
                return response;
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
          // Add a null check for ASSETS and its fetch method
          if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
            const response = await env.ASSETS.fetch(new Request('/'));
            if (response.ok) {
              return response;
            }
          }
        } catch (err) {
          console.error("Could not serve SPA index:", err);
        }
        
        console.warn("Could not find index.html in assets");
      } catch (err) {
        console.error("Error fetching index.html from KV:", err);
      }
    }
    
    // If index.html not found in KV or any other error, fall back to inline HTML
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>PropManager - Property Management Solution</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 0;
        background: #f4f7fa;
        color: #333;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        color: #4f46e5;
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      p {
        font-size: 1.25rem;
        line-height: 1.6;
        margin-bottom: 2rem;
      }
      .coming-soon {
        display: inline-block;
        background: #4f46e5;
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>PropManager</h1>
      <p>The comprehensive property management solution for German landlords is coming soon.</p>
      <div class="coming-soon">Launching Soon</div>
    </div>
  </body>
</html>`;

    // Serve the HTML content for all routes
    return new Response(htmlContent, {
      headers: { 
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
    });
  },
};