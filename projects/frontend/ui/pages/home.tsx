import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Home as HomeIcon, LogIn, UserPlus, ArrowRight,
  Star, Plus, ThumbsUp, ThumbsDown, Building2, Trash2,
  Users, ChevronRight,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import WhatWeHandle from "../components/landing/WhatWeHandle";
import HowItWorks from "../components/landing/HowItWorks";
import ServiceOptions from "../components/landing/ServiceOptions";
import BottomCTA from "../components/landing/BottomCTA";
import Footer from "../components/landing/Footer";
import { usePageTracking } from "../hooks/use-page-tracking";

// ── API URL helper ────────────────────────────────────────────────────────────
function getApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8787";
  const { host } = window.location;
  if (host.includes("localhost")) return "http://localhost:8787";
  return "https://immo-api.busqandote.com";
}

// ── Local-storage keys ────────────────────────────────────────────────────────
const GUEST_KEY      = "pm-guest-user";
const VISITED_KEY    = "pm-has-visited";
const SESSION_ID_KEY = "pm-session-id";
export const PENDING_MIGRATION_KEY = "pm-pending-migration";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GuestProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  units: number;
}
interface GuestApartment {
  id: string;
  propertyId: string;
  code: string;
}
interface GuestTenant {
  id: string;
  apartmentId: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  startDate: string;
}
interface GuestUser {
  name: string;
  email: string;
  properties: GuestProperty[];
  apartments: GuestApartment[];
  tenants: GuestTenant[];
}
interface PlatformStats {
  landlords: number;
  properties: number;
  satisfaction: number;
}

