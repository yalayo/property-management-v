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
    
    // Define a simple HTML page with minimal content
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