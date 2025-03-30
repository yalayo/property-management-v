import Stripe from "stripe";
import { storage } from "../storage";
import { stripe as stripeInstance } from "../utils/stripeConfig";

/**
 * Gets the Stripe instance from the centralized configuration
 * This ensures consistent Stripe usage throughout the application
 */
function getStripe(): Stripe {
  return stripeInstance;
}

// Enum for payment gateways
export enum PaymentGateway {
  STRIPE = "stripe",
  PAYPAL = "paypal",
}

// Track the last used gateway for round-robin selection
let lastUsedGateway: PaymentGateway | null = null;

/**
 * Selects the next payment gateway in round-robin fashion
 * @returns The selected payment gateway
 */
export function selectNextGateway(): PaymentGateway {
  // If this is the first selection or lastUsedGateway is Stripe, use PayPal
  if (lastUsedGateway === null || lastUsedGateway === PaymentGateway.STRIPE) {
    lastUsedGateway = PaymentGateway.PAYPAL;
  } else {
    // Otherwise, use Stripe
    lastUsedGateway = PaymentGateway.STRIPE;
  }
  return lastUsedGateway;
}

/**
 * Create a payment with Stripe
 * @param amount Amount in euros
 * @param metadata Additional metadata
 * @returns Payment Intent details
 */
export async function createStripePayment(amount: number, metadata: Record<string, any> = {}) {
  try {
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "eur",
      metadata,
    });
    return {
      gateway: PaymentGateway.STRIPE,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error("Stripe payment creation error:", error);
    throw new Error(`Error creating Stripe payment: ${error.message}`);
  }
}

/**
 * Create a PayPal payment (simulated for now)
 * @param amount Amount in euros
 * @param metadata Additional metadata
 * @returns PayPal Order ID details
 */
export async function createPayPalPayment(amount: number, metadata: Record<string, any> = {}) {
  try {
    // This is a placeholder for actual PayPal integration
    // In a real implementation, we would use the PayPal SDK
    
    // Generate a mock PayPal order ID
    const mockOrderId = `PAYPAL-ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Instead of trying to use the storage interface, which isn't fully implemented yet,
    // we'll just log the PayPal order info for now.
    // 
    // TODO: Add PayPal order methods to IStorage interface and implement in DatabaseStorage class
    console.log("PayPal order created:", {
      orderId: mockOrderId,
      amount,
      status: "CREATED",
      metadata,
    });
    
    return {
      gateway: PaymentGateway.PAYPAL,
      orderId: mockOrderId,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}`,
    };
  } catch (error: any) {
    console.error("PayPal payment creation error:", error);
    throw new Error(`Error creating PayPal payment: ${error.message}`);
  }
}

/**
 * Process a payment using the next available gateway in round-robin fashion
 * @param amount Amount in euros
 * @param metadata Additional metadata
 * @returns Payment details from the selected gateway
 */
export async function processPayment(amount: number, metadata: Record<string, any> = {}) {
  const gateway = selectNextGateway();
  
  switch (gateway) {
    case PaymentGateway.STRIPE:
      return await createStripePayment(amount, metadata);
    case PaymentGateway.PAYPAL:
      return await createPayPalPayment(amount, metadata);
    default:
      throw new Error(`Unsupported payment gateway: ${gateway}`);
  }
}

/**
 * Create a subscription using Stripe
 * @param customerId Stripe customer ID
 * @param priceId Stripe price ID
 * @returns Subscription details
 */
export async function createSubscription(customerId: string, priceData: {
  amount: number;
  productName: string;
  productDescription: string;
}) {
  try {
    const subscription = await getStripe().subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: priceData.productName,
              description: priceData.productDescription,
            },
            unit_amount: Math.round(priceData.amount * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          } as any, // Type assertion to avoid TS errors due to Stripe SDK version differences
        },
      ],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
    
    // Cast the latest_invoice to any to access payment_intent which might be missing in TypeScript definitions
    const latestInvoice = subscription.latest_invoice as any;
    const paymentIntent = latestInvoice?.payment_intent;
    
    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret,
      status: subscription.status,
    };
  } catch (error: any) {
    console.error("Subscription creation error:", error);
    throw new Error(`Error creating subscription: ${error.message}`);
  }
}