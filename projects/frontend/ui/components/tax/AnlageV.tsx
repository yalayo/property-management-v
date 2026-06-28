import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Save, X, Info, Building2,
  FileDown, AlertTriangle, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { generateAnlageVPdf, downloadPdf, type AnlageVLine, type AnlageVPdfData } from "./anlageVPdf";

type Property = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  "postal-code"?: string;
  "purchase-price"?: number | string;
  "land-value"?: number | string;
  "building-value"?: number | string;
  "ownership-share"?: number | string;
  "acquisition-date"?: string;
  "landlord-name"?: string;
};

type Apartment = {
  id: string;
  "property-id": string;
  code?: string;
  wohnflaeche?: number | string | null;
  "market-rent"?: number | string | null;
};

type Garage = {
  id: string;
  "property-id"?: string;
  code?: string;
  "monthly-rent"?: number | string | null;
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
  line?: string;
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

type Maintenance = {
  id: string;
  "property-id": string;
  year: number | string;
  description?: string;
  amount: number | string;
  "spread-years"?: number | string;
};

type Props = {
  properties?: Property[];
  apartments?: Apartment[];
  garages?: Garage[];
  allRentPayments?: RentPayment[];
  allCosts?: Cost[];
  taxConfigs?: TaxConfig[];
  loans?: Loan[];
  maintenances?: Maintenance[];
  expenseTypes?: any[];
  isReadOnly?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onSaveTaxConfig?: (data: any) => void;
  onAddLoan?: (data: any) => void;
  onUpdateLoan?: (data: any) => void;
  onDeleteLoan?: (id: string) => void;
  onAddMaintenance?: (data: any) => void;
  onUpdateMaintenance?: (data: any) => void;
  onDeleteMaintenance?: (id: string) => void;
};

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Map an expense-type key onto an Anlage V Werbungskosten line group. */
function costGroup(key: string | undefined): "verwaltung" | "sonstige" | "betriebskosten" {
  const k = (key ?? "").toLowerCase();
  if (k === "sonstiges" || k === "sonstige") return "sonstige";
  if (k.includes("verwaltung")) return "verwaltung";
  return "betriebskosten";
}

export default function AnlageV({
  properties = [],
  apartments = [],
  garages = [],
  allRentPayments = [],
  allCosts = [],
  taxConfigs = [],
  loans = [],
  maintenances = [],
  isReadOnly = false,
  isLoading = false,
  isSaving = false,
  onSaveTaxConfig,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onAddMaintenance,
  onUpdateMaintenance,
  onDeleteMaintenance,
}: Props) {
  const { t } = useTranslation("tax");
  const { t: tCommon } = useTranslation("common");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties.length > 0 ? String(properties[0].id) : ""
  );
  const [activeTab, setActiveTab] = useState<"summary" | "config" | "loans" | "maintenance">("summary");
  const [generating, setGenerating] = useState(false);

  // Config edit state
  const [editingConfig, setEditingConfig] = useState(false);
  const [cfgForm, setCfgForm] = useState({ landValue: "", buildingValue: "", afaRate: "2", afaStartDate: "" });

  // Loan edit state
  const [addingLoan, setAddingLoan] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ lenderName: "", year: String(currentYear - 1), annualInterest: "", notes: "" });

  // Maintenance edit state
  const [addingMaint, setAddingMaint] = useState(false);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [maintForm, setMaintForm] = useState({ description: "", year: String(currentYear - 1), amount: "", spreadYears: "1" });

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

  // ── Derived sets ────────────────────────────────────────────────────────────
  const propertyApts = apartments.filter(a => String(a["property-id"]) === selectedPropertyId);
  const propertyAptIds = new Set(propertyApts.map(a => String(a.id)));
  const propertyGarages = garages.filter(g => String(g["property-id"]) === selectedPropertyId);

  // ── Income ──────────────────────────────────────────────────────────────────
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
  const garageIncome = propertyGarages.reduce((sum, g) => sum + parseNum(g["monthly-rent"]) * 12, 0);
  const totalIncome = totalKaltmiete + totalNK + totalValueFallback + garageIncome;

  // ── Operating costs grouped onto Anlage V lines ─────────────────────────────
  const yearCosts = allCosts.filter(
    c => String(c["property-id"]) === selectedPropertyId && Number(c.year) === year
  );
  let betriebskostenSum = 0;
  let verwaltungSum = 0;
  let sonstigeSum = 0;
  for (const c of yearCosts) {
    const v = parseNum(c.value);
    const g = costGroup(c.line);
    if (g === "verwaltung") verwaltungSum += v;
    else if (g === "sonstige") sonstigeSum += v;
    else betriebskostenSum += v;
  }

  // ── AfA (depreciation) with pro-rata first year + lifetime cap ──────────────
  const taxConfig = taxConfigs.find(c => String(c["property-id"]) === selectedPropertyId);
  const buildingValue = parseNum(taxConfig?.["building-value"]);
  const afaRate = taxConfig?.["afa-rate"] !== undefined && taxConfig?.["afa-rate"] !== "" ? parseNum(taxConfig["afa-rate"]) : 2;
  const fullAfa = buildingValue > 0 && afaRate > 0 ? (buildingValue * afaRate) / 100 : 0;
  const afaStart = taxConfig?.["afa-start-date"] ? new Date(taxConfig["afa-start-date"] + "T00:00:00") : null;
  const afaStartYear = afaStart ? afaStart.getFullYear() : null;
  let afaAmount = fullAfa;
  let afaNote = "";
  if (afaStartYear != null) {
    const lifetimeYears = afaRate > 0 ? Math.ceil(100 / afaRate) : Infinity;
    if (year < afaStartYear) {
      afaAmount = 0;
      afaNote = t("afaNotYet", { defaultValue: "vor AfA-Beginn" });
    } else if (year >= afaStartYear + lifetimeYears) {
      afaAmount = 0;
      afaNote = t("afaDone", { defaultValue: "vollständig abgeschrieben" });
    } else if (year === afaStartYear) {
      const monthsInFirstYear = 12 - afaStart!.getMonth(); // Jan=0 → 12 months
      afaAmount = (fullAfa * monthsInFirstYear) / 12;
      if (monthsInFirstYear < 12) afaNote = t("afaProRata", { months: monthsInFirstYear, defaultValue: `zeitanteilig ${monthsInFirstYear}/12` });
    }
  }

  // ── Loan interest ───────────────────────────────────────────────────────────
  const yearLoans = loans.filter(l => String(l["property-id"]) === selectedPropertyId && Number(l.year) === year);
  const totalInterest = yearLoans.reduce((sum, l) => sum + parseNum(l["annual-interest"]), 0);

  // ── Erhaltungsaufwand (maintenance) with multi-year spreading ───────────────
  const propertyMaints = maintenances.filter(m => String(m["property-id"]) === selectedPropertyId);
  const erhaltungThisYear = propertyMaints.reduce((sum, m) => {
    const startY = Number(m.year);
    const spread = Math.max(1, Math.round(parseNum(m["spread-years"]) || 1));
    if (year >= startY && year < startY + spread) return sum + parseNum(m.amount) / spread;
    return sum;
  }, 0);

  const totalDeductionsRaw =
    betriebskostenSum + verwaltungSum + sonstigeSum + afaAmount + totalInterest + erhaltungThisYear;

  // ── 66 % reduced-rent rule (§21 Abs. 2 EStG) ────────────────────────────────
  const marketAnnual = propertyApts.reduce((sum, a) => sum + parseNum(a["market-rent"]) * 12, 0);
  const actualKaltAnnual = totalKaltmiete;
  const rentRatio = marketAnnual > 0 && actualKaltAnnual > 0 ? actualKaltAnnual / marketAnnual : null;
  let deductibleFactor = 1;
  const warnings: string[] = [];
  if (rentRatio != null) {
    const pct = Math.round(rentRatio * 1000) / 10;
    if (rentRatio < 0.5) {
      deductibleFactor = rentRatio;
      warnings.push(t("warn.below50", { pct, factor: pct, defaultValue: `Miete ${pct}% der ortsüblichen Miete (< 50%): Werbungskosten nur anteilig (${pct}%) abziehbar.` }));
    } else if (rentRatio < 0.66) {
      warnings.push(t("warn.below66", { pct, defaultValue: `Miete ${pct}% der ortsüblichen Miete (50–66%): voller Abzug nur bei positiver Totalüberschussprognose.` }));
    }
  }
  const totalDeductionsEffective = totalDeductionsRaw * deductibleFactor;

  // ── Anschaffungsnahe Herstellungskosten (§6 Abs. 1 Nr. 1a EStG) ─────────────
  const acqDate = selectedProperty?.["acquisition-date"] ? new Date(selectedProperty["acquisition-date"] + "T00:00:00") : null;
  const acqYear = acqDate ? acqDate.getFullYear() : null;
  if (acqYear != null && buildingValue > 0) {
    const within3y = propertyMaints
      .filter(m => Number(m.year) >= acqYear && Number(m.year) <= acqYear + 2)
      .reduce((sum, m) => sum + parseNum(m.amount), 0);
    const threshold = 0.15 * buildingValue;
    if (within3y > threshold) {
      warnings.push(t("warn.herstellung", {
        sum: fmt(within3y), threshold: fmt(threshold),
        defaultValue: `Erhaltungsaufwand der ersten 3 Jahre (€ ${fmt(within3y)}) übersteigt 15% des Gebäudewerts (€ ${fmt(threshold)}). Mögliche anschaffungsnahe Herstellungskosten — nur über AfA absetzbar.`,
      }));
    }
  }

  // ── Ownership share ─────────────────────────────────────────────────────────
  const rawShare = parseNum(selectedProperty?.["ownership-share"]);
  const shareFraction = rawShare <= 0 ? 1 : rawShare > 1 ? rawShare / 100 : rawShare;
  const sharePct = Math.round(shareFraction * 1000) / 10;

  const result = totalIncome - totalDeductionsEffective;
  const ownerResult = result * shareFraction;

  // ── Structured line model (display + PDF) ───────────────────────────────────
  const incomeLines: AnlageVLine[] = [];
  if (totalKaltmiete > 0)    incomeLines.push({ zeile: "9",  label: t("summary.income.kaltmiete"), amount: totalKaltmiete });
  if (totalValueFallback > 0) incomeLines.push({ zeile: "9",  label: t("summary.income.rent"), amount: totalValueFallback });
  if (totalNK > 0)          incomeLines.push({ zeile: "13", label: t("summary.income.nebenkosten"), amount: totalNK });
  if (garageIncome > 0)     incomeLines.push({ zeile: "15", label: t("summary.income.garages", { defaultValue: "Garagen / Stellplätze" }), amount: garageIncome });

  const deductionLines: AnlageVLine[] = [];
  if (afaAmount > 0)        deductionLines.push({ zeile: "33", label: t("summary.deductions.afa"), amount: afaAmount, note: afaNote || `${afaRate}% × € ${fmt(buildingValue)}` });
  if (totalInterest > 0)   deductionLines.push({ zeile: "37", label: t("summary.deductions.interest"), amount: totalInterest });
  if (erhaltungThisYear > 0) deductionLines.push({ zeile: "40", label: t("summary.deductions.erhaltung", { defaultValue: "Erhaltungsaufwand" }), amount: erhaltungThisYear });
  if (betriebskostenSum > 0) deductionLines.push({ zeile: "50", label: t("summary.deductions.betriebskosten", { defaultValue: "Laufende Betriebskosten" }), amount: betriebskostenSum });
  if (verwaltungSum > 0)   deductionLines.push({ zeile: "51", label: t("summary.deductions.verwaltung", { defaultValue: "Verwaltungskosten" }), amount: verwaltungSum });
  if (sonstigeSum > 0)     deductionLines.push({ zeile: "52", label: t("summary.deductions.sonstige", { defaultValue: "Sonstige Werbungskosten" }), amount: sonstigeSum });

  // ── Readiness checklist ─────────────────────────────────────────────────────
  const checks = [
    { ok: buildingValue > 0, label: t("ready.buildingValue", { defaultValue: "Gebäudewert für AfA hinterlegt" }) },
    { ok: !!selectedProperty?.["acquisition-date"], label: t("ready.acqDate", { defaultValue: "Anschaffungsdatum erfasst" }) },
    { ok: totalIncome > 0, label: t("ready.income", { defaultValue: "Mieteinnahmen erfasst" }) },
    { ok: marketAnnual > 0, label: t("ready.marketRent", { defaultValue: "Ortsübliche Miete für 66-%-Prüfung hinterlegt" }) },
  ];
  const allReady = checks.every(c => c.ok);

  // All loans / maintenances for tabs
  const propertyLoans = loans
    .filter(l => String(l["property-id"]) === selectedPropertyId)
    .sort((a, b) => Number(b.year) - Number(a.year));
  const sortedMaints = propertyMaints.slice().sort((a, b) => Number(b.year) - Number(a.year));

  // ── Config actions ──────────────────────────────────────────────────────────
  function startEditConfig() {
    setCfgForm({
      landValue: String(taxConfig?.["land-value"] ?? selectedProperty?.["land-value"] ?? ""),
      buildingValue: String(taxConfig?.["building-value"] ?? selectedProperty?.["building-value"] ?? ""),
      afaRate: String(taxConfig?.["afa-rate"] ?? "2"),
      afaStartDate: taxConfig?.["afa-start-date"] ?? selectedProperty?.["acquisition-date"] ?? "",
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

  // ── Loan actions ────────────────────────────────────────────────────────────
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
    if (editingLoanId) { onUpdateLoan?.({ id: editingLoanId, ...data }); setEditingLoanId(null); }
    else { onAddLoan?.(data); setAddingLoan(false); }
    setLoanForm({ lenderName: "", year: String(year), annualInterest: "", notes: "" });
  }
  function cancelLoanEdit() {
    setAddingLoan(false); setEditingLoanId(null);
    setLoanForm({ lenderName: "", year: String(year), annualInterest: "", notes: "" });
  }

  // ── Maintenance actions ─────────────────────────────────────────────────────
  function startAddMaint() {
    setMaintForm({ description: "", year: String(year), amount: "", spreadYears: "1" });
    setAddingMaint(true);
    setEditingMaintId(null);
  }
  function startEditMaint(m: Maintenance) {
    setMaintForm({
      description: m.description ?? "",
      year: String(m.year),
      amount: String(m.amount ?? ""),
      spreadYears: String(m["spread-years"] ?? "1"),
    });
    setEditingMaintId(String(m.id));
    setAddingMaint(false);
  }
  function saveMaint() {
    const data = {
      propertyId: selectedPropertyId,
      description: maintForm.description || null,
      year: parseInt(maintForm.year) || year,
      amount: parseNum(maintForm.amount),
      spreadYears: Math.max(1, Math.min(5, parseInt(maintForm.spreadYears) || 1)),
    };
    if (editingMaintId) { onUpdateMaintenance?.({ id: editingMaintId, ...data }); setEditingMaintId(null); }
    else { onAddMaintenance?.(data); setAddingMaint(false); }
    setMaintForm({ description: "", year: String(year), amount: "", spreadYears: "1" });
  }
  function cancelMaintEdit() {
    setAddingMaint(false); setEditingMaintId(null);
    setMaintForm({ description: "", year: String(year), amount: "", spreadYears: "1" });
  }

  // ── PDF ──────────────────────────────────────────────────────────────────────
  async function handleGeneratePdf() {
    if (!selectedProperty) return;
    setGenerating(true);
    try {
      const pdfData: AnlageVPdfData = {
        year,
        ownerName: selectedProperty["landlord-name"] ?? null,
        taxNumber: null,
        propertyName: selectedProperty.name,
        propertyAddress: [selectedProperty.address, [selectedProperty["postal-code"], selectedProperty.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
        ownershipSharePct: sharePct,
        income: incomeLines,
        totalIncome,
        deductions: deductionLines,
        totalDeductions: totalDeductionsEffective,
        result,
        ownerResult,
        deductibleFactorPct: Math.round(deductibleFactor * 1000) / 10,
        warnings,
      };
      const bytes = await generateAnlageVPdf(pdfData);
      downloadPdf(bytes, `AnlageV_${selectedProperty.name.replace(/\s+/g, "_")}_${year}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  // ── Reusable sub-forms ──────────────────────────────────────────────────────
  const LoanForm = () => (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{t("loans.lenderName")}</Label>
          <Input value={loanForm.lenderName} onChange={e => setLoanForm(f => ({ ...f, lenderName: e.target.value }))} placeholder={t("loans.lenderPlaceholder")} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("loans.yearLabel")}</Label>
          <Input type="number" value={loanForm.year} onChange={e => setLoanForm(f => ({ ...f, year: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("loans.annualInterest")} (€)</Label>
          <Input value={loanForm.annualInterest} onChange={e => setLoanForm(f => ({ ...f, annualInterest: e.target.value }))} placeholder="0,00" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("loans.notes")}</Label>
          <Input value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={saveLoan} disabled={isSaving}><Save className="h-3.5 w-3.5 mr-1.5" />{isSaving ? tCommon("saving") : tCommon("save")}</Button>
        <Button size="sm" variant="ghost" onClick={cancelLoanEdit}><X className="h-3.5 w-3.5 mr-1" />{tCommon("cancel")}</Button>
      </div>
    </div>
  );

  const MaintForm = () => (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">{t("maintenance.description", { defaultValue: "Beschreibung" })}</Label>
          <Input value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} placeholder={t("maintenance.descPlaceholder", { defaultValue: "z. B. Dachsanierung" })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("maintenance.yearLabel", { defaultValue: "Jahr der Zahlung" })}</Label>
          <Input type="number" value={maintForm.year} onChange={e => setMaintForm(f => ({ ...f, year: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("maintenance.amount", { defaultValue: "Betrag" })} (€)</Label>
          <Input value={maintForm.amount} onChange={e => setMaintForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">{t("maintenance.spreadYears", { defaultValue: "Verteilung auf Jahre" })}</Label>
          <Select value={maintForm.spreadYears} onValueChange={v => setMaintForm(f => ({ ...f, spreadYears: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n === 1 ? t("maintenance.spreadNone", { defaultValue: "Sofort (1 Jahr)" }) : t("maintenance.spreadN", { n, defaultValue: `${n} Jahre (§82b EStDV)` })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {parseNum(maintForm.amount) > 0 && parseInt(maintForm.spreadYears) > 1 && (
        <p className="text-xs text-muted-foreground">
          {t("maintenance.perYearHint", {
            amount: fmt(parseNum(maintForm.amount) / (parseInt(maintForm.spreadYears) || 1)),
            defaultValue: `€ ${fmt(parseNum(maintForm.amount) / (parseInt(maintForm.spreadYears) || 1))} pro Jahr abziehbar.`,
          })}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={saveMaint} disabled={isSaving}><Save className="h-3.5 w-3.5 mr-1.5" />{isSaving ? tCommon("saving") : tCommon("save")}</Button>
        <Button size="sm" variant="ghost" onClick={cancelMaintEdit}><X className="h-3.5 w-3.5 mr-1" />{tCommon("cancel")}</Button>
      </div>
    </div>
  );

  const tabs = ["summary", "config", "loans", "maintenance"] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              {selectedProperty && <p className="text-sm text-muted-foreground mt-0.5">{selectedProperty.name}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {properties.length > 1 && (
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder={t("selectProperty")} /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-0.5 border rounded-lg px-1">
                <button type="button" className="p-1 hover:bg-muted rounded transition-colors" onClick={() => setYear(y => y - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold px-2 min-w-[3.5rem] text-center tabular-nums">{year}</span>
                <button type="button" className="p-1 hover:bg-muted rounded transition-colors" onClick={() => setYear(y => y + 1)} disabled={year >= currentYear - 1}>
                  <ChevronRight className="h-4 w-4 disabled:opacity-40" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tab bar */}
      <div className="bg-muted rounded-lg p-1 flex">
        {tabs.map(tab => (
          <button key={tab} type="button"
            className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition-all text-center ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab(tab)}>
            {t(`tabs.${tab}`, { defaultValue: tab })}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
      ) : (
        <>
          {/* ── Summary tab ─────────────────────────────────────────────── */}
          {activeTab === "summary" && (
            <>
              {/* Readiness */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">{t("ready.title", { defaultValue: "Bereitschaft" })}</p>
                    {allReady ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" />{t("ready.ready", { defaultValue: "Vollständig" })}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><XCircle className="h-4 w-4" />{t("ready.incomplete", { defaultValue: "Unvollständig" })}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {checks.map((c, i) => (
                      <span key={i} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-600" : "text-amber-600"}`}>
                        {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                        {c.label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-5">
                  {/* Income */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("summary.income.title")}</p>
                    <div className="space-y-1.5">
                      {incomeLines.map((l, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{l.zeile && <span className="text-[10px] text-muted-foreground/70 mr-1.5">Z.{l.zeile}</span>}{l.label}</span>
                          <span className="tabular-nums">€ {fmt(l.amount)}</span>
                        </div>
                      ))}
                      {totalIncome === 0 && <p className="text-sm text-muted-foreground">{t("summary.income.empty")}</p>}
                      <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                        <span>{t("summary.income.total")}</span>
                        <span className="tabular-nums">€ {fmt(totalIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("summary.deductions.title")}</p>
                    <div className="space-y-1.5">
                      {deductionLines.map((l, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {l.zeile && <span className="text-[10px] text-muted-foreground/70 mr-1.5">Z.{l.zeile}</span>}{l.label}
                            {l.note && <span className="text-xs text-muted-foreground/70 ml-1">({l.note})</span>}
                          </span>
                          <span className="tabular-nums">€ {fmt(l.amount)}</span>
                        </div>
                      ))}
                      {totalDeductionsRaw === 0 && <p className="text-sm text-muted-foreground">{t("summary.deductions.empty")}</p>}
                      {deductibleFactor < 1 && (
                        <div className="flex justify-between text-xs text-amber-600">
                          <span>{t("summary.deductions.limited", { pct: Math.round(deductibleFactor * 1000) / 10, defaultValue: `Abziehbar §21(2): ${Math.round(deductibleFactor * 1000) / 10}%` })}</span>
                          <span className="tabular-nums">× {Math.round(deductibleFactor * 1000) / 10}%</span>
                        </div>
                      )}
                      {totalDeductionsRaw > 0 && (
                        <div className="flex justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                          <span>{t("summary.deductions.total")}</span>
                          <span className="tabular-nums">€ {fmt(totalDeductionsEffective)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Result */}
                  <div className={`rounded-xl border-2 p-3 ${result >= 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{result >= 0 ? t("summary.result.profit") : t("summary.result.loss")}</span>
                      <span className={`tabular-nums font-bold text-lg ${result >= 0 ? "text-amber-700" : "text-green-700"}`}>€ {fmt(result)}</span>
                    </div>
                    {sharePct !== 100 && (
                      <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-current/10">
                        <span className="text-xs text-muted-foreground">{t("summary.result.ownerShare", { pct: sharePct, defaultValue: `Ihr Anteil (${sharePct}%)` })}</span>
                        <span className="tabular-nums font-semibold text-sm">€ {fmt(ownerResult)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t("summary.result.hint")}</p>
                  </div>

                  {/* Warnings */}
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">{w}</p>
                    </div>
                  ))}

                  {!taxConfig && (
                    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">{t("summary.configHint")}</p>
                    </div>
                  )}

                  {/* PDF export */}
                  <div className="flex justify-end pt-1">
                    <Button onClick={handleGeneratePdf} disabled={generating || totalIncome === 0}>
                      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      {t("exportPdf", { defaultValue: "Anlage V als PDF" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── AfA Config tab ───────────────────────────────────────────── */}
          {activeTab === "config" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("config.title")}</CardTitle>
                  {!editingConfig && !isReadOnly && (
                    <Button variant="outline" size="sm" onClick={startEditConfig}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />{taxConfig ? tCommon("edit") : t("config.setup")}
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
                        <span className="font-medium tabular-nums">€ {fmt(parseNum(selectedProperty["purchase-price"]))}</span>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">{t("config.landValue")} (€)</Label>
                        <Input value={cfgForm.landValue} onChange={e => {
                          const lv = e.target.value;
                          const pp = parseNum(selectedProperty?.["purchase-price"]);
                          const lvNum = parseNum(lv);
                          setCfgForm(f => ({ ...f, landValue: lv, buildingValue: pp > 0 && lvNum >= 0 ? String(Math.max(0, pp - lvNum)) : f.buildingValue }));
                        }} placeholder="0" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.buildingValue")} (€)</Label>
                        <Input value={cfgForm.buildingValue} onChange={e => setCfgForm(f => ({ ...f, buildingValue: e.target.value }))} placeholder="0" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">{t("config.buildingValueHint")}</p>
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.afaRate")} (%)</Label>
                        <Input value={cfgForm.afaRate} onChange={e => setCfgForm(f => ({ ...f, afaRate: e.target.value }))} placeholder="2" className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">{t("config.afaRateHint")}</p>
                      </div>
                      <div>
                        <Label className="text-xs">{t("config.afaStartDate")}</Label>
                        <Input type="date" value={cfgForm.afaStartDate} onChange={e => setCfgForm(f => ({ ...f, afaStartDate: e.target.value }))} className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">{t("config.afaStartHint", { defaultValue: "Im ersten Jahr wird die AfA monatsgenau berechnet." })}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveConfig} disabled={isSaving}><Save className="h-3.5 w-3.5 mr-1.5" />{isSaving ? tCommon("saving") : tCommon("save")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingConfig(false)}><X className="h-3.5 w-3.5 mr-1" />{tCommon("cancel")}</Button>
                    </div>
                  </div>
                ) : taxConfig ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("config.landValue")}</p>
                        <p className="text-sm mt-0.5 tabular-nums">€ {fmt(parseNum(taxConfig["land-value"]))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("config.buildingValue")}</p>
                        <p className="text-sm mt-0.5 tabular-nums">€ {fmt(parseNum(taxConfig["building-value"]))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("config.afaRate")}</p>
                        <p className="text-sm mt-0.5">{taxConfig["afa-rate"] ?? 2} %</p>
                      </div>
                      {taxConfig["afa-start-date"] && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("config.afaStartDate")}</p>
                          <p className="text-sm mt-0.5">{taxConfig["afa-start-date"]}</p>
                        </div>
                      )}
                    </div>
                    {buildingValue > 0 && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
                        <span className="text-muted-foreground">AfA {year} ({afaRate}% × € {fmt(buildingValue)}){afaNote ? ` · ${afaNote}` : ""}</span>
                        <span className="font-semibold tabular-nums">€ {fmt(afaAmount)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("config.empty")}</p>
                    {!isReadOnly && <Button size="sm" className="mt-3" onClick={startEditConfig}><Plus className="h-3.5 w-3.5 mr-1.5" />{t("config.setup")}</Button>}
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
                    <Button size="sm" onClick={startAddLoan}><Plus className="h-3.5 w-3.5 mr-1.5" />{t("loans.add")}</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addingLoan && LoanForm()}
                {propertyLoans.length === 0 && !addingLoan ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("loans.empty")}</p>
                    {!isReadOnly && <Button size="sm" variant="outline" className="mt-3" onClick={startAddLoan}><Plus className="h-3.5 w-3.5 mr-1.5" />{t("loans.add")}</Button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {propertyLoans.map(loan => editingLoanId === String(loan.id) ? (
                      <React.Fragment key={String(loan.id)}>{LoanForm()}</React.Fragment>
                    ) : (
                      <div key={String(loan.id)} className="flex items-center justify-between rounded-xl border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{loan["lender-name"] || t("loans.unnamed")}</p>
                          <p className="text-xs text-muted-foreground">{t("loans.yearLabel")}: {loan.year}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="tabular-nums font-medium text-sm">€ {fmt(parseNum(loan["annual-interest"]))}</span>
                          {!isReadOnly && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditLoan(loan)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteLoan?.(String(loan.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Maintenance (Erhaltungsaufwand) tab ──────────────────────── */}
          {activeTab === "maintenance" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("maintenance.title", { defaultValue: "Erhaltungsaufwand" })}</CardTitle>
                  {!isReadOnly && !addingMaint && !editingMaintId && (
                    <Button size="sm" onClick={startAddMaint}><Plus className="h-3.5 w-3.5 mr-1.5" />{t("maintenance.add", { defaultValue: "Hinzufügen" })}</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{t("maintenance.hint", { defaultValue: "Größere Reparaturen/Renovierungen können auf 2–5 Jahre verteilt abgesetzt werden (§82b EStDV)." })}</p>
                {addingMaint && MaintForm()}
                {sortedMaints.length === 0 && !addingMaint ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("maintenance.empty", { defaultValue: "Noch kein Erhaltungsaufwand erfasst." })}</p>
                    {!isReadOnly && <Button size="sm" variant="outline" className="mt-3" onClick={startAddMaint}><Plus className="h-3.5 w-3.5 mr-1.5" />{t("maintenance.add", { defaultValue: "Hinzufügen" })}</Button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedMaints.map(m => editingMaintId === String(m.id) ? (
                      <React.Fragment key={String(m.id)}>{MaintForm()}</React.Fragment>
                    ) : (
                      <div key={String(m.id)} className="flex items-center justify-between rounded-xl border p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.description || t("maintenance.unnamed", { defaultValue: "Erhaltungsaufwand" })}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.year}
                            {parseNum(m["spread-years"]) > 1 ? ` · ${t("maintenance.spreadBadge", { n: Math.round(parseNum(m["spread-years"])), defaultValue: `auf ${Math.round(parseNum(m["spread-years"]))} Jahre` })}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="tabular-nums font-medium text-sm">€ {fmt(parseNum(m.amount))}</span>
                          {!isReadOnly && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditMaint(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteMaintenance?.(String(m.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
