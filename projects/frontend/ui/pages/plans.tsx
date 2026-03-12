import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { CheckCircle2, Star, Calendar, Wrench, Gift, ArrowRight, LayoutDashboard } from "lucide-react";

const tiers = [
  {
    id: "done_for_you",
    name: "Done for You",
    price: "€35",
    frequency: "/mo",
    description: "Perfect for landlords who want a fully managed solution.",
    features: ["Full system access", "Automated communications", "Payment tracking", "Regular updates"],
    icon: <Calendar className="h-8 w-8 text-indigo-500" />,
    cta: "Subscribe",
    color: "from-indigo-600 to-blue-500",
    popular: false,
  },
  {
    id: "done_with_you",
    name: "Done with You",
    price: "€2,700",
    frequency: "/one-time",
    description: "Ideal for landlords who want initial setup assistance.",
    features: ["Full system access", "Personalized setup", "Data migration", "Training sessions"],
    icon: <Star className="h-8 w-8 text-purple-500" />,
    cta: "Get Started",
    color: "from-purple-600 to-indigo-500",
    popular: true,
  },
  {
    id: "done_by_you",
    name: "Done by You",
    price: "€950",
    frequency: "/installation",
    description: "For hands-on landlords who want full control.",
    features: ["System installation", "Basic configuration", "Documentation", "Pay-per-hour support"],
    icon: <Wrench className="h-8 w-8 text-blue-500" />,
    cta: "Purchase",
    color: "from-blue-600 to-cyan-500",
    popular: false,
  },
];

export default function Plans(props) {
  const user = props.user;
  const onSelectPlan = props.onSelectPlan;
  const onSkip = props.onSkip;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-md p-1.5">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-slate-800">PropManager</span>
          </div>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-slate-500">
              Skip for now
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </h1>
          <p className="text-slate-600 text-lg">
            Choose a plan to get started with your property management.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={
                tier.popular
                  ? "border-purple-300 shadow-xl relative"
                  : "border-slate-200 shadow-md"
              }
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className={tier.popular ? "bg-gradient-to-br from-purple-50 to-indigo-50 pt-6" : "pt-6"}>
                <div className="flex items-center gap-3 mb-2">
                  {tier.icon}
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </div>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className={`text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${tier.color}`}>
                    {tier.price}
                  </span>
                  <span className="text-sm text-slate-500">{tier.frequency}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90`}
                  onClick={() => onSelectPlan && onSelectPlan(tier.id)}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Crowdfunding */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Gift className="h-8 w-8 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-slate-900">Support Our Development</h3>
              <p className="text-sm text-slate-600">
                One-time <span className="font-semibold text-purple-700">€370</span> contribution — lifetime access to all features.
              </p>
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90 shrink-0"
            onClick={() => onSelectPlan && onSelectPlan("crowdfunding")}
          >
            Contribute
          </Button>
        </div>

        {/* Skip link */}
        {onSkip && (
          <p className="text-center mt-8 text-sm text-slate-500">
            Not ready yet?{" "}
            <button onClick={onSkip} className="text-primary hover:underline font-medium">
              Go to your dashboard
            </button>
          </p>
        )}
      </main>
    </div>
  );
}
