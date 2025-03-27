import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

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
function CheckoutForm({ tierName }: { tierName: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/dashboard",
      },
    });

    if (error) {
      setErrorMessage(error.message || "An unknown error occurred");
      toast({
        title: "Payment Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
    }

    setIsProcessing(false);
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
        {isProcessing ? "Processing..." : `Pay ${tiers[tierName as keyof typeof tiers]?.price}`}
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

  // Create payment intent when component mounts
  useEffect(() => {
    if (!tier || !Object.keys(tiers).includes(tier)) return;

    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const selectedTier = tiers[tier as keyof typeof tiers];
        
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: selectedTier.amount / 100, // Convert to euros from cents
          tier: tier
        });
        
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

    createPaymentIntent();
  }, [tier, toast]);

  if (!tier || !Object.keys(tiers).includes(tier)) {
    return null; // Will redirect in useEffect
  }

  const selectedTier = tiers[tier as keyof typeof tiers];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/#pricing" className="inline-flex items-center text-primary-600 hover:text-primary-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to pricing plans
          </Link>
        </div>

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
                <CheckoutForm tierName={tier} />
              </Elements>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
