import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Pricing() {
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
      cta: "Subscribe",
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
      cta: "Get Started",
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
      cta: "Purchase",
      mostPopular: false
    }
  ];

  return (
    <div id="pricing" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h2 className="text-base font-semibold text-primary-600 tracking-wide uppercase text-center">Pricing</h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl text-center">
            Choose the right plan for your needs
          </p>
          <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto text-center">
            We offer flexible options to suit different management styles and property portfolios.
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {tiers.map((tier) => (
            <Card 
              key={tier.name}
              className={tier.mostPopular ? "border-primary-500 shadow-md" : "border-gray-200 shadow-sm"}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg leading-6 font-medium text-gray-900">{tier.name}</CardTitle>
                  {tier.mostPopular && (
                    <span className="inline-flex px-4 py-0.5 rounded-full text-xs font-semibold leading-5 bg-primary-100 text-primary-800">
                      Popular
                    </span>
                  )}
                </div>
                <CardDescription className="mt-4 text-sm text-gray-500">
                  {tier.description}
                </CardDescription>
                <div className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">{tier.priceMonthly}</span>
                  <span className="text-base font-medium text-gray-500">{tier.frequency}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">What's included</h4>
                <ul className="mt-6 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={`/payment/${tier.id}`} className="block w-full">
                  <Button
                    className="w-full"
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
        <div className="mt-12 bg-primary-50 rounded-lg overflow-hidden shadow divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px">
          <div className="px-6 py-8 sm:col-span-2">
            <h3 className="text-lg font-medium text-gray-900">Support Our Development</h3>
            <p className="mt-2 text-sm text-gray-500">
              Make a one-time, lifetime contribution of €370 to support our system development and get lifetime access.
            </p>
            <div className="mt-6">
              <Link href="/payment/crowdfunding">
                <Button>
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
