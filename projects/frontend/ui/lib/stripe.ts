import { loadStripe, Stripe } from "@stripe/stripe-js";

// Public keys are safe to include client-side.
// Use test key in dev, live key in prod.
const STRIPE_PUBLIC_KEY_DEV  = "pk_test_51TAVxzPPxtRLtqH5dh1XbriAke1cBFOIbEVcfbNqE4lah9JkVFc5oZsq0yxvT1vtddLy5iIIOOsF2EvcFBcknCdR00gpJpHmoV";
const STRIPE_PUBLIC_KEY_PROD = "pk_test_51TAVxzPPxtRLtqH5dh1XbriAke1cBFOIbEVcfbNqE4lah9JkVFc5oZsq0yxvT1vtddLy5iIIOOsF2EvcFBcknCdR00gpJpHmoV";

function getPublicKey(): string {
  const host = typeof window !== "undefined" ? window.location.host : "";
  return host.includes("miete.busqandote.com")
    ? STRIPE_PUBLIC_KEY_PROD
    : STRIPE_PUBLIC_KEY_DEV;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe(): ReturnType<typeof loadStripe> {
  if (!stripePromise) {
    stripePromise = loadStripe(getPublicKey());
  }
  return stripePromise;
}
