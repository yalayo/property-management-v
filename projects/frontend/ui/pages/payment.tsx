import React, { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { getStripe } from "../lib/stripe";

const stripePromise = getStripe();

const TIERS: Record<string, { name: string; description: string; price: string }> = {
  done_for_you:  { name: "Done for You",         description: "Monthly subscription",          price: "€35/month" },
  done_with_you: { name: "Done with You",         description: "One-time payment",              price: "€2,700"    },
  done_by_you:   { name: "Done by You",           description: "Installation & configuration",  price: "€950"      },
  crowdfunding:  { name: "Lifetime Contribution", description: "Support system development",    price: "€370"      },
};

type CheckoutFormProps = {
  tier: string;
  intentType: "payment" | "setup";
  onSuccess: (intentId: string) => void;
};

function CheckoutForm({ tier, intentType, onSuccess }: CheckoutFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    try {
      if (intentType === "setup") {
        const { error: stripeErr, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        });
        if (stripeErr) throw new Error(stripeErr.message);
        if (setupIntent?.status === "succeeded") onSuccess(setupIntent.id);
      } else {
        const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        });
        if (stripeErr) throw new Error(stripeErr.message);
        if (paymentIntent?.status === "succeeded") onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setError(err.message ?? "An unknown error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={!stripe || processing}>
        {processing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
        ) : (
          `Pay ${TIERS[tier]?.price ?? ""}`
        )}
      </Button>
    </form>
  );
}

type Props = {
  tier: string;
  clientSecret: string | null;
  isLoadingSecret: boolean;
  secretError: string | null;
  intentType: "payment" | "setup";
  onBack: () => void;
  onPaymentSuccess: (intentId: string) => void;
};

export default function Payment({ tier, clientSecret, isLoadingSecret, secretError, intentType, onBack, onPaymentSuccess }: Props) {
  const tierInfo = TIERS[tier];
  if (!tierInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4">
        <button onClick={onBack} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="mr-1 h-4 w-4" />Back to pricing
        </button>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{tierInfo.name}</CardTitle>
            <CardDescription>{tierInfo.description}</CardDescription>
            <div className="mt-2">
              <span className="text-3xl font-bold">{tierInfo.price}</span>
              {tier === "done_for_you" && <span className="text-sm text-slate-500 ml-1">Billed monthly. Cancel anytime.</span>}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSecret ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
            ) : secretError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <span className="text-red-700">{secretError}</span>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm tier={tier} intentType={intentType} onSuccess={onPaymentSuccess} />
              </Elements>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
