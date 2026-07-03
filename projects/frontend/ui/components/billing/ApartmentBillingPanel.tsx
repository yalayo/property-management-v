import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, FileText, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { generateBillingPdf, downloadPdf } from "./pdfGenerator";
import type { CostLineItem } from "./pdfGenerator";

// ── Helpers (mirrored from NebenkostenAbrechnung for component isolation) ──────

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function costEntryForYear(costs: any[], lineKey: string, year: number) {
  return costs.find((c: any) => c.line === lineKey && Number(c.year) === year) ?? null;
}

function effectiveCostVal(costs: any[], lineKey: string, year: number): number | null {
  const exact = costEntryForYear(costs, lineKey, year);
  if (exact) return Number(exact.value);
  const inherited = [...costs]
    .filter((c: any) => c.line === lineKey && Number(c.year) < year)
    .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0];
  return inherited ? Number(inherited.value) : null;
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function tenantDaysInYear(tenant: any, year: number): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const start = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const end   = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const effStart = start < yearStart ? yearStart : start;
  const effEnd   = end   > yearEnd   ? yearEnd   : end;
  return Math.max(0, Math.round((effEnd.getTime() - effStart.getTime()) / 86400000) + 1);
}

function tenantActiveMonthsFor(tenant: any, year: number): number[] {
  const start = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : null;
  const end   = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : null;
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const mStart   = new Date(year, m - 1, 1);
    const mEnd     = new Date(year, m, 0);
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  year: number;
  property?: any;
  apartment?: any;
  tenants?: any[];
  aptCosts?: any[];
  propertyCosts?: any[];
  expenseTypes?: any[];
  rentPayments?: any[];
  isLoading?: boolean;
  propertySaving?: boolean;
  onEditProperty?: (id: string, data: any) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApartmentBillingPanel({
  year,
  property,
  apartment,
  tenants = [],
  aptCosts = [],
  propertyCosts = [],
  expenseTypes = [],
  rentPayments = [],
  isLoading,
  propertySaving,
  onEditProperty,
}: Props) {
  const { t, i18n } = useTranslation("abrechnung");
  const [generating, setGenerating] = useState(false);
  const [selectedTenantIdx, setSelectedTenantIdx] = useState(0);
  const [editingBankInfo, setEditingBankInfo] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [landlordNameInput, setLandlordNameInput] = useState("");
  const [landlordStreetInput, setLandlordStreetInput] = useState("");
  const [landlordPostalCityInput, setLandlordPostalCityInput] = useState("");

  // Reset tab when year or apartment changes
  useEffect(() => { setSelectedTenantIdx(0); }, [year, apartment?.id]);

  // Sync bank info inputs when property changes
  useEffect(() => {
    setIbanInput(property?.iban ?? "");
    setBankNameInput(property?.["bank-name"] ?? "");
    setLandlordNameInput(property?.["landlord-name"] ?? "");
    setLandlordStreetInput(property?.["landlord-street"] ?? "");
    setLandlordPostalCityInput(property?.["landlord-postal-city"] ?? "");
    setEditingBankInfo(false);
  }, [property?.id]);

  const handleSaveBankInfo = () => {
    if (!property) return;
    onEditProperty?.(String(property.id), {
      name:               property.name,
      address:            property.address,
      city:               property.city,
      postalCode:         property["postal-code"],
      country:            property.country,
      units:              property.units,
      purchasePrice:      property["purchase-price"],
      currentValue:       property["current-value"],
      iban:               ibanInput.trim(),
      bankName:           bankNameInput.trim(),
      landlordName:       landlordNameInput.trim(),
      landlordStreet:     landlordStreetInput.trim(),
      landlordPostalCity: landlordPostalCityInput.trim(),
    });
    setEditingBankInfo(false);
  };

  // Expense type name + method maps
  const expenseTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    expenseTypes.forEach((et: any) => {
      m[et.key] = (i18n.language === "de" ? et["name-de"] : et["name-en"]) || et.name || et.key;
    });
    return m;
  }, [expenseTypes, i18n.language]);

  const expenseTypeMethodMap = useMemo(() => {
    const m: Record<string, string> = {};
    expenseTypes.forEach((et: any) => { m[et.key] = et["distribution-method"] ?? "living-area"; });
    return m;
  }, [expenseTypes]);

  const lineName   = (key: string) => expenseTypeMap[key]       ?? key;
  const lineMethod = (key: string) => expenseTypeMethodMap[key] ?? "living-area";

  // Tenants for this apartment active in this year
  const tenantsForApt = useMemo(() => {
    if (!apartment) return [] as any[];
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31);
    return tenants.filter((tn: any) => {
      if (String(tn["apartment-id"]) !== String(apartment.id)) return false;
      const s = tn["start-date"] ? new Date(tn["start-date"] + "T00:00:00") : new Date(0);
      const e = tn["end-date"]   ? new Date(tn["end-date"]   + "T00:00:00") : new Date(9999, 11, 31);
      return s <= yearEnd && e >= yearStart;
    });
  }, [tenants, apartment, year]);

  const isMultiTenant = tenantsForApt.length > 1;

  // Unique cost lines from propertyCosts with any entry ≤ year
  const activeCostLines = useMemo(() => {
    const keys = new Set<string>();
    propertyCosts.forEach((c: any) => { if (Number(c.year) <= year) keys.add(c.line); });
    return [...keys];
  }, [propertyCosts, year]);

  // Paid months (rent payments) for this year
  const paidMonths = useMemo(
    () => new Set(rentPayments.filter((r: any) => Number(r.year) === year).map((r: any) => Number(r.month))),
    [rentPayments, year]
  );

  // Cost lines without an apt-cost entry for this exact year
  const missingCostLines = useMemo(
    () => activeCostLines.filter(key => !costEntryForYear(aptCosts, key, year)),
    [activeCostLines, aptCosts, year]
  );

  const hasTenant = tenantsForApt.length > 0;
  const hasIban   = !!(property?.iban);

  // Per-tenant billing calculation (prorated days + cost breakdown + missing months)
  const perTenantInfo = useMemo(() => {
    const yearDays = isLeapYear(year) ? 366 : 365;
    return tenantsForApt.map((tenant: any) => {
      const days   = tenantDaysInYear(tenant, year);
      const ratio  = days / yearDays;
      const months = tenantActiveMonthsFor(tenant, year);
      const missingMonths = months.filter(m => !paidMonths.has(m));
      const costBreakdown = activeCostLines.map(key => {
        const entry  = costEntryForYear(aptCosts, key, year);
        const value  = Number(entry?.value ?? 0);
        const method = lineMethod(key);
        const share  = method === "consumed" ? value : value * ratio;
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
  }, [tenantsForApt, year, paidMonths, rentPayments, activeCostLines, aptCosts, hasIban, missingCostLines]);

  // Selected tenant (clamped to valid range)
  const selectedInfo = perTenantInfo.length > 0
    ? perTenantInfo[Math.min(selectedTenantIdx, perTenantInfo.length - 1)]
    : null;

  // Readiness for the currently selected tenant
  const isReady =
    hasTenant &&
    hasIban &&
    activeCostLines.length > 0 &&
    missingCostLines.length === 0 &&
    (selectedInfo?.missingMonths.length ?? 0) === 0;

  // Totals (property-level, shown once in table footer)
  const totalAnnualPropertyCosts = activeCostLines.reduce(
    (sum, key) => sum + (effectiveCostVal(propertyCosts, key, year) ?? 0), 0
  );

  // ── PDF generation ────────────────────────────────────────────────────────

  const handleGenerateForTenant = async (info: typeof perTenantInfo[0]) => {
    if (!property || !apartment) return;
    setGenerating(true);
    try {
      const { tenant, days, ratio, prepayment } = info;
      const costLines: CostLineItem[] = activeCostLines.map(key => {
        const aptEntry  = costEntryForYear(aptCosts, key, year);
        const fullShare = Number(aptEntry?.value ?? 0);
        const method    = lineMethod(key);
        return {
          name:      lineName(key),
          total:     effectiveCostVal(propertyCosts, key, year),
          share:     method === "consumed" ? fullShare : fullShare * ratio,
          verteiler: aptEntry?.verteiler ?? null,
          schluessel: aptEntry?.schluessel ?? null,
          anteil:    aptEntry?.anteil ?? null,
        };
      });

      let personCount = 1;
      try {
        const members = JSON.parse(tenant["household-members"] ?? "[]");
        if (Array.isArray(members)) personCount += members.length;
      } catch { /* ignore */ }

      const street             = property.address ?? "";
      const postalCity         = [property["postal-code"], property.city].filter(Boolean).join(" ");
      const landlordStreet     = property["landlord-street"]      || street;
      const landlordPostalCity = property["landlord-postal-city"] || postalCity;

      const yearStart = new Date(year, 0, 1);
      const yearEnd   = new Date(year, 11, 31);
      const tStart    = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
      const tEnd      = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
      const effStart  = tStart < yearStart ? yearStart : tStart;
      const effEnd    = tEnd   > yearEnd   ? yearEnd   : tEnd;

      const bytes = await generateBillingPdf({
        senderName:          property.name ?? "Vermieter",
        senderStreet:        landlordStreet,
        senderPostalCity:    landlordPostalCity,
        senderAddress:       [landlordStreet, landlordPostalCity].filter(Boolean).join(", "),
        city:                property.city ?? "",
        recipientName:       tenantDisplayName(tenant),
        recipientStreet:     street,
        recipientPostalCity: postalCity,
        propertyName:        property.name,
        propertyAddress:     [street, postalCity].filter(Boolean).join(", "),
        apartmentCode:       apartment.code,
        year,
        iban:                property.iban ?? "",
        bankName:            property["bank-name"] ?? "",
        costLines,
        prepayment,
        closingName:         property["landlord-name"] || property.name || "Vermieter",
        billingDays:         days,
        billingPeriodStart:  fmtGermanDate(effStart),
        billingPeriodEnd:    fmtGermanDate(effEnd),
        personCount,
      });

      const fname = tenantDisplayName(tenant).replace(/\s+/g, "_");
      downloadPdf(bytes, `Nebenkostenabrechnung_${apartment.code}_${fname}_${year}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Laden…</p>;
  }

  const monthName = (m: number) =>
    new Date(year, m - 1).toLocaleString(i18n.language === "de" ? "de-DE" : "en-US", { month: "long" });

  return (
    <div className="space-y-4">
      {/* Tenant overview card */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">{t("tenant")}</p>
          {tenantsForApt.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTenant")}</p>
          ) : (
            <div className="space-y-1">
              {tenantsForApt.map((tenant: any, i: number) => {
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
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {fmtGermanDate(effStart)} – {fmtGermanDate(effEnd)}
                      <span className="ml-1.5">({days} {t("days", { defaultValue: "Tage" })})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("bankInfo")}</p>
              {!editingBankInfo && (
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => setEditingBankInfo(true)}>
                  <Pencil className="h-3 w-3" />
                  {t("editBankInfo")}
                </Button>
              )}
            </div>
            {editingBankInfo ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-28 text-muted-foreground shrink-0">{t("iban")}</span>
                  <Input value={ibanInput} onChange={e => setIbanInput(e.target.value)} placeholder={t("ibanPlaceholder")} className="h-7 text-sm flex-1" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-28 text-muted-foreground shrink-0">{t("bankName")}</span>
                  <Input value={bankNameInput} onChange={e => setBankNameInput(e.target.value)} placeholder={t("bankNamePlaceholder")} className="h-7 text-sm flex-1" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-28 text-muted-foreground shrink-0">{t("landlordName")}</span>
                  <Input value={landlordNameInput} onChange={e => setLandlordNameInput(e.target.value)} placeholder={t("landlordNamePlaceholder")} className="h-7 text-sm flex-1" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-28 text-muted-foreground shrink-0">{t("landlordStreet")}</span>
                  <Input value={landlordStreetInput} onChange={e => setLandlordStreetInput(e.target.value)} placeholder={t("landlordStreetPlaceholder")} className="h-7 text-sm flex-1" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-28 text-muted-foreground shrink-0">{t("landlordPostalCity")}</span>
                  <Input value={landlordPostalCityInput} onChange={e => setLandlordPostalCityInput(e.target.value)} placeholder={t("landlordPostalCityPlaceholder")} className="h-7 text-sm flex-1" />
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
                  <p className="font-mono text-xs">{property?.iban || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("bankName")}</p>
                  <p>{property?.["bank-name"] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("landlordName")}</p>
                  <p>{property?.["landlord-name"] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("landlordStreet")}</p>
                  <p>{property?.["landlord-street"] || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{t("landlordPostalCity")}</p>
                  <p>{property?.["landlord-postal-city"] || "—"}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tenant tab selector — only when multiple tenants in the year */}
      {isMultiTenant && (
        <div className="flex gap-0 border-b">
          {perTenantInfo.map((info, i) => (
            <button
              key={i}
              className={cn(
                "pb-2 px-4 text-sm font-medium border-b-2 transition-colors",
                selectedTenantIdx === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSelectedTenantIdx(i)}
            >
              {tenantDisplayName(info.tenant)}
              <span className="ml-1.5 text-xs opacity-60">
                ({info.days} {t("days", { defaultValue: "Tage" })})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Status card — per tenant when multi-tenant, apartment-level when single */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{t("readiness")}</p>
            {isReady ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> {t("ready")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <XCircle className="h-4 w-4" /> {t("notReady")}
              </span>
            )}
          </div>
          {!isReady && (
            <div className="flex flex-col gap-1.5">
              {!hasTenant && <Missing label={t("missingTenant")} />}
              {!hasIban   && <Missing label={t("missingIban")} />}
              {activeCostLines.length === 0 && <Missing label={t("noCostLines")} />}
              {missingCostLines.map(key => (
                <Missing key={key} label={`${t("missingShare")}: ${lineName(key)}`} />
              ))}
              {(selectedInfo?.missingMonths ?? []).map(m => (
                <Missing key={m} label={`${t("missingRentMonth")}: ${monthName(m)}`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost breakdown — "Ihr Anteil" shows the selected tenant's prorated share */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b px-4 py-2 gap-2">
            <span>{t("costLine")}</span>
            <span className="text-right">{t("total")}</span>
            <span className="text-right">{t("verteiler")}</span>
            <span className="text-center">{t("schluessel")}</span>
            <span className="text-right">{t("share")}</span>
          </div>
          {activeCostLines.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t("noCostLines")}</div>
          ) : (
            activeCostLines.map(key => {
              const propTotal = effectiveCostVal(propertyCosts, key, year);
              const aptEntry  = costEntryForYear(aptCosts, key, year);
              const tenantShare = selectedInfo?.costBreakdown.find(b => b.key === key)?.share ?? null;
              return (
                <div key={key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-b last:border-b-0 gap-2 items-center">
                  <span>{lineName(key)}</span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {propTotal != null ? `€ ${formatEur(propTotal)}` : "—"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{aptEntry?.verteiler ?? "—"}</span>
                  <span className="text-center text-muted-foreground leading-tight">{aptEntry?.schluessel ?? "—"}</span>
                  <span className="text-right tabular-nums">
                    {tenantShare != null ? `€ ${formatEur(tenantShare)}` : "—"}
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
            <span className="tabular-nums font-medium">
              {selectedInfo != null ? `€ ${formatEur(selectedInfo.proratedTotal)}` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary + PDF for the selected tenant */}
      {selectedInfo && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2.5">
            {isMultiTenant && (
              <p className="text-xs text-muted-foreground pb-1">
                {tenantDisplayName(selectedInfo.tenant)}
                {" · "}
                {selectedInfo.days} {t("days", { defaultValue: "Tage" })}
                {" "}
                ({Math.round(selectedInfo.ratio * 100)}%)
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("share")}</span>
              <span className="tabular-nums">€ {formatEur(selectedInfo.proratedTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("prepayment")}</span>
              <span className="tabular-nums text-muted-foreground">− € {formatEur(selectedInfo.prepayment)}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-t pt-2.5">
              <span className="font-semibold">{t("netPayment")}</span>
              <span className={cn(
                "tabular-nums font-semibold",
                selectedInfo.net >= 0 ? "text-destructive" : "text-green-600"
              )}>
                € {formatEur(Math.abs(selectedInfo.net))}
                {selectedInfo.net < 0 && (
                  <span className="text-xs font-normal ml-1 opacity-70">
                    ({t("credit", { defaultValue: "Guthaben" })})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                disabled={!selectedInfo.canGenerate || generating}
                onClick={() => handleGenerateForTenant(selectedInfo)}
                className="gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                {generating ? t("generating") : t("generate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-amber-600">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
