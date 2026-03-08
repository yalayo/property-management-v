import { Link } from "wouter";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle2, Star, Gift, Calendar, Shield, Wrench, Book, Headphones } from "lucide-react";

interface PricingProps {
  userEmail?: string;
}

export default function Pricing({ userEmail }: PricingProps) {
  const tiers = [
    {
      name: "Done for You",
      id: "done_for_you",
      priceMonthly: "€35",
      frequency: "/mo",
      description: "Perfect for landlords who want a fully managed solution.",
      features: [
        "Full system access",
        "Automated communications",
        "Payment tracking",
        "Regular updates"
      ],
      icon: <Calendar className="h-10 w-10 text-indigo-500" />,
      cta: "Subscribe",
      color: "from-indigo-600 to-blue-500",
      mostPopular: false
    },
    {
      name: "Done with You",
      id: "done_with_you",
      priceMonthly: "€2,700",
      frequency: "/one-time",
      description: "Ideal for landlords who want initial setup assistance.",
      features: [
        "Full system access",
        "Personalized setup assistance",
        "Data migration",
        "Training sessions"
      ],
      icon: <Star className="h-10 w-10 text-purple-500" />,
      cta: "Get Started",
      color: "from-purple-600 to-indigo-500",
      mostPopular: true
    },
    {
      name: "Done by You",
      id: "done_by_you",
      priceMonthly: "€950",
      frequency: "/installation",
      description: "For hands-on landlords who want full control.",
      features: [
        "System installation",
        "Basic configuration",
        "Documentation",
        "Pay-per-hour support"
      ],
      icon: <Wrench className="h-10 w-10 text-blue-500" />,
      cta: "Purchase",
      color: "from-blue-600 to-cyan-500",
      mostPopular: false
    }
  ];

  const featureIcons = {
    "Full system access": <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Automated communications": <Headphones className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Payment tracking": <Calendar className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Regular updates": <Gift className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Personalized setup assistance": <Wrench className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Data migration": <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Training sessions": <Book className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "System installation": <Wrench className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Basic configuration": <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Documentation": <Book className="flex-shrink-0 h-5 w-5 text-green-500" />,
    "Pay-per-hour support": <Headphones className="flex-shrink-0 h-5 w-5 text-green-500" />
  };

  return (
    <div id="pricing" className="py-16 bg-gradient-to-b from-white via-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h2 className="text-base bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 font-semibold tracking-wide uppercase text-center">Pricing Plans</h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl text-center">
            Choose the right plan for your needs
          </p>
          {userEmail && (
            <p className="mt-3 text-md font-medium text-purple-600 text-center">
              Personalized pricing for {userEmail}
            </p>
          )}
          <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto text-center">
            We offer flexible options to suit different management styles and property portfolios.
          </p>
        </div>

        <div className="mt-12 space-y-6 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {tiers.map((tier) => (
            <Card 
              key={tier.name}
              className={tier.mostPopular 
                ? "border-purple-300 shadow-xl transform hover:scale-105 transition-transform duration-300" 
                : "border-indigo-100 shadow-lg hover:shadow-xl transform hover:scale-102 transition-transform duration-300"
              }
            >
              <CardHeader className={tier.mostPopular ? "bg-gradient-to-br from-purple-50 to-indigo-50" : ""}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    {tier.icon}
                    <CardTitle className={`text-xl font-bold ${tier.mostPopular ? "text-purple-800" : "text-gray-900"}`}>
                      {tier.name}
                    </CardTitle>
                  </div>
                  {tier.mostPopular && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                      Popular
                    </span>
                  )}
                </div>
                <CardDescription className="mt-4 text-sm text-gray-500">
                  {tier.description}
                </CardDescription>
                <div className="mt-8">
                  <span className={`text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${tier.color}`}>
                    {tier.priceMonthly}
                  </span>
                  <span className="text-base font-medium text-gray-500">{tier.frequency}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">What's included</h4>
                <ul className="mt-6 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex space-x-3 items-center">
                      {featureIcons[feature as keyof typeof featureIcons] || 
                        <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />}
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="px-6 pt-0 pb-6">
                <Link href={`/payment/${tier.id}${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`} className="block w-full">
                  <Button
                    className={`w-full bg-gradient-to-r ${tier.color} hover:shadow-lg hover:opacity-90 transition-all duration-200`}
                    variant="default"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Crowdfunding option */}
        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl overflow-hidden shadow-lg divide-y divide-indigo-100 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px">
          <div className="px-8 py-10 sm:col-span-2">
            <div className="flex items-center space-x-4 mb-4">
              <Gift className="h-10 w-10 text-purple-500" />
              <h3 className="text-2xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Support Our Development</h3>
            </div>
            <p className="mt-2 text-md text-gray-600">
              Make a one-time, lifetime contribution of <span className="font-semibold text-purple-700">€370</span> to support our system development and get lifetime access to all current and future features.
            </p>
            <div className="mt-6">
              <Link href={`/payment/crowdfunding${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`}>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:opacity-90 transition-all duration-200">
                  Make a Contribution
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
