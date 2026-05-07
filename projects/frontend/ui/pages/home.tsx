import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Home as HomeIcon, LogIn, UserPlus, ArrowRight,
  Star, Plus, ThumbsUp, ThumbsDown, Building2,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import WhatWeHandle from "../components/landing/WhatWeHandle";
import HowItWorks from "../components/landing/HowItWorks";
import ServiceOptions from "../components/landing/ServiceOptions";
import Pricing from "../components/landing/Pricing";
import BottomCTA from "../components/landing/BottomCTA";
import Footer from "../components/landing/Footer";
import { usePageTracking } from "../hooks/use-page-tracking";

// ── API URL helper (mirrors auth-ui/config.cljs logic) ──────────────────────
function getApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8787";
  const { host } = window.location;
  if (host.includes("localhost")) return "http://localhost:8787";
  return "https://immo-api.busqandote.com";
}

// ── Local-storage / session-storage keys ─────────────────────────────────────
const GUEST_KEY      = "pm-guest-user";
const VISITED_KEY    = "pm-has-visited";
const SESSION_ID_KEY = "pm-session-id";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GuestProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  units: number;
}
interface GuestUser {
  name: string;
  email: string;
  properties: GuestProperty[];
}
interface PlatformStats {
  landlords: number;
  properties: number;
  satisfaction: number;
}

