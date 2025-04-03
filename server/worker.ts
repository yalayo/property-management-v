import { Env } from "./types";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/d1";
import { ExecutionContext } from "@cloudflare/workers-types";
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

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
    
    // Map specific known asset paths to their hashed versions
    const specificAssets: Record<string, string> = {
      '/index.js': 'index.050e646218.js',
      '/assets/index.css': 'public/assets/index.440fa24244.css',
      '/assets/index.js': 'public/assets/index.d47fb2a45d.js',
      '/index.html': 'public/index.7831ed9bd0.html'
    };
    
    // If the path is root, serve index.html
    if (path === "/") {
      path = "/index.html";
    }
    
    // Check if the current URL path matches any of our known assets
    const hashedAssetPath = Object.prototype.hasOwnProperty.call(specificAssets, path) ? specificAssets[path] : undefined;
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
