import React from "react";
import { useTranslation } from "react-i18next";
import { Home as HomeIcon, LogIn, UserPlus, ArrowRight, ChevronDown, Star } from "lucide-react";

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

  const onSignIn     = props.onSignIn;
  const onSignUp     = props.onSignUp;
  const onSelectPlan = props.onSelectPlan;
  const tracker      = props.tracker;

  const { trackCTA } = usePageTracking(tracker);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-4">

            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {tCommon("appName")}
              </span>
            </div>

            {/* Nav — desktop only */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: t("whatWeHandle.sectionLabel"), id: "what-we-handle" },
                { label: t("howItWorks.sectionLabel"),   id: "how-it-works"   },
                { label: t("serviceOptions.sectionLabel"), id: "options"      },
                { label: t("pricing.sectionLabel"),      id: "pricing"        },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <LanguageSwitcher />
              {onSignIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex text-slate-600 hover:text-slate-900"
                  onClick={() => { trackCTA("header_signin", "header"); onSignIn(); }}
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  {tHome("signIn")}
                </Button>
              )}
              {onSignUp && (
                <Button
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-700 text-white rounded-lg px-4"
                  onClick={() => { trackCTA("header_get_started", "header"); onSignUp(); }}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  {tHome("createAccount")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section
          id="hero"
          data-section="hero"
          className="relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #312e81 70%, #4c1d95 100%)" }}
        >
          {/* Overlay blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
                 style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
                 style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
            <div className="max-w-2xl lg:max-w-3xl">

              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8"
                   style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  {t("hero.badge")}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-white">
                {t("hero.headline1")}
                <br />
                <span style={{ background: "linear-gradient(90deg, #a5b4fc, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {t("hero.headline2")}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-10" style={{ color: "rgba(148,163,184,1)" }}>
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-14">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-white/90 font-semibold rounded-xl h-12 px-7 text-sm shadow-lg"
                  onClick={() => { trackCTA("hero_primary", "hero"); onSignUp?.(); }}
                >
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  className="inline-flex items-center justify-center h-12 px-7 text-sm font-medium rounded-xl transition-colors"
                  style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => { trackCTA("hero_secondary", "hero"); scrollTo("options"); }}
                >
                  {t("hero.ctaSecondary")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="w-16 h-px mb-10" style={{ background: "rgba(255,255,255,0.15)" }} />

              {/* Stats */}
              <div className="flex items-start gap-8 sm:gap-12">
                {(["landlords", "properties", "satisfaction"] as const).map((key) => (
                  <div key={key}>
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      {t(`hero.stats.${key}`)}
                    </div>
                    <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                      {t(`hero.stats.${key}Label`)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust note */}
              <p className="mt-6 flex items-center gap-1.5 text-xs" style={{ color: "rgba(148,163,184,1)" }}>
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                {t("hero.stats.trustNote")}
              </p>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
               style={{ background: "linear-gradient(to top, rgba(255,255,255,0.05), transparent)" }} />
        </section>

        {/* ── What We Handle ──────────────────────────────────────────── */}
        <div id="what-we-handle">
          <WhatWeHandle />
        </div>

        {/* ── How It Works ────────────────────────────────────────────── */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* ── Survey ──────────────────────────────────────────────────── */}
        <section
          id="survey"
          data-section="survey"
          className="py-20 sm:py-24 bg-slate-50 border-y border-slate-100"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary bg-primary/8 rounded-full px-3 py-1 mb-4">
                {t("surveyIntro.sectionLabel")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                {t("surveyIntro.title")}
              </h2>
              <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                {t("surveyIntro.subtitle")}
              </p>
            </div>
            {props.children}
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" data-section="pricing">
          <Pricing
            onSelectPlan={(tierId) => {
              trackCTA("pricing_select_" + tierId, "pricing");
              onSelectPlan?.(tierId);
            }}
          />
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        <BottomCTA onSignUp={onSignUp} onSignIn={onSignIn} trackCTA={trackCTA} />
      </main>

      <Footer />
    </div>
  );
}
