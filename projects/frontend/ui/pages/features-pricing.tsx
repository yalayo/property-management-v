import React from "react";
import { useState, useEffect } from "react";
import Features from "../components/landing/Features";
import Pricing from "../components/landing/Pricing";
import Footer from "../components/landing/Footer";
import { Button } from "../components/ui/button";
import { Home, LogIn, UserPlus, CheckCircle2 } from "lucide-react";

export default function FeaturesPricing(props) {
  const [userEmail, setUserEmail] = useState(props.email || "");
  const onSignIn     = props.onSignIn;
  const onSignUp     = props.onSignUp;
  const onGoHome     = props.onGoHome;
  const onSelectPlan = props.onSelectPlan;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setUserEmail(emailParam);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex items-center cursor-pointer" onClick={onGoHome}>
                <div className="bg-primary/10 rounded-md p-1.5">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <span className="ml-2 text-xl font-bold text-slate-800">PropManager</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onSignIn && (
                <Button variant="outline" size="sm" onClick={onSignIn}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
              {onSignUp && (
                <Button size="sm" onClick={onSignUp}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Welcome banner for users who joined the waiting list */}
        {userEmail && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                You're on the waiting list! We'll notify{" "}
                <span className="font-bold">{userEmail}</span> when your account is ready.
              </p>
            </div>
          </div>
        )}

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
          <Pricing userEmail={userEmail} onSelectPlan={onSelectPlan} />
        </div>

        {/* Bottom CTA */}
        {(onSignIn || onSignUp) && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-indigo-100 text-lg mb-8">
                Create your account today and start managing your properties efficiently.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {onSignUp && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={onSignUp}
                    className="font-semibold"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Create Free Account
                  </Button>
                )}
                {onSignIn && (
                  <Button
                    size="lg"
                    onClick={onSignIn}
                    className="font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/30"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
