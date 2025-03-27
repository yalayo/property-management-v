import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight, CreditCard } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Modern header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <div className="bg-primary/10 rounded-md p-1.5">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <span className="ml-2 text-xl font-bold text-slate-800">PropManager</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with background pattern */}
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
            <div className="max-w-lg mx-auto">
              <WaitingListConfirmation email={email} />
              
              {/* Call to action buttons */}
              <div className="mt-10 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    Ready to get started?
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Choose from our available plans or return to the homepage
                  </p>
                  
                  <div className="space-y-3">
                    <Link href="/features-pricing">
                      <Button className="w-full justify-between group" size="lg">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span>View features & pricing</span>
                        </div>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                    
                    <Link href="/">
                      <Button variant="outline" className="w-full justify-between group" size="lg">
                        <div className="flex items-center">
                          <Home className="mr-2 h-4 w-4" />
                          <span>Return to home page</span>
                        </div>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} PropManager GmbH. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
