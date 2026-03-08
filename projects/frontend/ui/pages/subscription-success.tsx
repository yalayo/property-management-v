import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";

export default function SubscriptionSuccess() {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        // Get the payment intent ID from the URL query parameters
        const url = new URL(window.location.href);
        const paymentIntentId = url.searchParams.get('payment_intent');
        const redirectStatus = url.searchParams.get('redirect_status');

        if (!paymentIntentId) {
          setError("Payment information not found in URL");
          setIsLoading(false);
          return;
        }

        if (redirectStatus !== 'succeeded') {
          setError("Payment was not successful. Please try again or contact support.");
          setIsLoading(false);
          return;
        }

        // Set payment status based on redirect status
        setPaymentStatus(redirectStatus);
        
        // Update the user's tier to 'done_for_you'
        try {
          await apiRequest('POST', '/api/update-user-tier', { tier: 'done_for_you' });
          console.log('User tier updated successfully');
        } catch (error) {
          console.error('Failed to update user tier:', error);
          // Continue with the success page even if tier update fails
        }
        
        // Show success toast
        toast({
          title: "Subscription Activated",
          description: "Your monthly subscription has been set up successfully!",
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error checking subscription status:", err);
        setError("An error occurred while verifying your subscription");
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-[600px] mx-auto">
          <CardHeader>
            <CardTitle>Subscription Verification Failed</CardTitle>
            <CardDescription>We encountered an issue while verifying your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate("/")}>Return Home</Button>
            <Button onClick={() => navigate("/subscribe")}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-[600px] mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle>Subscription Activated!</CardTitle>
          <CardDescription>
            Thank you for subscribing. Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-2">Done For You Plan Activated</h3>
            <p>
              You now have full access to all premium features included in the Done For You plan.
              Your account has been upgraded immediately.
            </p>
          </div>
          
          <p className="mb-4">
            <span className="font-medium">Your subscription details:</span><br />
            €35 will be billed monthly until cancelled<br />
            You can manage your subscription at any time from your account settings
          </p>
          
          <p className="mb-4">
            You will receive a confirmation email shortly with your subscription details.
            If you have any questions, please contact our support team.
          </p>
          
          <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-6">
            <p>
              Payment Status: <span className="font-semibold">{paymentStatus}</span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            Return Home
          </Button>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}