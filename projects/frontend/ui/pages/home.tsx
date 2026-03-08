import React from "react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Footer from "../components/landing/Footer";
import { useToast } from "../hooks/use-toast";

export default function Home(props) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const isLoggedIn = props.isLoggedIn;
  const user = props.user;
  
  // This handler will be called when the survey is completed
  const onSurveyCompleted = (email: string) => {
    // Navigate to waiting list with email parameter
    navigate(`/waiting-list?email=${encodeURIComponent(email)}`);
    
    toast({
      title: "Survey completed!",
      description: "Thank you for your feedback. You've been added to our waiting list.",
    });
  };

  if (isLoggedIn) {
    return null; // Will redirect to dashboard
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <main className="pt-8 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
                PropManager
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              The property management solution for German landlords
            </p>
          </div>
        </div>
        
        {props.children}
      </main>
      
      <Footer />
    </div>
  );
}
