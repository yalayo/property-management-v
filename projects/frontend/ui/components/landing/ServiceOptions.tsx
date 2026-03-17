import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface ServiceOptionsProps {
  onSelectPlan?: (tierId: string) => void;
  onSignUp?: () => void;
  trackCTA?: (button: string, section: string) => void;
}

export default function ServiceOptions({ onSelectPlan, onSignUp, trackCTA }: ServiceOptionsProps) {
  const { t } = useTranslation("landing");

  const doneForYouFeatures = [
    t("serviceOptions.doneForYou.feature1"),
    t("serviceOptions.doneForYou.feature2"),
    t("serviceOptions.doneForYou.feature3"),
    t("serviceOptions.doneForYou.feature4"),
  ];

  const handleDoneForYou = () => {
    trackCTA?.("done_for_you_cta", "service_options");
    if (onSelectPlan) {
      onSelectPlan("done_for_you");
    } else {
      onSignUp?.();
    }
  };

  const handleLearnMore = (tier: string) => {
    trackCTA?.(tier + "_learn_more", "service_options");
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="options" data-section="service-options" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("serviceOptions.sectionLabel")}
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t("serviceOptions.title")}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t("serviceOptions.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* Done For You — featured card */}
          <div
            className="lg:col-span-1 order-first lg:order-none rounded-2xl border-2 border-primary p-6 sm:p-8 shadow-xl relative mt-4"
            style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)" }}
          >
            <div className="absolute -top-3.5 left-6">
              <Badge className="bg-primary text-white px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow">
                {t("serviceOptions.doneForYou.badge")}
              </Badge>
            </div>

            <div className="mb-6 mt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                {t("serviceOptions.doneForYou.tagline")}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {t("serviceOptions.doneForYou.name")}
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                {t("serviceOptions.doneForYou.desc")}
              </p>
            </div>

            <div className="mb-6">
              <span className="text-5xl font-black text-slate-900">
                {t("serviceOptions.doneForYou.price")}
              </span>
              <span className="text-slate-500 text-base ml-1">
                {t("serviceOptions.doneForYou.frequency")}
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              {doneForYouFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button className="w-full" size="lg" onClick={handleDoneForYou}>
              {t("serviceOptions.doneForYou.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Done With You + Done By You */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {(["doneWithYou", "doneByYou"] as const).map((key) => {
              const tierId = key === "doneWithYou" ? "done_with_you" : "done_by_you";
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                    {t(`serviceOptions.${key}.tagline`)}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {t(`serviceOptions.${key}.name`)}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-grow">
                    {t(`serviceOptions.${key}.desc`)}
                  </p>
                  <div className="mb-6">
                    <span className="text-3xl font-black text-slate-700">
                      {t(`serviceOptions.${key}.price`)}
                    </span>
                    <span className="text-slate-400 text-sm ml-1">
                      {t(`serviceOptions.${key}.frequency`)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleLearnMore(tierId)}
                  >
                    {t(`serviceOptions.${key}.cta`)}
                    <ChevronDown className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
