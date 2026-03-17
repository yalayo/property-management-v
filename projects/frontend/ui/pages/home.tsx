import React from "react";
import { useTranslation } from "react-i18next";
import { Home as HomeIcon, LogIn, UserPlus, ArrowRight, ArrowDown, Star } from "lucide-react";


import { Button } from "../components/ui/button";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import WhatWeHandle from "../components/landing/WhatWeHandle";
import HowItWorks from "../components/landing/HowItWorks";
import ServiceOptions from "../components/landing/ServiceOptions";
import Pricing from "../components/landing/Pricing";
import BottomCTA from "../components/landing/BottomCTA";
import Footer from "../components/landing/Footer";
import { usePageTracking } from "../hooks/use-page-tracking";

export default function Home(props) {
  const { t } = useTranslation("landing");
  const { t: tHome } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");

  const onSignIn = props.onSignIn;
  const onSignUp = props.onSignUp;
  const onSelectPlan = props.onSelectPlan;
  const tracker = props.tracker;

  const { trackCTA } = usePageTracking(tracker);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 rounded-md p-1.5">
                <HomeIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base sm:text-lg font-bold text-slate-800">{tCommon("appName")}</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <button onClick={() => scrollTo("what-we-handle")} className="hover:text-primary transition-colors">
                {t("whatWeHandle.sectionLabel")}
              </button>
              <button onClick={() => scrollTo("how-it-works")} className="hover:text-primary transition-colors">
                {t("howItWorks.sectionLabel")}
              </button>
              <button onClick={() => scrollTo("options")} className="hover:text-primary transition-colors">
                {t("serviceOptions.sectionLabel")}
              </button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-primary transition-colors">
                {t("pricing.sectionLabel")}
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {onSignIn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    trackCTA("header_signin", "header");
                    onSignIn();
                  }}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {tHome("signIn")}
                </Button>
              )}
              {onSignUp && (
                <Button
                  size="sm"
                  onClick={() => {
                    trackCTA("header_get_started", "header");
                    onSignUp();
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {tHome("createAccount")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section
          id="hero"
          data-section="hero"
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white"
        >
          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-8">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t("hero.badge")}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight mb-6">
                {t("hero.headline1")}{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
                  {t("hero.headline2")}
                </span>
              </h1>

              <p className="text-base sm:text-xl text-slate-300 max-w-2xl leading-relaxed mb-8 sm:mb-10">
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-14">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-base px-8"
                  onClick={() => {
                    trackCTA("hero_primary", "hero");
                    onSignUp?.();
                  }}
                >
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-medium text-base px-8"
                  onClick={() => {
                    trackCTA("hero_secondary", "hero");
                    scrollTo("options");
                  }}
                >
                  {t("hero.ctaSecondary")}
                  <ArrowDown className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4 pb-2">
                {(["landlords", "properties", "satisfaction"] as const).map((key) => (
                  <div key={key}>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {t(`hero.stats.${key}`)}
                    </div>
                    <div className="text-slate-400 text-xs sm:text-sm mt-0.5">
                      {t(`hero.stats.${key}Label`)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust note */}
              <p className="mt-5 text-slate-400 text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                {t("hero.stats.trustNote")}
              </p>
            </div>
          </div>

          {/* Scroll chevron */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center text-white/30">
            <ArrowDown className="h-5 w-5 animate-bounce" />
          </div>
        </section>

        {/* ── What We Handle ────────────────────────────────────────── */}
        <div id="what-we-handle">
          <WhatWeHandle />
        </div>

        {/* ── How It Works ──────────────────────────────────────────── */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* ── Service Options ───────────────────────────────────────── */}
        <ServiceOptions
          onSelectPlan={onSelectPlan}
          onSignUp={onSignUp}
          trackCTA={trackCTA}
        />

        {/* ── Survey Section ────────────────────────────────────────── */}
        <section
          id="survey"
          data-section="survey"
          className="py-20 bg-gradient-to-b from-slate-50 to-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                {t("surveyIntro.sectionLabel")}
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
                {t("surveyIntro.title")}
              </h2>
              <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
                {t("surveyIntro.subtitle")}
              </p>
            </div>

            {/* Survey rendered by CLJS as children */}
            {props.children}
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        <section id="pricing" data-section="pricing">
          <Pricing
            onSelectPlan={(tierId) => {
              trackCTA("pricing_select_" + tierId, "pricing");
              onSelectPlan?.(tierId);
            }}
          />
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────── */}
        <BottomCTA
          onSignUp={onSignUp}
          onSignIn={onSignIn}
          trackCTA={trackCTA}
        />
      </main>

      <Footer />
    </div>
  );
}
