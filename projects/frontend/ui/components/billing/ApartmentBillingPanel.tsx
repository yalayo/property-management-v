import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
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
}: Props) {
  const { t, i18n } = useTranslation("abrechnung");
  const [generating, setGenerating] = useState(false);

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

  // Union of active months across all tenants
  const tenantActiveMonths = useMemo(() => {
    const s = new Set<number>();
    tenantsForApt.forEach(tn => tenantActiveMonthsFor(tn, year).forEach(m => s.add(m)));
    return [...s].sort((a, b) => a - b);
  }, [tenantsForApt, year]);

  const missingRentMonths = useMemo(
    () => tenantActiveMonths.filter(m => !paidMonths.has(m)),
    [tenantActiveMonths, paidMonths]
  );

  const hasTenant = tenantsForApt.length > 0;
  const hasIban   = !!(property?.iban);

  const isFullyReady =
    hasTenant &&
    hasIban &&
    activeCostLines.length > 0 &&
    missingCostLines.length === 0 &&
    (tenantActiveMonths.length === 0 || missingRentMonths.length === 0);

  // Per-tenant billing calculation
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
      const paidMonthCount = months.filter(m => paidMonths.has(m)).length;
      const prepayment = Number(tenant["nebenkosten-warm"] ?? 0) * paidMonthCount;
      const net = proratedTotal - prepayment;
      const canGenerate = hasIban && missingCostLines.length === 0 && missingMonths.length === 0;
      return { tenant, days, ratio, months, missingMonths, costBreakdown, proratedTotal, prepayment, net, canGenerate };
    });
  }, [tenantsForApt, year, paidMonths, activeCostLines, aptCosts, hasIban, missingCostLines]);

  // Totals
  const totalAnnualShare = activeCostLines.reduce(
    (sum, key) => sum + Number(costEntryForYear(aptCosts, key, year)?.value ?? 0), 0
  );
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

  return (
    <div className="space-y-4">
      {/* Tenant info + bank info */}
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
                      <span className="ml-1.5">({days} Tage)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">IBAN</p>
              <p className="font-mono text-xs">{property?.iban || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("bankName")}</p>
              <p>{property?.["bank-name"] || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">{t("readiness")}</p>
            {isFullyReady ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> {t("ready")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <XCircle className="h-4 w-4" /> {t("notReady")}
              </span>
            )}
          </div>
          {!isFullyReady && (
            <div className="flex flex-col gap-1.5">
              {!hasTenant && <Missing label={t("missingTenant")} />}
              {!hasIban   && <Missing label={t("missingIban")} />}
              {activeCostLines.length === 0 && <Missing label={t("noCostLines")} />}
              {missingCostLines.map(key => (
                <Missing key={key} label={`${t("missingShare")}: ${lineName(key)}`} />
              ))}
              {missingRentMonths.map(m => (
                <Missing key={m} label={`${t("missingRentMonth")}: ${new Date(year, m - 1).toLocaleString(
                  i18n.language === "de" ? "de-DE" : "en-US", { month: "long" }
                )}`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost breakdown table */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b px-4 py-2 gap-1">
            <span>{t("costLine")}</span>
            <span>{t("distributionMethod")}</span>
            <span className="text-right">{t("total")}</span>
            <span className="text-right">{t("verteiler")}</span>
            <span className="text-right">{t("schluessel")}</span>
            <span className="text-right">{t("share")}</span>
          </div>
          {activeCostLines.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t("noCostLines")}</div>
          ) : (
            activeCostLines.map(key => {
              const propTotal  = effectiveCostVal(propertyCosts, key, year);
              const aptEntry   = costEntryForYear(aptCosts, key, year);
              const aptShare   = aptEntry ? Number(aptEntry.value) : null;
              const method     = lineMethod(key);
              return (
                <div key={key} className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-b last:border-b-0 gap-1 items-center">
                  <span>{lineName(key)}</span>
                  <span className="text-xs text-muted-foreground">{t(`methods.${method}`)}</span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {propTotal != null ? `€ ${formatEur(propTotal)}` : "—"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{aptEntry?.verteiler ?? "—"}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{aptEntry?.schluessel ?? "—"}</span>
                  <span className="text-right tabular-nums">{aptShare != null ? `€ ${formatEur(aptShare)}` : "—"}</span>
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
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center px-4 py-3 border-b last:border-b-0 gap-2">
                <div>
                  <p className="text-sm font-medium">{tenantDisplayName(info.tenant)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {info.days} Tage ({Math.round(info.ratio * 100)}%)
                  </p>
                </div>
                <span className="text-right tabular-nums text-sm">€ {formatEur(info.proratedTotal)}</span>
                <span className="text-right tabular-nums text-sm text-muted-foreground">
                  − € {formatEur(info.prepayment)}
                </span>
                <span className={`text-right tabular-nums text-sm font-semibold ${info.net >= 0 ? "text-destructive" : "text-green-600"}`}>
                  € {formatEur(Math.abs(info.net))}
                </span>
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
