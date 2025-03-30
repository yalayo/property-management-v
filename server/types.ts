import { D1Database } from '@cloudflare/workers-types';

// Environment variables and bindings for Cloudflare Workers
export interface Env {
  // D1 Database binding - available in production
  DB?: D1Database;
  
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