// ── Simple EDN number extractor ───────────────────────────────────────────────
function extractEdnInt(edn: string, key: string): number | null {
  const m = edn.match(new RegExp(`:${key}\\s+(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home(props) {
  const { t } = useTranslation("landing");
  const { t: tHome } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");

  const onSignIn     = props.onSignIn;
  const onSignUp     = props.onSignUp;
  const onSelectPlan = props.onSelectPlan;
  const tracker      = props.tracker;

  const { trackCTA } = usePageTracking(tracker);

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats]                           = useState<PlatformStats | null>(null);
  const [guestUser, setGuestUser]                   = useState<GuestUser | null>(null);
  const [showGuestModal, setShowGuestModal]          = useState(false);
  const [showAddProperty, setShowAddProperty]        = useState(false);
  const [showSatisfaction, setShowSatisfaction]      = useState(false);
  const [satisfactionDone, setSatisfactionDone]      = useState(false);
  const [showCancelConfirm, setShowCancelConfirm]    = useState(false);
  const [guestForm, setGuestForm]                   = useState({ name: "", email: "" });
  const [guestError, setGuestError]                 = useState("");
  const [propForm, setPropForm]                     = useState({ name: "", address: "", city: "", postalCode: "", units: "1" });
  const [propError, setPropError]                   = useState("");

  // ── Load guest user from localStorage on mount ────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (raw) setGuestUser(JSON.parse(raw));
    } catch (_) {}
  }, []);

  // ── Fetch platform stats ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${getApiUrl()}/api/stats`)
      .then(async (r) => {
        if (!r.ok) return;
        const text = await r.text();
        // Try JSON first, then fall back to simple EDN extraction
        try {
          const j = JSON.parse(text);
          setStats({ landlords: j.landlords, properties: j.properties, satisfaction: j.satisfaction });
        } catch {
          const landlords   = extractEdnInt(text, "landlords");
          const properties  = extractEdnInt(text, "properties");
          const satisfaction = extractEdnInt(text, "satisfaction");
          if (landlords !== null && properties !== null && satisfaction !== null) {
            setStats({ landlords, properties, satisfaction });
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Satisfaction prompt: show on return visits, once per day ──────────────
  useEffect(() => {
    const todayKey = `pm-satisfaction-${new Date().toDateString()}`;
    if (sessionStorage.getItem(todayKey)) return;

    const hasVisited = localStorage.getItem(VISITED_KEY);
    if (hasVisited) {
      const timer = setTimeout(() => setShowSatisfaction(true), 3500);
      return () => clearTimeout(timer);
    } else {
      localStorage.setItem(VISITED_KEY, "true");
    }
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ── Guest modal handlers ───────────────────────────────────────────────────
  const handleGetStarted = () => {
    trackCTA("hero_primary", "hero");
    if (guestUser) {
      setShowAddProperty(true);
    } else {
      setShowGuestModal(true);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.name.trim()) { setGuestError(t("guest.nameRequired")); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestForm.email.trim());
    if (!emailOk) { setGuestError(t("guest.emailInvalid")); return; }

    const guest: GuestUser = { name: guestForm.name.trim(), email: guestForm.email.trim(), properties: [] };
    setGuestUser(guest);
    localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
    setGuestForm({ name: "", email: "" });
    setGuestError("");
    setShowGuestModal(false);
  };

  // ── Add-property modal handlers ────────────────────────────────────────────
  const handleAddPropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propForm.name.trim())    { setPropError(t("addProperty.nameRequired"));    return; }
    if (!propForm.address.trim()) { setPropError(t("addProperty.addressRequired")); return; }
    if (!propForm.city.trim())    { setPropError(t("addProperty.cityRequired"));    return; }

    const newProp: GuestProperty = {
      id:         crypto.randomUUID(),
      name:       propForm.name.trim(),
      address:    propForm.address.trim(),
      city:       propForm.city.trim(),
      postalCode: propForm.postalCode.trim(),
      units:      parseInt(propForm.units, 10) || 1,
    };
    const updated = { ...guestUser!, properties: [...(guestUser?.properties ?? []), newProp] };
    setGuestUser(updated);
    localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
    setPropForm({ name: "", address: "", city: "", postalCode: "", units: "1" });
    setPropError("");
    setShowAddProperty(false);
  };

  // ── Satisfaction handlers ──────────────────────────────────────────────────
  const handleSatisfaction = useCallback(async (satisfied: boolean) => {
    setShowSatisfaction(false);
    setSatisfactionDone(true);
    setTimeout(() => setSatisfactionDone(false), 3000);
    const todayKey = `pm-satisfaction-${new Date().toDateString()}`;
    sessionStorage.setItem(todayKey, "answered");

    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem(SESSION_ID_KEY, sessionId); }

    try {
      await fetch(`${getApiUrl()}/api/stats/satisfaction`, {
        method: "POST",
        headers: { "Content-Type": "application/edn" },
        body: `{:satisfied ${satisfied} :session-id "${sessionId}"}`,
      });
    } catch (_) {}
  }, []);

  // ── Stats display values — real data only, loading dots while pending ────
  const statsLoading        = stats === null;
  const displayLandlords    = statsLoading ? "…" : `${stats.landlords}+`;
  const displayProperties   = statsLoading ? "…" : `${stats.properties}+`;
  const displaySatisfaction = statsLoading ? "…" : `${stats.satisfaction}%`;
  const guestPropCount      = guestUser?.properties?.length ?? 0;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Guest "Get Started" modal ──────────────────────────────────────── */}
      <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("guest.modalTitle")}</DialogTitle>
            <DialogDescription>{t("guest.modalDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGuestSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">{t("guest.nameLabel")}</Label>
              <Input
                id="guest-name"
                placeholder={t("guest.namePlaceholder")}
                value={guestForm.name}
                onChange={(e) => { setGuestForm(f => ({ ...f, name: e.target.value })); setGuestError(""); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-email">{t("guest.emailLabel")}</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder={t("guest.emailPlaceholder")}
                value={guestForm.email}
                onChange={(e) => { setGuestForm(f => ({ ...f, email: e.target.value })); setGuestError(""); }}
              />
            </div>
            {guestError && <p className="text-sm text-destructive">{guestError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                {t("guest.submit")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Property modal ─────────────────────────────────────────────── */}
      <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addProperty.modalTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPropertySubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prop-name">{t("addProperty.nameLabel")}</Label>
              <Input
                id="prop-name"
                placeholder={t("addProperty.namePlaceholder")}
                value={propForm.name}
                onChange={(e) => { setPropForm(f => ({ ...f, name: e.target.value })); setPropError(""); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-address">{t("addProperty.addressLabel")}</Label>
              <Input
                id="prop-address"
                placeholder={t("addProperty.addressPlaceholder")}
                value={propForm.address}
                onChange={(e) => { setPropForm(f => ({ ...f, address: e.target.value })); setPropError(""); }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prop-city">{t("addProperty.cityLabel")}</Label>
                <Input
                  id="prop-city"
                  placeholder={t("addProperty.cityPlaceholder")}
                  value={propForm.city}
                  onChange={(e) => { setPropForm(f => ({ ...f, city: e.target.value })); setPropError(""); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prop-postal">{t("addProperty.postalCodeLabel")}</Label>
                <Input
                  id="prop-postal"
                  placeholder={t("addProperty.postalCodePlaceholder")}
                  value={propForm.postalCode}
                  onChange={(e) => setPropForm(f => ({ ...f, postalCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-units">{t("addProperty.unitsLabel")}</Label>
              <Input
                id="prop-units"
                type="number"
                min={1}
                value={propForm.units}
                onChange={(e) => setPropForm(f => ({ ...f, units: e.target.value }))}
              />
            </div>
            {propError && <p className="text-sm text-destructive">{propError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("addProperty.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cancel subscription confirmation ──────────────────────────────── */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancel.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("cancel.dialogDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => setShowCancelConfirm(false)}
            >
              {t("cancel.dismiss")}
            </Button>
            <Button
              variant="destructive"
              className="sm:flex-1"
              onClick={() => {
                setShowCancelConfirm(false);
                onSignIn?.();
              }}
            >
              {t("cancel.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Satisfaction prompt — vertically & horizontally centred ─────────── */}
      {showSatisfaction && !satisfactionDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            {/* Header bar */}
            <div className="flex items-center justify-between rounded-t-2xl bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                  PropManager
                </span>
              </div>
              <button
                onClick={() => setShowSatisfaction(false)}
                className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <p className="text-sm font-medium text-slate-800 mb-4">
                {t("satisfaction.prompt")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSatisfaction(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {t("satisfaction.yes")}
                </button>
                <button
                  onClick={() => handleSatisfaction(false)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {t("satisfaction.no")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {satisfactionDone && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-200">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
          <p className="text-sm font-medium text-slate-700">{t("satisfaction.thanks")}</p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

        {/* ── Hero ────────────────────────────────────────────────────────── */}
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

              {/* CTA */}
              <div className="flex mb-14">
                {guestUser ? (
                  <p className="text-base font-medium" style={{ color: "rgba(203,213,225,1)" }}>
                    {t("guest.welcomeBack", { name: guestUser.name.split(" ")[0] })}
                  </p>
                ) : (
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-white/90 font-semibold rounded-xl h-12 px-7 text-sm shadow-lg"
                    onClick={handleGetStarted}
                  >
                    {t("hero.ctaPrimary")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Divider */}
              <div className="w-16 h-px mb-10" style={{ background: "rgba(255,255,255,0.15)" }} />

              {/* Stats */}
              <div className="flex items-start gap-8 sm:gap-12">
                {/* Landlords — or guest's personal property count */}
                {guestUser ? (
                  <button
                    className="text-left"
                    onClick={() => setShowAddProperty(true)}
                    title={t("hero.stats.addFirstProperty")}
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums underline underline-offset-4 decoration-white/30 hover:decoration-white/70 transition-colors">
                      {guestPropCount}
                    </div>
                    <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                      {t("hero.stats.myPropertiesLabel")}
                    </div>
                    {guestPropCount === 0 && (
                      <div className="text-[10px] mt-0.5 opacity-60">
                        {t("hero.stats.addFirstProperty")}
                      </div>
                    )}
                  </button>
                ) : (
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      {displayLandlords}
                    </div>
                    <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                      {t("hero.stats.landlordsLabel")}
                    </div>
                  </div>
                )}

                {/* Properties */}
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {displayProperties}
                  </div>
                  <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                    {t("hero.stats.propertiesLabel")}
                  </div>
                </div>

                {/* Satisfaction */}
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {displaySatisfaction}
                  </div>
                  <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                    {t("hero.stats.satisfactionLabel")}
                  </div>
                </div>
              </div>

              {/* Trust note with cancel link */}
              <p className="mt-6 flex items-center gap-1.5 text-xs" style={{ color: "rgba(148,163,184,1)" }}>
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                {t("hero.stats.trustNotePrefix")}
                <button
                  className="underline hover:text-white transition-colors"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  {t("hero.stats.cancelLink")}
                </button>
              </p>

            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
               style={{ background: "linear-gradient(to top, rgba(255,255,255,0.05), transparent)" }} />
        </section>

        {/* ── Guest properties list (if any) ──────────────────────────────── */}
        {guestUser && guestUser.properties.length > 0 && (
          <section className="bg-slate-50 border-b border-slate-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                  {t("hero.stats.myPropertiesLabel")} ({guestPropCount})
                </h2>
                <Button size="sm" variant="outline" onClick={() => setShowAddProperty(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("addProperty.submit")}
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {guestUser.properties.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.address}, {p.city}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.units} unit{p.units !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── What We Handle ──────────────────────────────────────────────── */}
        <div id="what-we-handle">
          <WhatWeHandle />
        </div>

        {/* ── How It Works ────────────────────────────────────────────────── */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* ── Survey ──────────────────────────────────────────────────────── */}
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

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section id="pricing" data-section="pricing">
          <Pricing
            onSelectPlan={(tierId) => {
              trackCTA("pricing_select_" + tierId, "pricing");
              onSelectPlan?.(tierId);
            }}
          />
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <BottomCTA onSignUp={onSignUp} onSignIn={onSignIn} trackCTA={trackCTA} />
      </main>

      <Footer />
    </div>
  );
}
