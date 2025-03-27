import { loadStripe, Stripe } from "@stripe/stripe-js";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    if (!key) {
      console.error("Missing Stripe public key");
      throw new Error("Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY");
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// Format amount for display
export const formatAmountForDisplay = (
  amount: number,
  currency: string = "EUR"
): string => {
  const numberFormat = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  });
  return numberFormat.format(amount);
};

// Convert amount for Stripe (multiply by 100)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};
