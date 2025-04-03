import { Env } from './types';
import { app } from './hono-api';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDatabase } from './db-cf';
import { initStorage } from './storage-init';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../shared/schema';

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
    // Mark the environment as a Cloudflare Worker
    globalThis.__IS_CLOUDFLARE_WORKER = true;
    
    // Check if we need to initialize D1 database (only needed in Cloudflare Workers)
    if (env.DB && !globalThis.__D1_DB) {
      try {
        // Create Drizzle instance with schema and D1 database
        const db = drizzle(env.DB, { schema });
        
        // Store the database instance globally for access across the application
        globalThis.__D1_DB = db;
        
        console.log('Hono API: D1 database binding initialized successfully');
      } catch (dbInitError) {
        console.error('Failed to initialize D1 database for Hono API:', dbInitError);
        return new Response(JSON.stringify({
          error: 'Failed to initialize database',
          success: false
        }), { 
          status: 503,
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Verify db access and initialize storage
    try {
      // This will throw an error if the database is not properly initialized
      const db = getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }
      
      // Initialize storage for API requests
      initStorage();
    } catch (dbError) {
      console.error('API request received, but database not properly initialized:', dbError);
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