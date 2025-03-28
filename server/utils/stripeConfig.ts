import Stripe from 'stripe';

// Environment-specific configuration
const getStripeConfig = () => {
  // Check if we're in production mode
  const isProd = process.env.NODE_ENV === 'production';
  
  // Use appropriate Stripe keys based on environment
  const secretKey = isProd 
    ? process.env.STRIPE_SECRET_KEY_PROD 
    : process.env.STRIPE_SECRET_KEY;
  
  // Ensure key exists
  if (!secretKey) {
    const envVar = isProd ? 'STRIPE_SECRET_KEY_PROD' : 'STRIPE_SECRET_KEY';
    console.error(`Missing Stripe secret key: ${envVar}`);
    throw new Error(`Missing required Stripe secret key: ${envVar}`);
  }
  
  // Return Stripe instance
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as any, // Force type to avoid version mismatch issues
  });
};

// Create and export the Stripe instance
let stripe: Stripe;

try {
  stripe = getStripeConfig();
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
  // Initialize with a fallback that will throw clear errors when used
  stripe = new Proxy({} as Stripe, {
    get: (_target, prop) => {
      return () => { 
        throw new Error(`Stripe not initialized. Cannot access ${String(prop)}`); 
      };
    }
  });
}

export { stripe };