function extractEdnInt(edn: string, key: string): number | null {
  const m = edn.match(new RegExp(`:${key}\\s+(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function saveGuest(guest: GuestUser) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
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

  // Guest profile modal
  const [showGuestModal, setShowGuestModal]          = useState(false);
  const [guestForm, setGuestForm]                   = useState({ name: "", email: "" });
  const [guestError, setGuestError]                 = useState("");

  // Add property modal
  const [showAddProperty, setShowAddProperty]        = useState(false);
  const [propForm, setPropForm]                     = useState({ name: "", address: "", city: "", postalCode: "", units: "1" });
  const [propError, setPropError]                   = useState("");

  // Add apartment modal
  const [showAddApartment, setShowAddApartment]      = useState(false);
  const [aptForm, setAptForm]                       = useState({ propertyId: "", code: "" });
  const [aptError, setAptError]                     = useState("");

  // Add tenant modal
  const [showAddTenant, setShowAddTenant]            = useState(false);
  const [tenantForm, setTenantForm]                 = useState({ apartmentId: "", firstName: "", lastName: "", startDate: "" });
  const [tenantError, setTenantError]               = useState("");

  // Satisfaction
  const [showSatisfaction, setShowSatisfaction]      = useState(false);
  const [satisfactionDone, setSatisfactionDone]      = useState(false);

  // Cancel confirm dialog
  const [showCancelConfirm, setShowCancelConfirm]    = useState(false);

  // Migration dialog (shown when guest clicks sign-up)
  const [showMigrateDialog, setShowMigrateDialog]    = useState(false);

  // ── Load guest user from localStorage on mount ────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old format that may lack apartments/tenants arrays
        setGuestUser({
          ...parsed,
          apartments: parsed.apartments ?? [],
          tenants: parsed.tenants ?? [],
        });
      }
    } catch (_) {}
  }, []);

  // ── Fetch platform stats ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${getApiUrl()}/api/stats`)
      .then(async (r) => {
        if (!r.ok) return;
        const text = await r.text();
        try {
          const j = JSON.parse(text);
          setStats({ landlords: j.landlords, properties: j.properties, satisfaction: j.satisfaction });
        } catch {
          const landlords    = extractEdnInt(text, "landlords");
          const properties   = extractEdnInt(text, "properties");
          const satisfaction = extractEdnInt(text, "satisfaction");
          if (landlords !== null && properties !== null && satisfaction !== null)
            setStats({ landlords, properties, satisfaction });
        }
      })
      .catch(() => {});
  }, []);

  // ── Satisfaction prompt ───────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────
  const statsLoading        = stats === null;
  const displayLandlords    = statsLoading ? "…" : `${stats.landlords}+`;
  const displayProperties   = statsLoading ? "…" : `${stats.properties}+`;
  const displaySatisfaction = statsLoading ? "…" : `${stats.satisfaction}%`;
  const guestPropCount      = guestUser?.properties?.length ?? 0;
  const guestAptCount       = guestUser?.apartments?.length ?? 0;
  const guestTenantCount    = guestUser?.tenants?.length ?? 0;
  const hasDemoData = guestPropCount > 0 || guestAptCount > 0 || guestTenantCount > 0;

  // ── Guest profile handlers ────────────────────────────────────────────────
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
    const guest: GuestUser = {
      name: guestForm.name.trim(),
      email: guestForm.email.trim(),
      properties: [],
      apartments: [],
      tenants: [],
    };
    setGuestUser(guest);
    saveGuest(guest);
    setGuestForm({ name: "", email: "" });
    setGuestError("");
    setShowGuestModal(false);
    // Immediately open the add-property modal so first interaction is seamless
    setTimeout(() => setShowAddProperty(true), 150);
  };

  // ── Property handlers ─────────────────────────────────────────────────────
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
    saveGuest(updated);
    setPropForm({ name: "", address: "", city: "", postalCode: "", units: "1" });
    setPropError("");
    setShowAddProperty(false);
  };

  const handleDeleteProperty = (id: string) => {
    if (!guestUser) return;
    const updated: GuestUser = {
      ...guestUser,
      properties: guestUser.properties.filter(p => p.id !== id),
      apartments: guestUser.apartments.filter(a => a.propertyId !== id),
      tenants:    guestUser.tenants.filter(ten => ten.propertyId !== id),
    };
    setGuestUser(updated);
    saveGuest(updated);
  };

  // ── Apartment handlers ────────────────────────────────────────────────────
  const handleAddApartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptForm.code.trim())       { setAptError(t("addApartment.codeRequired"));    return; }
    if (!aptForm.propertyId)        { setAptError(t("addApartment.selectProperty"));  return; }
    const newApt: GuestApartment = {
      id:         crypto.randomUUID(),
      propertyId: aptForm.propertyId,
      code:       aptForm.code.trim(),
    };
    const updated = { ...guestUser!, apartments: [...(guestUser?.apartments ?? []), newApt] };
    setGuestUser(updated);
    saveGuest(updated);
    setAptForm({ propertyId: "", code: "" });
    setAptError("");
    setShowAddApartment(false);
  };

  const handleDeleteApartment = (id: string) => {
    if (!guestUser) return;
    const updated: GuestUser = {
      ...guestUser,
      apartments: guestUser.apartments.filter(a => a.id !== id),
      tenants:    guestUser.tenants.filter(ten => ten.apartmentId !== id),
    };
    setGuestUser(updated);
    saveGuest(updated);
  };

  // ── Tenant handlers ───────────────────────────────────────────────────────
  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.firstName.trim()) { setTenantError(t("addTenant.firstNameRequired")); return; }
    if (!tenantForm.apartmentId)      { setTenantError(t("addTenant.selectApartment"));   return; }
    const apt = guestUser?.apartments.find(a => a.id === tenantForm.apartmentId);
    const newTenant: GuestTenant = {
      id:          crypto.randomUUID(),
      apartmentId: tenantForm.apartmentId,
      propertyId:  apt?.propertyId ?? "",
      firstName:   tenantForm.firstName.trim(),
      lastName:    tenantForm.lastName.trim(),
      startDate:   tenantForm.startDate,
    };
    const updated = { ...guestUser!, tenants: [...(guestUser?.tenants ?? []), newTenant] };
    setGuestUser(updated);
    saveGuest(updated);
    setTenantForm({ apartmentId: "", firstName: "", lastName: "", startDate: "" });
    setTenantError("");
    setShowAddTenant(false);
  };

  const handleDeleteTenant = (id: string) => {
    if (!guestUser) return;
    const updated = { ...guestUser, tenants: guestUser.tenants.filter(ten => ten.id !== id) };
    setGuestUser(updated);
    saveGuest(updated);
  };

  // ── Sign-up with migration check ──────────────────────────────────────────
  const handleSignUp = () => {
    trackCTA("header_get_started", "header");
    if (hasDemoData) {
      setShowMigrateDialog(true);
    } else {
      onSignUp?.();
    }
  };

  const handleMigrateAndSignUp = () => {
    if (guestUser) {
      localStorage.setItem(PENDING_MIGRATION_KEY, JSON.stringify(guestUser));
    }
    setShowMigrateDialog(false);
    onSignUp?.();
  };

  const handleSkipMigrateAndSignUp = () => {
    setShowMigrateDialog(false);
    onSignUp?.();
  };

  // ── Satisfaction handlers ─────────────────────────────────────────────────
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

  // ── Helper to get property name ───────────────────────────────────────────
  const propName = (id: string) =>
    guestUser?.properties.find(p => p.id === id)?.name ?? id;
  const aptLabel = (id: string) => {
    const a = guestUser?.apartments.find(a => a.id === id);
    if (!a) return id;
    return `${a.code} — ${propName(a.propertyId)}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── Guest profile modal ────────────────────────────────────────────── */}
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

      {/* ── Add Apartment modal ────────────────────────────────────────────── */}
      <Dialog open={showAddApartment} onOpenChange={setShowAddApartment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addApartment.modalTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddApartmentSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("addApartment.propertyLabel")}</Label>
              <Select
                value={aptForm.propertyId}
                onValueChange={(v) => { setAptForm(f => ({ ...f, propertyId: v })); setAptError(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("addApartment.selectProperty")} />
                </SelectTrigger>
                <SelectContent>
                  {(guestUser?.properties ?? []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-code">{t("addApartment.codeLabel")}</Label>
              <Input
                id="apt-code"
                placeholder={t("addApartment.codePlaceholder")}
                value={aptForm.code}
                onChange={(e) => { setAptForm(f => ({ ...f, code: e.target.value })); setAptError(""); }}
              />
            </div>
            {aptError && <p className="text-sm text-destructive">{aptError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("addApartment.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Tenant modal ───────────────────────────────────────────────── */}
      <Dialog open={showAddTenant} onOpenChange={setShowAddTenant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addTenant.modalTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTenantSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("addTenant.apartmentLabel")}</Label>
              <Select
                value={tenantForm.apartmentId}
                onValueChange={(v) => { setTenantForm(f => ({ ...f, apartmentId: v })); setTenantError(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("addTenant.selectApartment")} />
                </SelectTrigger>
                <SelectContent>
                  {(guestUser?.apartments ?? []).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {propName(a.propertyId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-first">{t("addTenant.firstNameLabel")}</Label>
                <Input
                  id="tenant-first"
                  placeholder={t("addTenant.firstNamePlaceholder")}
                  value={tenantForm.firstName}
                  onChange={(e) => { setTenantForm(f => ({ ...f, firstName: e.target.value })); setTenantError(""); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-last">{t("addTenant.lastNameLabel")}</Label>
                <Input
                  id="tenant-last"
                  placeholder={t("addTenant.lastNamePlaceholder")}
                  value={tenantForm.lastName}
                  onChange={(e) => setTenantForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-start">{t("addTenant.startDateLabel")}</Label>
              <Input
                id="tenant-start"
                type="date"
                value={tenantForm.startDate}
                onChange={(e) => setTenantForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            {tenantError && <p className="text-sm text-destructive">{tenantError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("addTenant.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Migration dialog ───────────────────────────────────────────────── */}
      <Dialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("migrate.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("migrate.dialogDesc", {
                count: guestPropCount,
                plural: guestPropCount === 1 ? "y" : "ies",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={handleSkipMigrateAndSignUp}
            >
              {t("migrate.skip")}
            </Button>
            <Button
              className="sm:flex-1"
              onClick={handleMigrateAndSignUp}
            >
              {t("migrate.confirm")}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </DialogFooter>
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
              onClick={() => { setShowCancelConfirm(false); onSignIn?.(); }}
            >
              {t("cancel.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Satisfaction prompt ──────────────────────────────────────────────── */}
      {showSatisfaction && !satisfactionDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between rounded-t-2xl bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-white/80">PropManager</span>
              </div>
              <button
                onClick={() => setShowSatisfaction(false)}
                className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm font-medium text-slate-800 mb-4">{t("satisfaction.prompt")}</p>
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
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <HomeIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {tCommon("appName")}
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: t("whatWeHandle.sectionLabel"),   id: "what-we-handle" },
                { label: t("howItWorks.sectionLabel"),     id: "how-it-works"   },
                { label: t("serviceOptions.sectionLabel"), id: "options"        },
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
                  onClick={handleSignUp}
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
              <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-white">
                {t("hero.headline1")}
                <br />
                <span style={{ background: "linear-gradient(90deg, #a5b4fc, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {t("hero.headline2")}
                </span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-10" style={{ color: "rgba(148,163,184,1)" }}>
                {t("hero.subtitle")}
              </p>

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

              <div className="w-16 h-px mb-10" style={{ background: "rgba(255,255,255,0.15)" }} />

              <div className="flex items-start gap-8 sm:gap-12">
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
                    <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{displayLandlords}</div>
                    <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                      {t("hero.stats.landlordsLabel")}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{displayProperties}</div>
                  <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                    {t("hero.stats.propertiesLabel")}
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{displaySatisfaction}</div>
                  <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: "rgba(148,163,184,1)" }}>
                    {t("hero.stats.satisfactionLabel")}
                  </div>
                </div>
              </div>

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

          <div className="absolute bottom-0 inset-x-0 h-16 pointer-events-none"
               style={{ background: "linear-gradient(to top, rgba(255,255,255,0.05), transparent)" }} />
        </section>

        {/* ── Interactive Demo Dashboard (shown once guest has a profile) ─── */}
        {guestUser && (
          <section className="bg-slate-50 border-b border-slate-200 py-10" id="demo-dashboard">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t("demo.sectionTitle")}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{t("demo.sectionSubtitle")}</p>
                </div>
                {onSignUp && (
                  <Button
                    size="sm"
                    onClick={handleSignUp}
                    className="flex-shrink-0"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    {t("demo.createAccountCta")}
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="properties">
                <TabsList className="mb-6">
                  <TabsTrigger value="properties">
                    <Building2 className="mr-1.5 h-4 w-4" />
                    {t("demo.tabProperties", { count: guestPropCount })}
                  </TabsTrigger>
                  <TabsTrigger value="apartments" disabled={guestPropCount === 0}>
                    <Building2 className="mr-1.5 h-4 w-4" />
                    {t("demo.tabApartments", { count: guestAptCount })}
                  </TabsTrigger>
                  <TabsTrigger value="tenants" disabled={guestAptCount === 0}>
                    <Users className="mr-1.5 h-4 w-4" />
                    {t("demo.tabTenants", { count: guestTenantCount })}
                  </TabsTrigger>
                </TabsList>

                {/* Properties tab */}
                <TabsContent value="properties">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" variant="outline" onClick={() => setShowAddProperty(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("addProperty.submit")}
                    </Button>
                  </div>
                  {guestPropCount === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">{t("hero.stats.addFirstProperty")}</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guestUser.properties.map(p => {
                        const aptCount = guestUser.apartments.filter(a => a.propertyId === p.id).length;
                        return (
                          <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                              <p className="text-xs text-slate-500 truncate">{p.address}, {p.city}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {p.units} unit{p.units !== 1 ? "s" : ""} · {aptCount} apt{aptCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteProperty(p.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                              title={t("demo.deleteConfirm")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Apartments tab */}
                <TabsContent value="apartments">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" variant="outline" onClick={() => setShowAddApartment(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("demo.addApartment")}
                    </Button>
                  </div>
                  {guestAptCount === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">{t("demo.noApartments")}</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guestUser.apartments.map(a => {
                        const tenantCount = guestUser.tenants.filter(ten => ten.apartmentId === a.id).length;
                        return (
                          <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900">{a.code}</p>
                              <p className="text-xs text-slate-500 truncate">{propName(a.propertyId)}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {tenantCount} tenant{tenantCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteApartment(a.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                              title={t("demo.deleteConfirm")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Tenants tab */}
                <TabsContent value="tenants">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" variant="outline" onClick={() => setShowAddTenant(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("demo.addTenant")}
                    </Button>
                  </div>
                  {guestTenantCount === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">{t("demo.noTenants")}</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guestUser.tenants.map(ten => (
                        <div key={ten.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{ten.firstName} {ten.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{aptLabel(ten.apartmentId)}</p>
                            {ten.startDate && (
                              <p className="text-xs text-slate-400 mt-0.5">from {ten.startDate}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTenant(ten.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                            title={t("demo.deleteConfirm")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

        {/* ── Service Options ──────────────────────────────────────────────── */}
        <ServiceOptions
          onSelectPlan={(tierId) => {
            trackCTA("service_options_" + tierId, "service_options");
            onSelectPlan?.(tierId);
          }}
          onSignUp={handleSignUp}
          trackCTA={trackCTA}
        />

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <BottomCTA onSignUp={handleSignUp} onSignIn={onSignIn} trackCTA={trackCTA} />
      </main>

      <Footer />
    </div>
  );
}
