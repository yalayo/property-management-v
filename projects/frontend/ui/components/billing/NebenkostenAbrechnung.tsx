import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, FileText, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { generateBillingPdf, downloadPdf } from "./pdfGenerator";
import type { CostLineItem } from "./pdfGenerator";

// ── Types ─────────────────────────────────────────────────────────────────────

type Readiness = { ready: boolean; missing: string[] } | null;

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

function effectiveAptCostEntry(aptCosts: any[], lineKey: string, year: number) {
  const exact = costEntryFor(aptCosts, lineKey, year);
  if (exact) return exact;
  return inheritedCostFor(aptCosts, lineKey, year);
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
  computeReadiness,
  onLoadCosts,
  onLoadAptCosts,
  onLoadRentPayments,
  onEditProperty,
}: Props) {
  const { t, i18n } = useTranslation("abrechnung");

  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [editingBankInfo, setEditingBankInfo] = useState(false);
  const [ibanInput, setIbanInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [generating, setGenerating] = useState(false);

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

  const lineName = (key: string) => expenseTypeMap[key] ?? key;

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

  useEffect(() => {
    if (selectedPropertyId) {
      onLoadCosts?.(selectedPropertyId);
    }
    setSelectedAptId(null);
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
    setEditingBankInfo(false);
  }, [selectedPropertyId]);

  // ── Readiness computation ─────────────────────────────────────────────────

  const tenantForApt = selectedApt
    ? tenants.find((t: any) => String(t["apartment-id"]) === String(selectedApt.id))
    : null;

  const hasTenant = !!tenantForApt;

  const hasAllCosts = selectedApt && activeCostLines.length > 0
    ? activeCostLines.every(key =>
        aptCosts.some((c: any) => c.line === key && Number(c.year) <= year)
      )
    : false;

  const hasPayments = selectedApt
    ? rentPayments.some((r: any) => Number(r.year) === year)
    : false;

  const hasIban = !!(selectedProperty?.iban);

  const readiness: Readiness = selectedApt && computeReadiness
    ? computeReadiness({ hasTenant, hasAllCosts, hasPayments, hasIban })
    : null;

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
      iban:          ibanInput.trim(),
      bankName:      bankNameInput.trim(),
    });
    setEditingBankInfo(false);
  };

  // ── PDF generation ────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedProperty || !selectedApt || !tenantForApt) return;
    setGenerating(true);
    try {
      const costLines: CostLineItem[] = activeCostLines.map(key => ({
        name:  lineName(key),
        total: effectiveCostValue(propertyCosts, key, year),
        share: effectiveCostValue(aptCosts, key, year) ?? 0,
      }));

      const prepayment = rentPayments
        .filter((r: any) => Number(r.year) === year)
        .reduce((sum: number, r: any) => sum + Number(r.value), 0);

      const bytes = await generateBillingPdf({
        senderName:      selectedProperty.name ?? "Vermieter",
        senderAddress:   [selectedProperty.address, selectedProperty["postal-code"], selectedProperty.city]
                           .filter(Boolean).join(", "),
        city:            selectedProperty.city ?? "",
        recipientName:   [tenantForApt["first-name"], tenantForApt["last-name"]].filter(Boolean).join(" ") || tenantForApt.name,
        propertyName:    selectedProperty.name,
        propertyAddress: [selectedProperty.address, selectedProperty["postal-code"], selectedProperty.city]
                           .filter(Boolean).join(", "),
        apartmentCode:   selectedApt.code,
        year,
        iban:            selectedProperty.iban ?? ibanInput,
        bankName:        selectedProperty["bank-name"] ?? bankNameInput,
        costLines,
        prepayment,
      });

      downloadPdf(bytes, `Nebenkostenabrechnung_${selectedApt.code}_${year}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const YearNav = () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="w-14 text-center text-sm font-medium tabular-nums">{year}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  function MissingBadge({ keys }: { keys: string[] }) {
    const labels: Record<string, string> = {
      tenant:   t("missingTenant"),
      costs:    t("missingCosts"),
      payments: t("missingPayments"),
      iban:     t("missingIban"),
    };
    return (
      <div className="flex flex-col gap-1">
        {keys.map(k => (
          <span key={k} className="flex items-center gap-1 text-xs text-amber-600">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {labels[k] ?? k}
          </span>
        ))}
      </div>
    );
  }

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
              {propertyApts.map((apt: any) => {
                const tenant = tenants.find((te: any) => String(te["apartment-id"]) === String(apt.id));
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedAptId(String(apt.id))}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{apt.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant
                          ? ([tenant["first-name"], tenant["last-name"]].filter(Boolean).join(" ") || tenant.name)
                          : t("noTenant")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── View: single apartment readiness + generate ───────────────────────────

  const isLoading = aptCostsLoading || rentLoading;

  const totalShare = activeCostLines.reduce((sum, key) => {
    return sum + (effectiveCostValue(aptCosts, key, year) ?? 0);
  }, 0);

  const prepaymentTotal = rentPayments
    .filter((r: any) => Number(r.year) === year)
    .reduce((sum: number, r: any) => sum + Number(r.value), 0);

  const net = totalShare - prepaymentTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAptId(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("backToApartments")}
          </Button>
          <h2 className="text-xl font-bold">
            {selectedProperty?.name} — {selectedApt?.code}
          </h2>
        </div>
        <YearNav />
      </div>

      {/* Tenant info */}
      <Card>
        <CardContent className="pt-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("tenant")}</p>
            <p className="font-medium">{tenantForApt
              ? ([tenantForApt["first-name"], tenantForApt["last-name"]].filter(Boolean).join(" ") || tenantForApt.name)
              : <span className="text-muted-foreground">{t("noTenant")}</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">IBAN</p>
            <p className="font-mono text-xs">{selectedProperty?.iban || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("bankName")}</p>
            <p>{selectedProperty?.["bank-name"] || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : (
        <>
          {/* Readiness */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{t("readiness")}</p>
                {readiness?.ready ? (
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
              {readiness && !readiness.ready && (
                <MissingBadge keys={readiness.missing} />
              )}
            </CardContent>
          </Card>

          {/* Cost summary table */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-xs font-medium text-muted-foreground border-b px-4 py-2 gap-1">
                <span>{t("costLine")}</span>
                <span className="text-right">{t("total")}</span>
                <span className="text-right">{t("verteiler")}</span>
                <span className="text-right">{t("schluessel")}</span>
                <span className="text-right">{t("share")}</span>
              </div>
              {activeCostLines.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("noCostLines")}
                </div>
              ) : (
                activeCostLines.map(key => {
                  const propTotal  = effectiveCostValue(propertyCosts, key, year);
                  const aptEntry   = effectiveAptCostEntry(aptCosts, key, year);
                  const aptShare   = aptEntry ? Number(aptEntry.value) : null;
                  const verteiler  = aptEntry?.verteiler ?? "—";
                  const schluessel = aptEntry?.schluessel ?? "—";
                  return (
                    <div key={key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-b last:border-b-0 gap-1">
                      <span>{lineName(key)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {propTotal != null ? `€ ${formatEur(propTotal)}` : "—"}
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">{verteiler}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{schluessel}</span>
                      <span className="text-right tabular-nums">
                        {aptShare != null ? `€ ${formatEur(aptShare)}` : "—"}
                      </span>
                    </div>
                  );
                })
              )}
              {/* Summary rows */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-t border-dashed gap-1">
                <span className="col-span-4 font-medium">{t("totalCosts")}</span>
                <span className="text-right tabular-nums font-medium">€ {formatEur(totalShare)}</span>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 gap-1">
                <span className="col-span-4 text-muted-foreground">{t("prepayment")}</span>
                <span className="text-right tabular-nums text-muted-foreground">− € {formatEur(prepaymentTotal)}</span>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-sm px-4 py-2 border-t bg-muted/30 gap-1">
                <span className="col-span-4 font-bold">{net >= 0 ? t("netPayment") : t("refund")}</span>
                <span className={`text-right tabular-nums font-bold ${net >= 0 ? "text-destructive" : "text-green-600"}`}>
                  € {formatEur(Math.abs(net))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Generate button */}
          <div className="flex justify-end">
            <Button
              disabled={!readiness?.ready || generating}
              onClick={handleGenerate}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {generating ? t("generating") : t("generate")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
