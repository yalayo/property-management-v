import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle2, Star, Gift, Calendar, Shield, Wrench, Book, Headphones } from "lucide-react";

interface PricingProps {
  userEmail?: string;
  onSelectPlan?: (tierId: string) => void;
}

// Static icon mapping by tier id + feature index (language-independent)
const tierFeatureIcons: Record<string, React.ReactNode[]> = {
  done_for_you: [
    <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Headphones className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Calendar className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Gift className="flex-shrink-0 h-5 w-5 text-green-500" />,
  ],
  done_with_you: [
    <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Wrench className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Book className="flex-shrink-0 h-5 w-5 text-green-500" />,
  ],
  done_by_you: [
    <Wrench className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Shield className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Book className="flex-shrink-0 h-5 w-5 text-green-500" />,
    <Headphones className="flex-shrink-0 h-5 w-5 text-green-500" />,
  ],
};

export default function Pricing({ userEmail, onSelectPlan }: PricingProps) {
  const { t } = useTranslation("landing");

  const tiers = [
    {
      id: "done_for_you",
      priceMonthly: "€35",
      icon: <Calendar className="h-10 w-10 text-indigo-500" />,
      color: "from-indigo-600 to-blue-500",
      mostPopular: false,
    },
    {
      id: "done_with_you",
      priceMonthly: "€2,700",
      icon: <Star className="h-10 w-10 text-purple-500" />,
      color: "from-purple-600 to-indigo-500",
      mostPopular: true,
    },
    {
      id: "done_by_you",
      priceMonthly: "€950",
      icon: <Wrench className="h-10 w-10 text-blue-500" />,
      color: "from-blue-600 to-cyan-500",
      mostPopular: false,
    },
  ];

  const tierKey = (id: string) => id === "done_for_you" ? "doneForYou" : id === "done_with_you" ? "doneWithYou" : "doneByYou";

  return (
    <div id="pricing" className="py-16 bg-gradient-to-b from-white via-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h2 className="text-base bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 font-semibold tracking-wide uppercase text-center">
            {t("pricing.sectionLabel")}
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl text-center">
            {t("pricing.title")}
          </p>
          {userEmail && (
            <p className="mt-3 text-md font-medium text-purple-600 text-center">
              {t("pricing.personalizedFor", { email: userEmail })}
            </p>
          )}
          <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto text-center">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mt-12 space-y-6 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {tiers.map((tier) => {
            const tk = tierKey(tier.id);
            const features = t(`pricing.tiers.${tk}.features`, { returnObjects: true }) as string[];
            const icons = tierFeatureIcons[tier.id] ?? [];

            return (
              <Card
                key={tier.id}
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
                        {t(`pricing.tiers.${tk}.name`)}
                      </CardTitle>
                    </div>
                    {tier.mostPopular && (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                        {t("pricing.popular")}
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-4 text-sm text-gray-500">
                    {t(`pricing.tiers.${tk}.description`)}
                  </CardDescription>
                  <div className="mt-8">
                    <span className={`text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${tier.color}`}>
                      {tier.priceMonthly}
                    </span>
                    <span className="text-base font-medium text-gray-500">
                      {t(`pricing.tiers.${tk}.frequency`)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-8 px-6">
                  <h4 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">{t("pricing.whatsIncluded")}</h4>
                  <ul className="mt-6 space-y-4">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex space-x-3 items-center">
                        {icons[idx] ?? <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-green-500" />}
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-6 pt-0 pb-6">
                  <Button
                    className={`w-full bg-gradient-to-r ${tier.color} hover:shadow-lg hover:opacity-90 transition-all duration-200`}
                    variant="default"
                    onClick={() => onSelectPlan?.(tier.id)}
                  >
                    {t(`pricing.tiers.${tk}.cta`)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Crowdfunding option */}
        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl overflow-hidden shadow-lg divide-y divide-indigo-100 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px">
          <div className="px-8 py-10 sm:col-span-2">
            <div className="flex items-center space-x-4 mb-4">
              <Gift className="h-10 w-10 text-purple-500" />
              <h3 className="text-2xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
                {t("pricing.crowdfunding.title")}
              </h3>
            </div>
            <p className="mt-2 text-md text-gray-600">
              {t("pricing.crowdfunding.desc")}
            </p>
            <div className="mt-6">
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg hover:opacity-90 transition-all duration-200"
                onClick={() => onSelectPlan?.("crowdfunding")}
              >
                {t("pricing.crowdfunding.cta")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
