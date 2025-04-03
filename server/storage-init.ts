import { IStorage } from './storage';
import { CloudflareStorage } from './cloudflare-storage';

// Define a global variable to hold our storage instance
declare global {
  var __STORAGE_INSTANCE: IStorage | undefined;
}

/**
 * Initialize or get the storage instance appropriate for the current environment
 * This function handles the differences between Cloudflare Workers and regular Node.js
 */
export function initStorage(): IStorage {
  // Check if we've already initialized storage
  if (globalThis.__STORAGE_INSTANCE) {
    return globalThis.__STORAGE_INSTANCE;
  }

  // Detect Cloudflare Workers environment
  // Check for both __D1_DB and the absence of 'process' to confirm it's a Cloudflare Worker
  const isCloudflareWorker = typeof globalThis.__D1_DB !== 'undefined' && 
    typeof process === 'undefined';

  // Initialize appropriate storage implementation
  let storageInstance: IStorage;

  if (isCloudflareWorker) {
    console.log('Initializing CloudflareStorage for Cloudflare Workers environment');
    storageInstance = new CloudflareStorage();
  } else {
    // For non-Cloudflare environments, we'll lazily import the regular storage
    // to avoid circular dependencies
    console.log('Initializing standard storage for Node.js environment');
    
    // Dynamic import to avoid circular dependencies
    // This is a bit of a hack, but it works because this code will never
    // be executed in a Cloudflare Worker environment
    // @ts-ignore - we know this will work in a Node.js environment
    const { storage } = require('./storage');
    storageInstance = storage;
  }

  // Cache the storage instance globally
  globalThis.__STORAGE_INSTANCE = storageInstance;
  return storageInstance;
}

// Export a convenience accessor
export const getStorage = (): IStorage => {
  return initStorage();
};