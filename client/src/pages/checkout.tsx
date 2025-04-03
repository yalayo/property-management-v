import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from 'wouter';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  
  // Get the tier from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tier = urlParams.get('tier') || 'doneByYou';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Include the tier in the success URL
          return_url: `${window.location.origin}/payment-success?tier=${tier}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Thank you for your purchase!",
        });
      }
    } catch (err) {
      toast({
        title: "An error occurred",
        description: "Please try again later",
        variant: "destructive",
      });
      console.error("Payment error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isSubmitting} 
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierName, setTierName] = useState("Done By You");
  const [amount, setAmount] = useState(950);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const fetchPaymentIntent = async () => {
      try {
        setIsLoading(true);
        
        // Get tier and amount from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const tier = urlParams.get('tier') || 'doneByYou';
        const amountParam = urlParams.get('amount');
        
        // Convert amount to number with a fallback to the default amount
        let paymentAmount = 950; // Default amount (Done By You tier)
        if (amountParam) {
          const parsedAmount = parseFloat(amountParam);
          if (!isNaN(parsedAmount)) {
            paymentAmount = parsedAmount;
          }
        }
        
        // Set the tier name based on the tier ID for display purposes
        let displayTierName = "Done By You";
        if (tier === 'doneWithYou') {
          displayTierName = "Done With You";
        } else if (tier === 'doneForYou') {
          displayTierName = "Done For You";
        }
        
        setTierName(displayTierName);
        setAmount(paymentAmount);
        
        // Create payment intent with the specified tier and amount
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          amount: paymentAmount,
          tier: tier
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.message || "Failed to create payment intent");
          toast({
            title: "Payment Error",
            description: data.message || "Failed to initialize payment",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error creating payment intent:", err);
        setError("Failed to connect to payment service");
        toast({
          title: "Connection Error",
          description: "Could not connect to payment service",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Preparing your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Payment Error</CardTitle>
            <CardDescription>We encountered a problem setting up your payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-[600px] mx-auto">
        <CardHeader>
          <CardTitle>{tierName} Plan - €{amount}</CardTitle>
          <CardDescription>
            One-time payment for the {tierName} plan. Secure payment processing by Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}