import React from "react";
import { useTranslation } from "react-i18next";
import { Users, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

const SKOOL_URL = "https://www.skool.com/citizen-developer-7163";

const PAIN_POINTS_KEYS = ["excel", "emails", "software", "colleague"] as const;
const AUDIENCE_KEYS = ["independent", "owners", "weg", "staff"] as const;

export default function SkoolCommunity() {
  const { t } = useTranslation("landing");

  return (
    <section
      data-section="skool-community"
      className="py-20 sm:py-24 bg-gradient-to-br from-indigo-50 via-white to-violet-50"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600 bg-indigo-100 rounded-full px-3 py-1 mb-4">
            <Users className="h-3 w-3" />
            {t("skoolCommunity.sectionLabel")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            {t("skoolCommunity.title")}
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            {t("skoolCommunity.tagline")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Pain points */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
              {t("skoolCommunity.painTitle")}
            </p>
            <ul className="space-y-4">
              {PAIN_POINTS_KEYS.map((key) => (
                <li key={key} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">!</span>
                  {t(`skoolCommunity.pain.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          {/* Audience + CTA */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
                {t("skoolCommunity.audienceTitle")}
              </p>
              <ul className="space-y-3">
                {AUDIENCE_KEYS.map((key) => (
                  <li key={key} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <CheckCircle2 className="mt-0.5 shrink-0 h-4 w-4 text-indigo-500" />
                    {t(`skoolCommunity.audience.${key}`)}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={SKOOL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl h-13 text-base gap-2"
              >
                {t("skoolCommunity.cta")}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <p className="text-center text-xs text-slate-400">
              {t("skoolCommunity.ctaNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
