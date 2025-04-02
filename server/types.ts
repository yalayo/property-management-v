import { D1Database } from '@cloudflare/workers-types';

// Environment variables and bindings for Cloudflare Workers
export interface Env {
  // D1 Database binding - available in production
  DB?: D1Database;
  
  // Static content KV namespace - available in production
  __STATIC_CONTENT?: {
    fetch: (request: Request) => Promise<Response>;
    // Add KV methods that might be needed for asset management
    list?: (options?: { prefix?: string, limit?: number, cursor?: string }) => Promise<{ keys: { name: string }[], list_complete: boolean, cursor?: string }>;
    get?: (key: string, options?: any) => Promise<string | null>;
    put?: (key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: any) => Promise<void>;
  };
  
  // For backward compatibility - alias to __STATIC_CONTENT
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
    list?: (options?: { prefix?: string, limit?: number, cursor?: string }) => Promise<{ keys: { name: string }[], list_complete: boolean, cursor?: string }>;
    get?: (key: string, options?: any) => Promise<string | null>;
    put?: (key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: any) => Promise<void>;
  };
  
  // Environment variables
  NODE_ENV: string;
  STRIPE_SECRET_KEY?: string;
  VITE_STRIPE_PUBLIC_KEY?: string;
  GOOGLE_GEMINI_API_KEY?: string;
  
  // Add other environment variables used in your application
}

// Extend global scope to make D1 database available globally
// This is a workaround to adapt the existing code to Cloudflare Workers
declare global {
  var __D1_DB: any;
}