import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { AlertCircle, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "../../lib/queryClient";
import PostPaymentRegistration from "../payment/PostPaymentRegistration";

// Initialize Stripe with the public key, not the secret key
import { getStripe } from "../../lib/stripe";
const stripePromise = getStripe();

// Payment tiers configuration
const tiers = {
  done_for_you: {
    name: "Done for You",
    description: "Monthly subscription plan",
    price: "€35/month",
    amount: 3500, // in cents
  },
  done_with_you: {
    name: "Done with You",
    description: "One-time payment plan",
    price: "€2,700",
    amount: 270000, // in cents
  },
  done_by_you: {
    name: "Done by You",
    description: "Installation and configuration",
    price: "€950",
    amount: 95000, // in cents
  },
  crowdfunding: {
    name: "Lifetime Contribution",
    description: "Support system development",
    price: "€370",
    amount: 37000, // in cents
  }
};

// Payment form component
function CheckoutForm({ tierName, onPaymentSuccess }: { tierName: string; onPaymentSuccess: (paymentIntentId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isSubscription = tierName === 'done_for_you';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (isSubscription) {
        // For subscriptions, handle setup intent
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: window.location.origin + "/payment-success",
          },
        });

        if (error) {
          throw new Error(error.message || "An unknown error occurred");
        }

        if (setupIntent && setupIntent.status === "succeeded") {
          // Setup succeeded, now create the subscription using the payment method
          const result = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethodId: setupIntent.payment_method,
            })
          });

          if (!result.ok) {
            const data = await result.json();
            throw new Error(data.message || "Error creating subscription");
          }

          const subscription = await result.json();
          
          toast({
            title: "Subscription Activated",
            description: "Your subscription has been activated successfully!",
          });
          
          onPaymentSuccess(subscription.subscriptionId);
        }
      } else {
        // For one-time payments, handle payment intent
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            // We'll handle redirect in our own component
            return_url: window.location.origin + "/payment-success",
          },
        });

        if (error) {
          throw new Error(error.message || "An unknown error occurred");
        }

        if (paymentIntent && paymentIntent.status === "succeeded") {
          // Payment succeeded! Call the callback with the payment intent ID
          toast({
            title: "Payment Successful",
            description: "Thank you for your purchase!",
          });
          onPaymentSuccess(paymentIntent.id);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || "An unknown error occurred");
      toast({
        title: "Payment Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700 text-sm">{errorMessage}</span>
          </div>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${tiers[tierName as keyof typeof tiers]?.price}`
        )}
      </Button>
    </form>
  );
}

export default function Payment() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const tier = params.tier;

  // Validate tier parameter
  useEffect(() => {
    if (!tier || !Object.keys(tiers).includes(tier)) {
      navigate("/");
      toast({
        title: "Invalid plan",
        description: "The selected plan is not valid.",
        variant: "destructive",
      });
    }
  }, [tier, navigate, toast]);

  // Create payment intent or subscription setup intent when component mounts
  useEffect(() => {
    if (!tier || !Object.keys(tiers).includes(tier)) return;

    const initializePayment = async () => {
      try {
        setIsLoading(true);
        const selectedTier = tiers[tier as keyof typeof tiers];
        let response;
        
        // If this is a subscription (Done for You tier), handle differently
        if (tier === 'done_for_you') {
          // For subscriptions, we need to create a setup intent
          response = await apiRequest("POST", "/api/create-payment-intent", {
            amount: selectedTier.amount / 100, // Convert to euros from cents
            tier: tier
          });
        } else {
          // For one-time payments, create a payment intent
          response = await apiRequest("POST", "/api/create-payment-intent", {
            amount: selectedTier.amount / 100, // Convert to euros from cents
            tier: tier
          });
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError("Failed to initialize payment. Please try again later.");
        toast({
          title: "Payment Error",
          description: "Could not initialize payment process. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [tier, toast]);

  // Handle successful payment or setup
  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentSuccessful(true);
    setPaymentIntentId(paymentId);
  };

  if (!tier || !Object.keys(tiers).includes(tier)) {
    return null; // Will redirect in useEffect
  }

  const selectedTier = tiers[tier as keyof typeof tiers];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        {!paymentSuccessful && (
          <div className="mb-8">
            <Link href="/#pricing" className="inline-flex items-center text-primary-600 hover:text-primary-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to pricing plans
            </Link>
          </div>
        )}

        {paymentSuccessful && paymentIntentId ? (
          // Show registration form after successful payment
          <PostPaymentRegistration 
            tier={tier} 
            paymentIntentId={paymentIntentId} 
          />
        ) : (
          // Show payment form
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {selectedTier.name}
              </CardTitle>
              <CardDescription>
                {selectedTier.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold text-gray-900">{selectedTier.price}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {tier === 'done_for_you' 
                    ? 'Billed monthly. Cancel anytime.' 
                    : 'One-time payment.'}
                </div>
              </div>

              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 w-full"
                  >
                    Try Again
                  </Button>
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    tierName={tier} 
                    onPaymentSuccess={handlePaymentSuccess} 
                  />
                </Elements>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
