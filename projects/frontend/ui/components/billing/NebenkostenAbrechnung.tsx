import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, FileText, Pencil, CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { generateBillingPdf, downloadPdf } from "./pdfGenerator";
import type { CostLineItem } from "./pdfGenerator";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  properties?: any[];
  apartments?: any[];
  tenants?: any[];
  costs?: any[];
  aptCosts?: any[];
  rentPayments?: any[];
  expenseTypes?: any[];
  costsLoading?: boolean;
  aptCostsLoading?: boolean;
  rentLoading?: boolean;
  propertySaving?: boolean;
  computeReadiness?: (data: {
    hasTenant: boolean;
    hasAllCosts: boolean;
    hasPayments: boolean;
    hasIban: boolean;
  }) => { ready: boolean; missing: string[] } | null;
  onLoadCosts?: (propertyId: string) => void;
  onLoadAptCosts?: (aptId: string) => void;
  onLoadRentPayments?: (aptId: string) => void;
  onEditProperty?: (id: string, data: any) => void;
  navContext?: { propertyId?: string; aptId?: string; nonce?: number } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function costEntryFor(costs: any[], lineKey: string, year: number) {
  return costs.find((c: any) => c.line === lineKey && Number(c.year) === year) ?? null;
}

function inheritedCostFor(costs: any[], lineKey: string, year: number) {
  return [...costs]
    .filter((c: any) => c.line === lineKey && Number(c.year) < year)
    .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;
}

function effectiveCostValue(costs: any[], lineKey: string, year: number): number | null {
  const exact = costEntryFor(costs, lineKey, year);
  if (exact) return Number(exact.value);
  const inherited = inheritedCostFor(costs, lineKey, year);
  return inherited ? Number(inherited.value) : null;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Days the tenant occupied the apartment within the given year (clamped to Jan 1 – Dec 31). */
function tenantDaysInYear(tenant: any, year: number): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const start = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const end   = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const effStart = start < yearStart ? yearStart : start;
  const effEnd   = end   > yearEnd   ? yearEnd   : end;
  return Math.max(0, Math.round((effEnd.getTime() - effStart.getTime()) / 86400000) + 1);
}

/** Months (1-12) in which the tenant was present at least one day in the given year. */
function tenantActiveMonthsFor(tenant: any, year: number): number[] {
  const start = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : null;
  const end   = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : null;
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const mStart  = new Date(year, m - 1, 1);
    const mEnd    = new Date(year, m, 0);
    const effStart = start ?? new Date(year, 0, 1);
    const effEnd   = end   ?? new Date(9999, 11, 31);
    if (effStart <= mEnd && effEnd >= mStart) months.push(m);
  }
  return months;
}

function fmtGermanDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function tenantDisplayName(t: any): string {
  return [t["first-name"], t["last-name"]].filter(Boolean).join(" ") || t.name || "Mieter";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NebenkostenAbrechnung({
  properties = [],
  apartments = [],
  tenants = [],
  costs = [],
  aptCosts = [],
  rentPayments = [],
  expenseTypes = [],
  costsLoading,
  aptCostsLoading,
  rentLoading,
  propertySaving,
  onLoadCosts,
  onLoadAptCosts,
  onLoadRentPayments,
  onEditProperty,
  navContext,
}: Props) {
  const { t, i18n } = useTranslation("abrechnung");

  const currentYear = new Date().getFullYear();
  const defaultBillingYear = currentYear - 1;
  const [year, setYear] = useState(defaultBillingYear);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [editingBankInfo, setEditingBankInfo] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [landlordNameInput, setLandlordNameInput] = useState("");
  const [landlordStreetInput, setLandlordStreetInput] = useState("");
  const [landlordPostalCityInput, setLandlordPostalCityInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const selectedProperty = properties.find((p: any) => String(p.id) === selectedPropertyId);
  const propertyApts     = apartments.filter((a: any) => String(a["property-id"]) === selectedPropertyId);
  const selectedApt      = apartments.find((a: any) => String(a.id) === selectedAptId);

  // Map expense-type key → localized name
  const expenseTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    expenseTypes.forEach((et: any) => {
      const name = i18n.language === "de"
        ? (et["name-de"] || et["name-en"] || et.name || et.key)
        : (et["name-en"] || et["name-de"] || et.name || et.key);
      m[et.key] = name;
    });
    return m;
  }, [expenseTypes, i18n.language]);

  // Map expense-type key → distribution method
  const expenseTypeMethodMap = useMemo(() => {
    const m: Record<string, string> = {};
    expenseTypes.forEach((et: any) => {
      m[et.key] = et["distribution-method"] ?? "living-area";
    });
    return m;
  }, [expenseTypes]);

  const lineName = (key: string) => expenseTypeMap[key] ?? key;
  const lineMethod = (key: string) => expenseTypeMethodMap[key] ?? "living-area";

  const propertyCosts = useMemo(() => {
    if (!selectedPropertyId) return [];
    return costs.filter((c: any) => String(c["property-id"]) === selectedPropertyId);
  }, [costs, selectedPropertyId]);

  // Active cost lines for selected property: unique keys that have been entered (any year ≤ selected)
  const activeCostLines = useMemo(() => {
    const keys = new Set<string>();
    propertyCosts.forEach((c: any) => {
      if (Number(c.year) <= year) keys.add(c.line);
    });
    return [...keys];
  }, [propertyCosts, year]);

  // Holds an aptId to pre-select after the property-change effect resets the apt state
  const pendingAptId = useRef<string | null>(null);

  // Navigate directly to a property+apartment when triggered from the task widget
  useEffect(() => {
    if (!navContext?.nonce) return;
    if (navContext.propertyId) {
      pendingAptId.current = navContext.aptId ?? null;
      setSelectedPropertyId(navContext.propertyId);
      setSelectedTenantId(null);
    }
  }, [navContext?.nonce]);

  useEffect(() => {
    if (selectedPropertyId) {
      onLoadCosts?.(selectedPropertyId);
    }
    if (pendingAptId.current) {
      setSelectedAptId(pendingAptId.current);
      pendingAptId.current = null;
    } else {
      setSelectedAptId(null);
    }
    setSelectedTenantId(null);
  }, [selectedPropertyId, year]);

  useEffect(() => {
    if (selectedAptId) {
      onLoadAptCosts?.(selectedAptId);
      onLoadRentPayments?.(selectedAptId);
    }
  }, [selectedAptId]);

  useEffect(() => {
    setIbanInput(selectedProperty?.iban ?? "");
    setBankNameInput(selectedProperty?.["bank-name"] ?? "");
    setLandlordNameInput(selectedProperty?.["landlord-name"] ?? "");
    setLandlordStreetInput(selectedProperty?.["landlord-street"] ?? "");
    setLandlordPostalCityInput(selectedProperty?.["landlord-postal-city"] ?? "");
    setEditingBankInfo(false);
  }, [selectedPropertyId]);

  // ── Readiness computation ─────────────────────────────────────────────────

  /** All tenants who occupied this apartment at any point during the selected year. */
  const tenantsForApt = useMemo(() => {
    if (!selectedApt) return [] as any[];
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31);
    return tenants.filter((t: any) => {
      if (String(t["apartment-id"]) !== String(selectedApt.id)) return false;
      const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : new Date(0);
      const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : new Date(9999, 11, 31);
      return s <= yearEnd && e >= yearStart;
    });
  }, [tenants, selectedApt, year]);

  // When a specific tenant row was clicked, focus only on that tenant
  const focusedTenants = useMemo(() => {
    if (!selectedTenantId) return tenantsForApt;
    return tenantsForApt.filter((t: any) => String(t.id) === selectedTenantId);
  }, [tenantsForApt, selectedTenantId]);

  const selectedTenant = selectedTenantId
    ? (tenantsForApt.find((t: any) => String(t.id) === selectedTenantId) ?? null)
    : null;

  const hasTenant = focusedTenants.length > 0;
  const hasIban   = !!(selectedProperty?.iban);

  // Union of all months the focused tenant(s) were active
  const tenantActiveMonths = useMemo(() => {
    const monthSet = new Set<number>();
    focusedTenants.forEach((t: any) => tenantActiveMonthsFor(t, year).forEach(m => monthSet.add(m)));
    return [...monthSet].sort((a, b) => a - b);
  }, [focusedTenants, year]);

  // Cost lines missing an apt-cost entry for this exact year
  const missingCostLines = useMemo(
    () => activeCostLines.filter(key => !costEntryFor(aptCosts, key, year)),
    [activeCostLines, aptCosts, year]
  );

  // Rent payment months present in the selected year for the selected apartment
  const paidMonths = useMemo(
    () => new Set(
      rentPayments
        .filter((r: any) => Number(r.year) === year && (!selectedAptId || String(r["apartment-id"]) === selectedAptId))
        .map((r: any) => Number(r.month))
    ),
    [rentPayments, year, selectedAptId]
  );

  // Active months (union) that have no recorded rent payment
  const missingRentMonths = useMemo(
    () => tenantActiveMonths.filter(m => !paidMonths.has(m)),
    [tenantActiveMonths, paidMonths]
  );

  const isFullyReady =
    hasTenant &&
    hasIban &&
    activeCostLines.length > 0 &&
    missingCostLines.length === 0 &&
    (tenantActiveMonths.length === 0 || missingRentMonths.length === 0);

  // ── Per-tenant billing info ───────────────────────────────────────────────

  const perTenantInfo = useMemo(() => {
    const yearDays = isLeapYear(year) ? 366 : 365;
    return focusedTenants.map((tenant: any) => {
      const days   = tenantDaysInYear(tenant, year);
      const ratio  = days / yearDays;
      const months = tenantActiveMonthsFor(tenant, year);

      const missingMonths = months.filter(m => !paidMonths.has(m));

      const rc = tenant["residents-count"];
      const residents = (rc != null && !isNaN(Number(rc))) ? Number(rc) : 0;
      const tenantPersonDays = residents * days;

      // Per-line cost breakdown respecting distribution method
      const tenantId = String(tenant.id);
      const costBreakdown = activeCostLines.map(key => {
        // Prefer this tenant's entry; fall back to unscoped (legacy) entry
        const entry = aptCosts.find((c: any) => c.line === key && Number(c.year) === year && String(c["tenant-id"]) === tenantId)
          ?? aptCosts.find((c: any) => c.line === key && Number(c.year) === year && c["tenant-id"] == null)
          ?? null;
        const value    = Number(entry?.value ?? 0);
        const method   = lineMethod(key);
        const propTotal = effectiveCostValue(propertyCosts, key, year) ?? 0;
        const verteiler = Number(entry?.verteiler ?? 0);
        const anteil    = Number(entry?.anteil ?? 0);
        const share = (() => {
          if (method === "consumed") return value;
          // person and living-area: prorate annual apt share by tenant days
          if (propTotal > 0 && verteiler > 0 && anteil > 0) {
            return Math.min(propTotal * anteil / verteiler, propTotal) * ratio;
          }
          return value * ratio;
        })();
        return { key, name: lineName(key), method, aptValue: value, share };
      });

      const proratedTotal = costBreakdown.reduce((sum, { share }) => sum + share, 0);

      const prepayment = months
        .filter(m => paidMonths.has(m))
        .reduce((sum, m) => {
          const pmt = rentPayments.find((r: any) => Number(r.year) === year && Number(r.month) === m);
          return sum + Number(pmt?.["nebenkosten-warm"] ?? 0);
        }, 0);
      const net = proratedTotal - prepayment;

      const canGenerate = hasIban && missingCostLines.length === 0 && missingMonths.length === 0;

      return { tenant, days, ratio, months, missingMonths, costBreakdown, proratedTotal, prepayment, net, canGenerate };
    });
  }, [focusedTenants, year, paidMonths, rentPayments, activeCostLines, aptCosts, hasIban, missingCostLines, expenseTypeMethodMap]);

  // ── Bank info save ────────────────────────────────────────────────────────

  const handleSaveBankInfo = () => {
    if (!selectedProperty) return;
    onEditProperty?.(String(selectedProperty.id), {
      name:          selectedProperty.name,
      address:       selectedProperty.address,
      city:          selectedProperty.city,
      postalCode:    selectedProperty["postal-code"],
      country:       selectedProperty.country,
      units:         selectedProperty.units,
      purchasePrice: selectedProperty["purchase-price"],
      currentValue:  selectedProperty["current-value"],
      iban:               ibanInput.trim(),
      bankName:           bankNameInput.trim(),
      landlordName:       landlordNameInput.trim(),
      landlordStreet:     landlordStreetInput.trim(),
      landlordPostalCity: landlordPostalCityInput.trim(),
    });
    setEditingBankInfo(false);
  };

  // ── PDF generation ────────────────────────────────────────────────────────

  const handleGenerateForTenant = async (info: typeof perTenantInfo[0]) => {
    if (!selectedProperty || !selectedApt) return;
    setGenerating(true);
    try {
      const { tenant, days, ratio, prepayment } = info;

      const tenantIdForPdf = String(tenant.id);
      const rc = tenant["residents-count"];
      const residents = (rc != null && !isNaN(Number(rc))) ? Number(rc) : 0;
      const tenantPersonDays = residents * days;
      const costLines: CostLineItem[] = activeCostLines.map(key => {
        const aptEntry = aptCosts.find((c: any) => c.line === key && Number(c.year) === year && String(c["tenant-id"]) === tenantIdForPdf)
          ?? aptCosts.find((c: any) => c.line === key && Number(c.year) === year && c["tenant-id"] == null)
          ?? null;
        const method    = lineMethod(key);
        const propTotal = effectiveCostValue(propertyCosts, key, year) ?? 0;
        const verteiler = Number(aptEntry?.verteiler ?? 0);
        const anteil    = Number(aptEntry?.anteil ?? 0);
        const fullShare = Number(aptEntry?.value ?? 0);
        const share = (() => {
          if (method === "consumed") return fullShare;
          if (propTotal > 0 && verteiler > 0 && anteil > 0) return Math.min(propTotal * anteil / verteiler, propTotal) * ratio;
          return fullShare * ratio;
        })();
        return {
          name:       lineName(key),
          total:      propTotal > 0 ? propTotal : null,
          share,
          verteiler:  aptEntry?.verteiler ?? null,
          schluessel: aptEntry?.schluessel ?? null,
          anteil:     aptEntry?.anteil ?? null,
        };
      });

      let personCount = 1;
      try {
        const members = JSON.parse(tenant["household-members"] ?? "[]");
        if (Array.isArray(members)) personCount += members.length;
      } catch { /* ignore */ }

      const street     = selectedProperty.address ?? "";
      const postalCity = [selectedProperty["postal-code"], selectedProperty.city].filter(Boolean).join(" ");
      const landlordStreet     = selectedProperty["landlord-street"] || street;
      const landlordPostalCity = selectedProperty["landlord-postal-city"] || postalCity;

      // Clamp tenant's period to the billing year for the PDF header
      const yearStart = new Date(year, 0, 1);
      const yearEnd   = new Date(year, 11, 31);
      const tStart    = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
      const tEnd      = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
      const effStart  = tStart < yearStart ? yearStart : tStart;
      const effEnd    = tEnd   > yearEnd   ? yearEnd   : tEnd;

      const bytes = await generateBillingPdf({
        senderName:          selectedProperty.name ?? "Vermieter",
        senderStreet:        landlordStreet,
        senderPostalCity:    landlordPostalCity,
        senderAddress:       [landlordStreet, landlordPostalCity].filter(Boolean).join(", "),
        city:                selectedProperty.city ?? "",
        recipientName:       tenantDisplayName(tenant),
        recipientStreet:     street,
        recipientPostalCity: postalCity,
        propertyName:        selectedProperty.name,
        propertyAddress:     [street, postalCity].filter(Boolean).join(", "),
        apartmentCode:       selectedApt.code,
        year,
        iban:                selectedProperty.iban ?? ibanInput,
        bankName:            selectedProperty["bank-name"] ?? bankNameInput,
        costLines,
        prepayment,
        closingName:         selectedProperty["landlord-name"] || selectedProperty.name || "Vermieter",
        billingDays:         days,
        billingPeriodStart:  fmtGermanDate(effStart),
        billingPeriodEnd:    fmtGermanDate(effEnd),
        personCount,
      });

      const fname = tenantDisplayName(tenant).replace(/\s+/g, "_");
      downloadPdf(bytes, `Nebenkostenabrechnung_${selectedApt.code}_${fname}_${year}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const isOffDefaultYear = year !== defaultBillingYear;

  const YearNav = () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className={`min-w-[3.5rem] text-center text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
        isOffDefaultYear
          ? "border-amber-400 bg-amber-50 text-amber-800"
          : "border-transparent text-foreground"
      }`}>{year}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const YearBanner = () => isOffDefaultYear ? (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <CalendarClock className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t(year < defaultBillingYear ? "yearBanner.past" : "yearBanner.future", { year })}</span>
      <button
        className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap hover:text-amber-900"
        onClick={() => setYear(defaultBillingYear)}
      >
        {t("yearBanner.returnTo", { year: defaultBillingYear })}
      </button>
    </div>
  ) : null;

  // ── View: property list ───────────────────────────────────────────────────

  if (!selectedPropertyId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold">{t("title")}</h2>
          </div>
          <YearNav />
        </div>
        <YearBanner />

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProperties")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p: any) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedPropertyId(String(p.id))}
              >
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold">{p.name}</p>
                  {p.address && (
                    <p className="text-xs text-muted-foreground mt-1">{p.address}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {p.iban ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> IBAN
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <XCircle className="h-3.5 w-3.5" /> {t("missingIban")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── View: apartment list within property ──────────────────────────────────

  if (!selectedAptId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPropertyId(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("backToProperties")}
            </Button>
            <h2 className="text-xl font-bold">{selectedProperty?.name}</h2>
          </div>
          <YearNav />
        </div>
        <YearBanner />

        {/* Bank info card */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{t("bankInfo")}</p>
              {!editingBankInfo && (
                <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setEditingBankInfo(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("editBankInfo")}
                </Button>
              )}
            </div>
            {editingBankInfo ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-20 text-muted-foreground">{t("iban")}</span>
                  <Input
                    value={ibanInput}
                    onChange={e => setIbanInput(e.target.value)}
                    placeholder={t("ibanPlaceholder")}
                    className="h-7 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-20 text-muted-foreground">{t("bankName")}</span>
                  <Input
                    value={bankNameInput}
                    onChange={e => setBankNameInput(e.target.value)}
                    placeholder={t("bankNamePlaceholder")}
                    className="h-7 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-20 text-muted-foreground">{t("landlordName")}</span>
                  <Input
                    value={landlordNameInput}
                    onChange={e => setLandlordNameInput(e.target.value)}
                    placeholder={t("landlordNamePlaceholder")}
                    className="h-7 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-20 text-muted-foreground">{t("landlordStreet")}</span>
                  <Input
                    value={landlordStreetInput}
                    onChange={e => setLandlordStreetInput(e.target.value)}
                    placeholder={t("landlordStreetPlaceholder")}
                    className="h-7 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-20 text-muted-foreground">{t("landlordPostalCity")}</span>
                  <Input
                    value={landlordPostalCityInput}
                    onChange={e => setLandlordPostalCityInput(e.target.value)}
                    placeholder={t("landlordPostalCityPlaceholder")}
                    className="h-7 text-sm flex-1"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 px-3" disabled={propertySaving} onClick={handleSaveBankInfo}>
                    {t("saveBankInfo")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingBankInfo(false)}>
                    {t("cancelEdit")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("iban")}</p>
                  <p className="font-mono">{selectedProperty?.iban || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("bankName")}</p>
                  <p>{selectedProperty?.["bank-name"] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("landlordName")}</p>
                  <p>{selectedProperty?.["landlord-name"] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("landlordStreet")}</p>
                  <p>{selectedProperty?.["landlord-street"] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("landlordPostalCity")}</p>
                  <p>{selectedProperty?.["landlord-postal-city"] || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {costsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading", { ns: "costs" })}</p>
        ) : propertyApts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noApartments")}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              {propertyApts.flatMap((apt: any) => {
                const yearStart = new Date(year, 0, 1);
                const yearEnd   = new Date(year, 11, 31);
                const aptTenantsInYear = tenants.filter((te: any) => {
                  if (String(te["apartment-id"]) !== String(apt.id)) return false;
                  const s = te["start-date"] ? new Date(te["start-date"] + "T00:00:00") : new Date(0);
                  const e = te["end-date"]   ? new Date(te["end-date"]   + "T00:00:00") : new Date(9999, 11, 31);
                  return s <= yearEnd && e >= yearStart;
                });

                if (aptTenantsInYear.length === 0) {
                  return [(
                    <div
                      key={apt.id}
                      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => { setSelectedAptId(String(apt.id)); setSelectedTenantId(null); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{apt.code}</p>
                        <p className="text-xs text-muted-foreground">{t("noTenant")}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  )];
                }

                return aptTenantsInYear.map((tenant: any) => {
                  const tStart   = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
                  const tEnd     = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : new Date(9999, 11, 31);
                  const effStart = tStart < yearStart ? yearStart : tStart;
                  const effEnd   = tEnd   > yearEnd   ? yearEnd   : tEnd;
                  const listDays = Math.round((effEnd.getTime() - effStart.getTime()) / 86400000) + 1;
                  return (
                    <div
                      key={`${apt.id}-${tenant.id}`}
                      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => { setSelectedAptId(String(apt.id)); setSelectedTenantId(String(tenant.id)); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {apt.code} — {tenantDisplayName(tenant)}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {fmtGermanDate(effStart)} – {fmtGermanDate(effEnd)}
                          <span className="ml-1.5">({listDays} Tage)</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                });
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── View: single apartment readiness + generate ───────────────────────────

  const isLoading = aptCostsLoading || rentLoading;

  const totalAnnualShare = activeCostLines.reduce((sum, key) => {
    return sum + Number(costEntryFor(aptCosts, key, year)?.value ?? 0);
  }, 0);

  const totalAnnualPropertyCosts = activeCostLines.reduce((sum, key) => {
    return sum + (effectiveCostValue(propertyCosts, key, year) ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedAptId(null); setSelectedTenantId(null); }}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("backToApartments")}
          </Button>
          <h2 className="text-xl font-bold">
            {selectedProperty?.name} — {selectedApt?.code}
            {selectedTenant && ` — ${tenantDisplayName(selectedTenant)}`}
          </h2>
        </div>
        <YearNav />
      </div>
      <YearBanner />

      {/* Tenant(s) info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">{t("tenant")}</p>
          {focusedTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTenant")}</p>
          ) : (
            <div className="space-y-1">
              {focusedTenants.map((tenant: any, i: number) => {
                const yearStart = new Date(year, 0, 1);
                const yearEnd   = new Date(year, 11, 31);
                const tStart    = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
                const tEnd      = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
                const effStart  = tStart < yearStart ? yearStart : tStart;
                const effEnd    = tEnd   > yearEnd   ? yearEnd   : tEnd;
                const days      = tenantDaysInYear(tenant, year);
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{tenantDisplayName(tenant)}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtGermanDate(effStart)} – {fmtGermanDate(effEnd)}
                      <span className="ml-1.5 tabular-nums">({days} Tage)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">IBAN</p>
              <p className="font-mono text-xs">{selectedProperty?.iban || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("bankName")}</p>
              <p>{selectedProperty?.["bank-name"] || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : (
        <>
          {/* Readiness status */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{t("readiness")}</p>
                {isFullyReady ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("ready")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <XCircle className="h-4 w-4" />
                    {t("notReady")}
                  </span>
                )}
              </div>
              {!isFullyReady && (
                <div className="flex flex-col gap-1.5">
                  {!hasTenant && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("missingTenant")}
                    </span>
                  )}
                  {!hasIban && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("missingIban")}
                    </span>
                  )}
                  {missingCostLines.map(key => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-amber-600">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("missingShare")}: <span className="font-medium">{lineName(key)}</span>
                    </span>
                  ))}
                  {missingRentMonths.map(m => (
                    <span key={m} className="flex items-center gap-1.5 text-xs text-amber-600">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      {t("missingRentMonth")}: <span className="font-medium">
                        {new Date(year, m - 1).toLocaleString(i18n.language === "de" ? "de-DE" : "en-US", { month: "long" })}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost breakdown table — annual apartment-level shares */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b px-4 py-2 gap-2">
                <span>{t("costLine")}</span>
                <span className="text-right">{t("total")}</span>
                <span className="text-right">{t("verteiler")}</span>
                <span className="text-right">{t("anteil", { defaultValue: "Anteil" })}</span>
                <span className="text-center">{t("schluessel")}</span>
                <span className="text-right">{t("share")}</span>
              </div>
              {activeCostLines.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("noCostLines")}
                </div>
              ) : (
                activeCostLines.map(key => {
                  const propTotal  = effectiveCostValue(propertyCosts, key, year);
                  const aptEntry   = costEntryFor(aptCosts, key, year);
                  const aptShare   = aptEntry ? Number(aptEntry.value) : null;
                  const verteiler  = aptEntry?.verteiler ?? "—";
                  const anteil     = aptEntry?.anteil ?? "—";
                  const schluessel = aptEntry?.schluessel ?? "—";
                  return (
                    <div key={key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-b last:border-b-0 gap-2 items-center">
                      <span>{lineName(key)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {propTotal != null ? `€ ${formatEur(propTotal)}` : "—"}
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">{verteiler}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{anteil}</span>
                      <span className="text-center text-muted-foreground leading-tight">{schluessel}</span>
                      <span className="text-right tabular-nums">
                        {aptShare != null ? `€ ${formatEur(aptShare)}` : "—"}
                      </span>
                    </div>
                  );
                })
              )}
              <div className="flex items-center justify-between px-4 py-2 border-t border-dashed text-sm text-muted-foreground">
                <span>{t("totalPropertyCosts", { defaultValue: "Gesamtkosten" })}</span>
                <span className="tabular-nums">€ {formatEur(totalAnnualPropertyCosts)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
                <span className="font-medium">{t("totalCosts")}</span>
                <span className="tabular-nums font-medium">€ {formatEur(totalAnnualShare)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Per-tenant prorated billing */}
          {perTenantInfo.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] text-xs font-medium text-muted-foreground border-b px-4 py-2 gap-2">
                  <span>{t("tenant")}</span>
                  <span className="text-right">{t("share")}</span>
                  <span className="text-right">{t("prepayment")}</span>
                  <span className="text-right">{t("netPayment")}</span>
                  <span />
                </div>
                {perTenantInfo.map((info, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-4 py-3 border-b last:border-b-0 gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{tenantDisplayName(info.tenant)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{info.days} Tage ({Math.round(info.ratio * 100)}%)</p>
                    </div>
                    <span className="text-right tabular-nums text-sm">
                      € {formatEur(info.proratedTotal)}
                    </span>
                    <span className="text-right tabular-nums text-sm text-muted-foreground">
                      − € {formatEur(info.prepayment)}
                    </span>
                    <div className="text-right">
                      <span className={`tabular-nums text-sm font-semibold ${info.net >= 0 ? "text-destructive" : "text-green-600"}`}>
                        € {formatEur(Math.abs(info.net))}
                      </span>
                      <p className={`text-xs ${info.net >= 0 ? "text-muted-foreground" : "text-green-600"}`}>
                        {info.net < 0 ? "Gutschrift" : "Nachzahlung"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!info.canGenerate || generating}
                      onClick={() => handleGenerateForTenant(info)}
                      className="h-7 gap-1.5 shrink-0"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {generating ? t("generating") : t("generate")}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
