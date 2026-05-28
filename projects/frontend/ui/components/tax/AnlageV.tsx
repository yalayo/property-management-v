import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Save, X, Info, Building2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Property = {
  id: string;
  name: string;
  address?: string;
  "purchase-price"?: number | string;
};

type Apartment = {
  id: string;
  "property-id": string;
};

type RentPayment = {
  id: string;
  "apartment-id": string;
  year: number;
  kaltmiete?: number | string;
  "nebenkosten-warm"?: number | string;
  value?: number | string;
};

type Cost = {
  id: string;
  "property-id": string;
  year: number;
  value: number | string;
  name?: string;
};

type TaxConfig = {
  id?: string;
  "property-id": string;
  "land-value"?: number | string;
  "building-value"?: number | string;
  "afa-rate"?: number | string;
  "afa-start-date"?: string;
};

type Loan = {
  id: string;
  "property-id": string;
  year: number | string;
  "lender-name"?: string;
  "annual-interest": number | string;
  notes?: string;
};

type Props = {
  properties?: Property[];
  apartments?: Apartment[];
  allRentPayments?: RentPayment[];
  allCosts?: Cost[];
  taxConfigs?: TaxConfig[];
  loans?: Loan[];
  isReadOnly?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onSaveTaxConfig?: (data: any) => void;
  onAddLoan?: (data: any) => void;
  onUpdateLoan?: (data: any) => void;
  onDeleteLoan?: (id: string) => void;
};

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AnlageV({
  properties = [],
  apartments = [],
  allRentPayments = [],
  allCosts = [],
  taxConfigs = [],
  loans = [],
  isReadOnly = false,
  isLoading = false,
  isSaving = false,
  onSaveTaxConfig,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
}: Props) {
  const { t } = useTranslation("tax");
  const { t: tCommon } = useTranslation("common");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties.length > 0 ? String(properties[0].id) : ""
  );
  const [activeTab, setActiveTab] = useState<"summary" | "config" | "loans">("summary");

  // Config edit state
  const [editingConfig, setEditingConfig] = useState(false);
  const [cfgForm, setCfgForm] = useState({
    landValue: "",
    buildingValue: "",
    afaRate: "2",
    afaStartDate: "",
  });

  // Loan edit state
  const [addingLoan, setAddingLoan] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    lenderName: "",
    year: String(currentYear - 1),
    annualInterest: "",
    notes: "",
  });

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(String(properties[0].id));
    }
  }, [properties]);

  if (properties.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">{t("noProperties")}</p>
        </CardContent>
      </Card>
    );
  }

  const selectedProperty = properties.find(p => String(p.id) === selectedPropertyId);

  // Apartments that belong to selected property
  const propertyAptIds = new Set(
    apartments
      .filter(a => String(a["property-id"]) === selectedPropertyId)
      .map(a => String(a.id))
  );

  // Income calculation for selected property + year
  const yearPayments = allRentPayments.filter(
    p => Number(p.year) === year && propertyAptIds.has(String(p["apartment-id"]))
  );

  let totalKaltmiete = 0;
  let totalNK = 0;
  let totalValueFallback = 0;
  for (const p of yearPayments) {
    const k = parseNum(p.kaltmiete);
    const nk = parseNum(p["nebenkosten-warm"]);
    if (k > 0 || nk > 0) {
      totalKaltmiete += k;
      totalNK += nk;
    } else {
      totalValueFallback += parseNum(p.value);
    }
  }
  const totalIncome = totalKaltmiete + totalNK + totalValueFallback;

  // Property costs for selected property + year
  const yearCosts = allCosts.filter(
    c => String(c["property-id"]) === selectedPropertyId && Number(c.year) === year
  );
  const totalMaintenance = yearCosts.reduce((sum, c) => sum + parseNum(c.value), 0);

  // Tax config for selected property
  const taxConfig = taxConfigs.find(c => String(c["property-id"]) === selectedPropertyId);
  const buildingValue = parseNum(taxConfig?.["building-value"]);
  const afaRate = taxConfig?.["afa-rate"] !== undefined ? parseNum(taxConfig["afa-rate"]) : 2;
  const afaAmount = buildingValue > 0 ? (buildingValue * afaRate) / 100 : 0;

  // Loan interest for selected property + year
  const yearLoans = loans.filter(
    l => String(l["property-id"]) === selectedPropertyId && Number(l.year) === year
  );
  const totalInterest = yearLoans.reduce((sum, l) => sum + parseNum(l["annual-interest"]), 0);

  const totalDeductions = totalMaintenance + totalInterest + afaAmount;
  const taxableResult = totalIncome - totalDeductions;

  // All loans for the selected property (all years, for Loans tab)
  const propertyLoans = loans
    .filter(l => String(l["property-id"]) === selectedPropertyId)
    .sort((a, b) => Number(b.year) - Number(a.year));

  function startEditConfig() {
    setCfgForm({
      landValue: String(taxConfig?.["land-value"] ?? ""),
      buildingValue: String(taxConfig?.["building-value"] ?? ""),
      afaRate: String(taxConfig?.["afa-rate"] ?? "2"),
      afaStartDate: taxConfig?.["afa-start-date"] ?? "",
    });
    setEditingConfig(true);
  }

  function saveConfig() {
    if (!selectedPropertyId) return;
    onSaveTaxConfig?.({
      propertyId: selectedPropertyId,
      landValue: parseNum(cfgForm.landValue),
      buildingValue: parseNum(cfgForm.buildingValue),
      afaRate: parseNum(cfgForm.afaRate) || 2,
      afaStartDate: cfgForm.afaStartDate || null,
    });
    setEditingConfig(false);
  }

  function startAddLoan() {
    setLoanForm({ lenderName: "", year: String(year), annualInterest: "", notes: "" });
    setAddingLoan(true);
    setEditingLoanId(null);
  }

  function startEditLoan(loan: Loan) {
    setLoanForm({
      lenderName: loan["lender-name"] ?? "",
      year: String(loan.year),
      annualInterest: String(loan["annual-interest"] ?? ""),
      notes: loan.notes ?? "",
    });
    setEditingLoanId(String(loan.id));
    setAddingLoan(false);
  }

  function saveLoan() {
    const data = {
      propertyId: selectedPropertyId,
      lenderName: loanForm.lenderName || null,
      year: parseInt(loanForm.year) || year,
      annualInterest: parseNum(loanForm.annualInterest),
      notes: loanForm.notes || null,
    };
    if (editingLoanId) {
      onUpdateLoan?.({ id: editingLoanId, ...data });
      setEditingLoanId(null);
    } else {
      onAddLoan?.(data);
      setAddingLoan(false);
    }
    setLoanForm({ lenderName: "", year: String(year), annualInterest: "", notes: "" });
  }

  function cancelLoanEdit() {
    setAddingLoan(false);
    setEditingLoanId(null);
    setLoanForm({ lenderName: "", year: String(year), annualInterest: "", notes: "" });
  }

  const LoanForm = () => (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{t("loans.lenderName")}</Label>
          <Input
            value={loanForm.lenderName}
            onChange={e => setLoanForm(f => ({ ...f, lenderName: e.target.value }))}
            placeholder={t("loans.lenderPlaceholder")}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t("loans.yearLabel")}</Label>
          <Input
            type="number"
            value={loanForm.year}
            onChange={e => setLoanForm(f => ({ ...f, year: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t("loans.annualInterest")} (€)</Label>
          <Input
            value={loanForm.annualInterest}
            onChange={e => setLoanForm(f => ({ ...f, annualInterest: e.target.value }))}
            placeholder="0,00"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">{t("loans.notes")}</Label>
          <Input
            value={loanForm.notes}
            onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={saveLoan} disabled={isSaving}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isSaving ? tCommon("saving") : tCommon("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelLoanEdit}>
          <X className="h-3.5 w-3.5 mr-1" />
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              {selectedProperty && (
                <p className="text-sm text-muted-foreground mt-0.5">{selectedProperty.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {properties.length > 1 && (
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="w-48 h-8 text-sm">
                    <SelectValue placeholder={t("selectProperty")} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={String(p.id)} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Year navigator */}
              <div className="flex items-center gap-0.5 border rounded-lg px-1">
                <button
                  type="button"
                  className="p-1 hover:bg-muted rounded transition-colors"
                  onClick={() => setYear(y => y - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold px-2 min-w-[3.5rem] text-center tabular-nums">
                  {year}
                </span>
                <button
                  type="button"
                  className="p-1 hover:bg-muted rounded transition-colors"
                  onClick={() => setYear(y => y + 1)}
                  disabled={year >= currentYear - 1}
                >
                  <ChevronRight className="h-4 w-4 disabled:opacity-40" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tab bar */}
      <div className="bg-muted rounded-lg p-1 flex">
        {(["summary", "config", "loans"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition-all text-center ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          {/* ── Summary tab ─────────────────────────────────────────────── */}
          {activeTab === "summary" && (
            <Card>
              <CardContent className="pt-5 space-y-5">
                {/* Income */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t("summary.income.title")}
                  </p>
                  <div className="space-y-1.5">
                    {totalKaltmiete > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("summary.income.kaltmiete")}</span>
                        <span className="tabular-nums">€ {fmt(totalKaltmiete)}</span>
                      </div>
                    )}
                    {totalNK > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("summary.income.nebenkosten")}</span>
                        <span className="tabular-nums">€ {fmt(totalNK)}</span>
                      </div>
                    )}
                    {totalValueFallback > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("summary.income.rent")}</span>
                        <span className="tabular-nums">€ {fmt(totalValueFallback)}</span>
                      </div>
                    )}
                    {totalIncome === 0 && (
                      <p className="text-sm text-muted-foreground">{t("summary.income.empty")}</p>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                      <span>{t("summary.income.total")}</span>
                      <span className="tabular-nums">€ {fmt(totalIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t("summary.deductions.title")}
                  </p>
                  <div className="space-y-1.5">
                    {totalMaintenance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("summary.deductions.costs")}</span>
                        <span className="tabular-nums">€ {fmt(totalMaintenance)}</span>
                      </div>
                    )}
                    {totalInterest > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("summary.deductions.interest")}</span>
                        <span className="tabular-nums">€ {fmt(totalInterest)}</span>
                      </div>
                    )}
                    {afaAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("summary.deductions.afa")}
                          {" "}({afaRate}% × € {fmt(buildingValue)})
                        </span>
                        <span className="tabular-nums">€ {fmt(afaAmount)}</span>
                      </div>
                    )}
                    {totalDeductions === 0 && (
                      <p className="text-sm text-muted-foreground">{t("summary.deductions.empty")}</p>
                    )}
                    {totalDeductions > 0 && (
                      <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                        <span>{t("summary.deductions.total")}</span>
                        <span className="tabular-nums">€ {fmt(totalDeductions)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result */}
                <div
                  className={`rounded-xl border-2 p-3 ${
                    taxableResult >= 0
                      ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                      : "border-green-200 bg-green-50 dark:bg-green-950/20"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">
                      {taxableResult >= 0 ? t("summary.result.profit") : t("summary.result.loss")}
                    </span>
                    <span
                      className={`tabular-nums font-bold text-lg ${
                        taxableResult >= 0 ? "text-amber-700" : "text-green-700"
                      }`}
                    >
                      € {fmt(taxableResult)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("summary.result.hint")}</p>
                </div>

                {/* Hint when AfA not configured */}
                {!taxConfig && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t("summary.configHint")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── AfA Config tab ───────────────────────────────────────────── */}
          {activeTab === "config" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("config.title")}</CardTitle>
                  {!editingConfig && !isReadOnly && (
                    <Button variant="outline" size="sm" onClick={startEditConfig}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      {taxConfig ? tCommon("edit") : t("config.setup")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingConfig ? (
                  <div className="space-y-4">
                    {selectedProperty?.["purchase-price"] && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
                        <span className="text-muted-foreground">{t("config.purchasePrice")}</span>
                        <span className="font-medium tabular-nums">
                          € {fmt(parseNum(selectedProperty["purchase-price"]))}
                        </span>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">{t("config.landValue")} (€)</Label>
                        <Input
                          value={cfgForm.landValue}
                          onChange={e => {
                            const lv = e.target.value;
                            const pp = parseNum(selectedProperty?.["purchase-price"]);
                            const lvNum = parseNum(lv);
                            setCfgForm(f => ({
                              ...f,
                              landValue: lv,
                              buildingValue: pp > 0 && lvNum >= 0
                                ? String(Math.max(0, pp - lvNum))
                                : f.buildingValue,
                            }));
                          }}
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.buildingValue")} (€)</Label>
                        <Input
                          value={cfgForm.buildingValue}
                          onChange={e => setCfgForm(f => ({ ...f, buildingValue: e.target.value }))}
                          placeholder="0"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t("config.buildingValueHint")}</p>
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.afaRate")} (%)</Label>
                        <Input
                          value={cfgForm.afaRate}
                          onChange={e => setCfgForm(f => ({ ...f, afaRate: e.target.value }))}
                          placeholder="2"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t("config.afaRateHint")}</p>
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.afaStartDate")}</Label>
                        <Input
                          type="date"
                          value={cfgForm.afaStartDate}
                          onChange={e => setCfgForm(f => ({ ...f, afaStartDate: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveConfig} disabled={isSaving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {isSaving ? tCommon("saving") : tCommon("save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingConfig(false)}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        {tCommon("cancel")}
                      </Button>
                    </div>
                  </div>
                ) : taxConfig ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("config.landValue")}
                        </p>
                        <p className="text-sm mt-0.5 tabular-nums">
                          € {fmt(parseNum(taxConfig["land-value"]))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("config.buildingValue")}
                        </p>
                        <p className="text-sm mt-0.5 tabular-nums">
                          € {fmt(parseNum(taxConfig["building-value"]))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("config.afaRate")}
                        </p>
                        <p className="text-sm mt-0.5">{taxConfig["afa-rate"] ?? 2} %</p>
                      </div>
                      {taxConfig["afa-start-date"] && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("config.afaStartDate")}
                          </p>
                          <p className="text-sm mt-0.5">{taxConfig["afa-start-date"]}</p>
                        </div>
                      )}
                    </div>
                    {buildingValue > 0 && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
                        <span className="text-muted-foreground">
                          AfA {year} ({afaRate}% × € {fmt(buildingValue)})
                        </span>
                        <span className="font-semibold tabular-nums">€ {fmt(afaAmount)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("config.empty")}</p>
                    {!isReadOnly && (
                      <Button size="sm" className="mt-3" onClick={startEditConfig}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {t("config.setup")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Loans tab ────────────────────────────────────────────────── */}
          {activeTab === "loans" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("loans.title")}</CardTitle>
                  {!isReadOnly && !addingLoan && !editingLoanId && (
                    <Button size="sm" onClick={startAddLoan}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t("loans.add")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addingLoan && <LoanForm />}

                {propertyLoans.length === 0 && !addingLoan ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("loans.empty")}</p>
                    {!isReadOnly && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={startAddLoan}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {t("loans.add")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {propertyLoans.map(loan =>
                      editingLoanId === String(loan.id) ? (
                        <LoanForm key={String(loan.id)} />
                      ) : (
                        <div
                          key={String(loan.id)}
                          className="flex items-center justify-between rounded-xl border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {loan["lender-name"] || t("loans.unnamed")}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("loans.yearLabel")}: {loan.year}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="tabular-nums font-medium text-sm">
                              € {fmt(parseNum(loan["annual-interest"]))}
                            </span>
                            {!isReadOnly && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEditLoan(loan)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => onDeleteLoan?.(String(loan.id))}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
