import { useState, useEffect } from "react";
import { Link } from "wouter";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function FeaturesPricing() {
  const [userEmail, setUserEmail] = useState("");

  // Check URL parameters for email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setUserEmail(emailParam);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Simple header */}
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
            <div className="flex items-center">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Survey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
              Features & Pricing
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Explore our comprehensive property management solutions and pricing options
            </p>
          </div>
          
          <Features />
          <Pricing userEmail={userEmail} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}