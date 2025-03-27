import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Survey from "@/components/landing/Survey";
import Pricing from "@/components/landing/Pricing";
import Dashboard from "@/components/landing/Dashboard";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const [showPricing, setShowPricing] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
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
    setIsLoggedIn(!!user);
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
      <Survey onCompleted={onSurveyCompleted} />
      {showPricing && <Pricing userEmail={userEmail} />}
      {isLoggedIn && <Dashboard />}
      <Footer />
    </div>
  );
}
