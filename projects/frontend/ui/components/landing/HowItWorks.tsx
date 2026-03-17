import React from "react";
import { useTranslation } from "react-i18next";

const STEPS = ["step1", "step2", "step3"] as const;

export default function HowItWorks() {
  const { t } = useTranslation("landing");

  return (
    <section data-section="how-it-works" className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("howItWorks.sectionLabel")}
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t("howItWorks.title")}
          </h2>
        </div>

        {/* ── Mobile: vertical timeline ─────────────────────────────── */}
        <div className="md:hidden flex flex-col gap-0">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex gap-5">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center flex-shrink-0 shadow-md z-10">
                  {idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="w-0.5 flex-grow bg-primary/20 my-1" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-${idx < STEPS.length - 1 ? "8" : "0"} pt-1 flex-grow`}>
                <div className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">
                  {t(`howItWorks.${step}.num`)}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed pb-8">
                  {t(`howItWorks.${step}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop: horizontal 3-column ─────────────────────────── */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 relative">
          {/* Connector line — spans from center of col1 to center of col3 */}
          <div className="absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-black flex items-center justify-center shadow-lg mb-5 relative z-10">
                {idx + 1}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">
                {t(`howItWorks.${step}.num`)}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                {t(`howItWorks.${step}.title`)}
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {t(`howItWorks.${step}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
