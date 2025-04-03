import { Env } from "./types";
import { ExecutionContext } from "@cloudflare/workers-types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { initStorage } from './storage-init';

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
        
        // Initialize storage with CloudflareStorage implementation
        initStorage();
        
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
    
    // Check both possible bindings: __STATIC_CONTENT (KV namespace) or ASSETS (site binding)
    const staticBinding = env.__STATIC_CONTENT || env.ASSETS;
    
    // Define regex patterns for our main asset types
    const assetPatterns = [
      { pattern: /^\/index\.html$/, regexSearch: /public\/index\.[a-f0-9]+\.html$/ },
      { pattern: /^\/index\.js$/, regexSearch: /^index\.[a-f0-9]+\.js$/ },
      { pattern: /^\/assets\/index\.css$/, regexSearch: /public\/assets\/index\.[a-f0-9]+\.css$/ },
      { pattern: /^\/assets\/index\.js$/, regexSearch: /public\/assets\/index\.[a-f0-9]+\.js$/ }
    ];
    
    // Function to find matching hashed asset using regex
    async function findHashedAsset(requestPath: string): Promise<string | null> {
      // First check if this is a standard pattern we recognize
      const matchingPattern = assetPatterns.find(p => p.pattern.test(requestPath));
      
      if (!matchingPattern) return null;
      
      // If we have the list function available, use it to search
      if (staticBinding && typeof staticBinding.list === 'function') {
        try {
          console.log(`Searching for assets matching ${matchingPattern.regexSearch}`);
          const listResult = await staticBinding.list();
          if (listResult && listResult.keys) {
            // Find first matching key
            const matchingKey = listResult.keys.find(key => 
              matchingPattern.regexSearch.test(key.name)
            );
            
            if (matchingKey) {
              console.log(`Found matching hashed asset: ${matchingKey.name}`);
              return matchingKey.name;
            }
          }
        } catch (error) {
          console.error('Error listing assets:', error);
        }
      }
      
      // Fallback to our last known hashed paths if list isn't available
      const fallbackPaths: Record<string, string> = {
        '/index.js': 'index.050e646218.js',
        '/assets/index.css': 'public/assets/index.440fa24244.css',
        '/assets/index.js': 'public/assets/index.d47fb2a45d.js',
        '/index.html': 'public/index.7831ed9bd0.html'
      };
      
      return fallbackPaths[requestPath] || null;
    }
    
    // Try to find and serve the asset with regex matching
    const hashedAssetPath = await findHashedAsset(url.pathname);
    if (staticBinding && hashedAssetPath) {
      try {
        console.log(`Mapped request for ${url.pathname} to hashed asset: ${hashedAssetPath}`);
        if (typeof staticBinding.fetch === 'function') {
          const response = await staticBinding.fetch(new Request(hashedAssetPath));
          if (response.ok) {
            console.log(`Successfully served hashed asset: ${hashedAssetPath}`);
            return response;
          }
        }
      } catch (err) {
        console.error(`Error fetching hashed asset ${hashedAssetPath}:`, err);
      }
    }
    
    // Check if requesting other static assets from KV store
    if (staticBinding && url.pathname !== "/" && url.pathname !== "") {
      try {
        if (typeof staticBinding.fetch === 'function') {
          console.log(`Trying to fetch asset ${url.pathname} using binding: ${env.__STATIC_CONTENT ? '__STATIC_CONTENT' : 'ASSETS'}`);
          const assetResponse = await staticBinding.fetch(request);
          if (assetResponse.ok) {
            return assetResponse;
          }
        }
      } catch (err) {
        console.error(`Error fetching asset ${url.pathname}:`, err);
      }
      
      // If asset not found by direct path, check if it's a non-hashed version of a hashed file
      // Use the fallback paths from our findHashedAsset function
      const fallbackPaths: Record<string, string> = {
        '/index.js': 'index.050e646218.js',
        '/assets/index.css': 'public/assets/index.440fa24244.css',
        '/assets/index.js': 'public/assets/index.d47fb2a45d.js',
        '/index.html': 'public/index.7831ed9bd0.html'
      };
      
      for (const [standardPath, hashedPath] of Object.entries(fallbackPaths)) {
        if (url.pathname.endsWith(standardPath.split('/').pop() || '')) {
          try {
            console.log(`Trying hashed version ${hashedPath} for requested file ${url.pathname}`);
            if (typeof staticBinding.fetch === 'function') {
              const response = await staticBinding.fetch(new Request(hashedPath));
              if (response.ok) {
                console.log(`Found and serving hashed version: ${hashedPath}`);
                return response;
              }
            }
          } catch (err) {
            console.warn(`Error serving hashed version ${hashedPath}:`, err);
          }
        }
      }
    }
    
    // For root path or if asset not found, serve the SPA HTML
    if (staticBinding && (url.pathname === "/" || url.pathname === "" || !url.pathname.includes("."))) {
      // Always try the known index HTML first
      try {
        if (typeof staticBinding.fetch === 'function') {
          console.log(`Trying known index.html: public/index.7831ed9bd0.html`);
          const indexResponse = await staticBinding.fetch(new Request('public/index.7831ed9bd0.html'));
          if (indexResponse.ok) {
            console.log(`Found and serving known index.html`);
            return indexResponse;
          }
        }
      } catch (err) {
        console.warn(`Error trying known index.html:`, err);
      }
      
      // Fallback to other index paths
      try {
        // Try common index.html paths
        const possibleIndexPaths = [
          "index.html",
          "public/index.html",
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
          if (typeof staticBinding.fetch === 'function') {
            console.log('Trying to fetch root path /');
            const response = await staticBinding.fetch(new Request('/'));
            if (response.ok) {
              console.log('Successfully fetched root path, serving as index');
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
    } else if (!staticBinding) {
      console.warn("No static content binding found: neither __STATIC_CONTENT nor ASSETS is available");
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