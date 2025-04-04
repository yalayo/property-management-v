import { Env } from "./types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "@cloudflare/workers-types";
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import { initStorage } from './storage-init';

// Helper function to determine content type
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
  };
  
  return contentTypes[ext || ''] || 'application/octet-stream';
}

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
        
        // Store environment information to detect Cloudflare Worker environment
        // This allows us to avoid using setInterval in Cloudflare Workers
        globalThis.__IS_CLOUDFLARE_WORKER = true;
        
        // Initialize storage with CloudflareStorage implementation
        initStorage();
        
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
    
    let path = url.pathname;

    // For API requests, use the Hono API handler
    if (path.startsWith("/api/")) {
      // Import dynamically to avoid initialization issues
      const { handleApiRequest } = await import("./api-handler-hono");
      return await handleApiRequest(request, env, ctx);
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
    
    // If the path is root, serve index.html
    if (path === "/") {
      path = "/index.html";
    }
    
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
    const hashedAssetPath = await findHashedAsset(path);
    if (staticBinding && hashedAssetPath) {
      try {
        console.log(`Mapped request for ${path} to hashed asset: ${hashedAssetPath}`);
        if (typeof staticBinding.get === 'function') {
          const asset = await staticBinding.get(hashedAssetPath);
          if (asset) {
            console.log(`Successfully serving hashed asset: ${hashedAssetPath}`);
            return new Response(asset, {
              headers: { "Content-Type": getContentType(hashedAssetPath) }
            });
          }
        } else if (typeof staticBinding.fetch === 'function') {
          const response = await staticBinding.fetch(new Request(hashedAssetPath));
          if (response.ok) {
            console.log(`Successfully serving hashed asset via fetch: ${hashedAssetPath}`);
            return response;
          }
        }
      } catch (err) {
        console.error(`Error fetching hashed asset ${hashedAssetPath}:`, err);
      }
    }
    
    // Try to get the asset directly
    try {
      if (staticBinding) {
        if (typeof staticBinding.get === 'function') {
          const asset = await staticBinding.get(path);
          if (asset) {
            return new Response(asset, {
              headers: { "Content-Type": getContentType(path) }
            });
          }
        } else if (typeof staticBinding.fetch === 'function') {
          const response = await staticBinding.fetch(request);
          if (response.ok) {
            return response;
          }
        }
      }
      
      // Fallback to the known index.html for client-side routing
      if (!path.includes('.') || path === '/index.html') {
        if (typeof staticBinding?.get === 'function') {
          const indexHtml = await staticBinding.get('public/index.7831ed9bd0.html');
          if (indexHtml) {
            return new Response(indexHtml, {
              headers: { "Content-Type": "text/html" }
            });
          }
        } else if (typeof staticBinding?.fetch === 'function') {
          const indexResponse = await staticBinding.fetch(new Request('public/index.7831ed9bd0.html'));
          if (indexResponse.ok) {
            return indexResponse;
          }
        }
      }
      
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error('Error serving asset:', error);
      return new Response("Error serving content", { status: 500 });
    }
  },
};
