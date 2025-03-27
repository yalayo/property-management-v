import { useState } from "react";
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
      <Dashboard />
      <Footer />
    </div>
  );
}
