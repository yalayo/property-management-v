import { Env } from './types';
import * as schema from '../shared/schema';
import { drizzle } from 'drizzle-orm/d1';
import { ExecutionContext } from '@cloudflare/workers-types';

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize D1 database connection when in production
    if (env.NODE_ENV === 'production' && env.DB) {
      const db = drizzle(env.DB, { schema });
      
      // Set DB instance in a global variable or context
      // This is where you'd adapt your database connection logic
      // We'll use this in our adapted storage.ts file
      ctx.waitUntil(Promise.resolve().then(() => {
        // @ts-ignore - making the DB available to our adapters
        globalThis.__D1_DB = db;
      }));
    }

    // Handle the request - you'd adapt your Express app to work with Workers
    // This is a simplified example
    // In a real implementation, you'd need to adapt your Express routes to Workers
    
    try {
      // For API requests
      if (request.url.includes('/api/')) {
        // Handle API routing here
        return new Response('API endpoint', { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      const url = new URL(request.url)
      let path = url.pathname === '/' ? '/index.html' : url.pathname

      // Adjust if the path should be relative to the 'dist' directory
      const filePath = `./dist${path}`
      const file = await fetch(filePath)

      // Check if file is found
      if (file.ok) {
        return file
      }

      // If file is not found, return a 404 page
      return new Response('Not Found', { status: 404 })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(`Error: ${errorMessage}`, { status: 500 });
    }
  },
};