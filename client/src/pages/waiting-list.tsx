import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Clock } from "lucide-react";
import WaitingListConfirmation from "@/components/waiting-list/WaitingListConfirmation";

export default function WaitingList() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState<string | null>(null);
  
  // Check URL parameters for email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  // Check waiting list position if email is available
  const { data: waitingListPosition, isLoading } = useQuery({
    queryKey: ['/api/waiting-list/check', email],
    queryFn: () => {
      if (!email) return null;
      return fetch(`/api/waiting-list/check?email=${encodeURIComponent(email)}`)
        .then(res => res.json());
    },
    enabled: !!email
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/">
                <div className="flex-shrink-0 flex items-center cursor-pointer">
                  <svg className="h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span className="ml-2 text-xl font-semibold text-gray-800">PropManager</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <WaitingListConfirmation email={email} />

          <div className="mt-10 flex flex-col items-center justify-center">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Choose how you want to get started
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                You can wait for early access or get started right away with one of our plans
              </p>
            </div>

            <div className="space-y-4 w-full">
              <Link href="/#pricing">
                <Button className="w-full flex items-center justify-between" size="lg">
                  <span>View pricing options</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full flex items-center justify-between" size="lg">
                  <span>Return to home page</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-500">
            &copy; 2023 PropManager GmbH. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
