import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Survey from "@/components/landing/Survey";
import Pricing from "@/components/landing/Pricing";
import Dashboard from "@/components/landing/Dashboard";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showPricing, setShowPricing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  
  // Check if the user is logged in
  const { data: user } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => 
      fetch('/api/me')
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .catch(() => null),
    retry: false
  });

  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
      // Check if this is the user's first login (for the "Get Started" button)
      // Here, we're checking if the user has any properties yet as a proxy for "first login"
      // In a real app, you might store a 'firstLogin' flag in the user's profile
      setIsFirstLogin(!user.hasCompletedOnboarding);
    } else {
      setIsLoggedIn(false);
    }
  }, [user]);
  
  // This handler will be passed to the Survey component to collect user email
  const onSurveyCompleted = (email: string) => {
    setUserEmail(email);
    setShowPricing(true);
    
    // Scroll to pricing section after survey completion
    setTimeout(() => {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 500);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      <Header />
      <Hero />
      <Features />
      
      {/* Show Survey for non-logged in users */}
      {!isLoggedIn && (
        <Survey onCompleted={onSurveyCompleted} />
      )}
      
      {/* Show Get Started button for first-time logged-in users */}
      {isLoggedIn && isFirstLogin && (
        <div id="get-started" className="py-16 bg-gradient-to-b from-indigo-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Ready to set up your account?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Complete your onboarding to get the most out of our property management platform.
            </p>
            <div className="mt-8">
              <Link href="/onboarding">
                <Button size="lg" className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {showPricing && <Pricing userEmail={userEmail} />}
      {isLoggedIn && <Dashboard />}
      <Footer />
    </div>
  );
}
