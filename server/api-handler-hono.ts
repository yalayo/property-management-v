import { Env } from './types';
import { app } from './hono-api';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDatabase } from './db-cf';

/**
 * Handle API requests by passing them through our Hono app
 * with robust error handling for Cloudflare Workers
 */
export async function handleApiRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // Make sure db is properly available - should have been initialized in worker.ts
    try {
      // Attempt to access the database to verify it's initialized
      getDatabase();
    } catch (dbError) {
      console.error('API request received, but D1 database not initialized:', dbError);
      return new Response(JSON.stringify({
        error: 'Database connection not available',
        success: false
      }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Pass to Hono app
    return app.fetch(request, env, ctx);
  } catch (error) {
    console.error('Error in API handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}