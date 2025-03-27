import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Survey from "@/components/landing/Survey";
import Pricing from "@/components/landing/Pricing";
import Dashboard from "@/components/landing/Dashboard";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [showPricing, setShowPricing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showSurveyFirst, setShowSurveyFirst] = useState(true);
  
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

  // Check URL parameters for direct navigation to sections
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'pricing') {
      setShowSurveyFirst(false);
      setShowPricing(true);
      
      // Scroll to pricing section
      setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoggedIn(true);
      setIsFirstLogin(!user.hasCompletedOnboarding);
    } else {
      setIsLoggedIn(false);
    }
  }, [user]);
  
  // This handler will be passed to the Survey component to collect user email
  const onSurveyCompleted = (email: string) => {
    setUserEmail(email);
    
    // Navigate to waiting list with email parameter
    navigate(`/waiting-list?email=${encodeURIComponent(email)}`);
    
    toast({
      title: "Survey completed!",
      description: "Thank you for your feedback. You've been added to our waiting list.",
    });
  };

  // Check if we should focus on the survey first (default landing experience)
  const renderMainContent = () => {
    if (showSurveyFirst && !isLoggedIn) {
      return (
        <>
          <Hero />
          <Survey onCompleted={onSurveyCompleted} />
          <Features />
          {showPricing && <Pricing userEmail={userEmail} />}
        </>
      );
    } else {
      return (
        <>
          <Hero />
          <Features />
          {!isLoggedIn && <Survey onCompleted={onSurveyCompleted} />}
          {showPricing && <Pricing userEmail={userEmail} />}
        </>
      );
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <Header />
      
      {renderMainContent()}
      
      {/* Show Get Started button for first-time logged-in users */}
      {isLoggedIn && isFirstLogin && (
        <div id="get-started" className="py-16 bg-gradient-to-b from-indigo-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Ready to set up your account?
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
              Complete your onboarding to get the most out of our property management platform.
            </p>
            <div className="mt-8">
              <Link href="/onboarding">
                <Button size="lg" className="px-8 py-3">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {isLoggedIn && <Dashboard />}
      <Footer />
    </div>
  );
}
