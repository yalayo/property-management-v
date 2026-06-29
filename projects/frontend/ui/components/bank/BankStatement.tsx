import React, { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Landmark, Check, ChevronsUpDown, AlertTriangle, History, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";

// ── PDF.js CDN ────────────────────────────────────────────────────────────────

const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
let pdfjsPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  pdfjsPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(w.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

const GERMAN_MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, März: 3, Mär: 3, Apr: 4, Mai: 5, Juni: 6,
  Juli: 7, Aug: 8, Sep: 9, Okt: 10, Nov: 11, Dez: 12,
};

function cleanStr(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

function parseGermanLongLine(line: string): Transaction | null {
  const match = cleanStr(line).match(
    /^(\d{1,2})\. ([A-ZÄÖÜa-zäöüß]+)\. (\d{4}) (.*?) (-?\d{1,3}(?:\.\d{3})*,\d{2})/
  );
  if (!match) return null;
  const [, dayStr, monthName, yearStr, description, amountStr] = match;
  const month = GERMAN_MONTHS[monthName];
  if (!month) return null;
  const day  = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  return {
    date: `${yearStr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    description: description.trim(),
    amount: parseAmount(amountStr),
    year, month,
  };
}

function parseNumericDateLine(line: string): Transaction | null {
  const clean     = cleanStr(line);
  const dateMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+\d{2}\.\d{2}\.\d{4})?\s+/);
  if (!dateMatch) return null;
  const [fullPart, day, mon, year] = dateMatch;
  const rest = clean.slice(fullPart.length);
  const amtMatch = rest.match(/^(.*)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?: EUR)?$/);
  if (!amtMatch) return null;
  const [, description, amountStr] = amtMatch;
  const m = parseInt(mon, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12) return null;
  return {
    date: `${year}-${mon}-${day}`,
    description: description.trim(),
    amount: parseAmount(amountStr),
    year: y, month: m,
  };
}

function parseLine(line: string): Transaction | null {
  return parseGermanLongLine(line) ?? parseNumericDateLine(line);
}

function mergeItems(parts: string[]): string[] {
  const result: string[] = [];
  let current: string[]  = [];
  let prevWasNumericDate = false;
  for (const raw of parts) {
    const part = cleanStr(raw);
    if (!part) continue;
    const isGermanDate  = /^\d{1,2}\. [A-ZÄÖÜa-zäöüß]+\. \d{4}/.test(part);
    const isNumericDate = /^\d{2}\.\d{2}\.\d{4}(\s|$)/.test(part);
    if (isGermanDate) {
      if (current.length) result.push(current.join(" "));
      current = [part]; prevWasNumericDate = false;
    } else if (isNumericDate && !prevWasNumericDate) {
      if (current.length) result.push(current.join(" "));
      current = [part]; prevWasNumericDate = true;
    } else {
      current.push(part); prevWasNumericDate = false;
    }
  }
  if (current.length) result.push(current.join(" "));
  return result;
}

interface Transaction {
  date: string; description: string; amount: number; year: number; month: number;
}

async function extractTransactions(file: File): Promise<Transaction[]> {
  const pdfjsLib = await loadPdfJs();
  const buffer   = await file.arrayBuffer();
  const pdf      = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item) parts.push((item as any).str);
    }
  }
  return mergeItems(parts).map(parseLine).filter((t): t is Transaction => t !== null);
}

// ── Domain types ──────────────────────────────────────────────────────────────

type TxCategory  = "miete" | "nebenkosten" | "expense" | "skip";
interface RowState {
  category: TxCategory; aptId: string; propertyId: string;
  year: number; month: number; expenseLine: string;
}

type Apartment   = { id: number | string; code: string };
type Property    = { id: number | string; name: string };
type ExpenseType = { key: string; "name-de"?: string; "name-en"?: string };
type Tenant      = {
  id: number | string;
  "first-name"?: string; "last-name"?: string; name?: string;
  "apartment-id"?: any; "start-date"?: string; "end-date"?: string;
};

type Props = {
  apartments?:      Apartment[];
  tenants?:         Tenant[];
  properties?:      Property[];
  expenseTypes?:    ExpenseType[];
  allRentPayments?: any[];
  allCosts?:        any[];
  isSaving?:        boolean;
  onAssignPayment?: (data: {
    type: "miete" | "nebenkosten";
    apartmentId: string; year: number; month: number; value: number;
    date: string; description: string; sourceFile: string; recordedAt: string;
  }) => void;
  onRecordExpense?: (data: {
    type: "expense";
    propertyId: string; year: number; value: number;
    date: string; description: string; expenseLine: string; sourceFile: string; recordedAt: string;
  }) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const NOW_YEAR     = new Date().getFullYear();
const YEARS        = Array.from({ length: 8 }, (_, i) => NOW_YEAR - 5 + i);

function fmtAbs(v: number) {
  return Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tenantDisplayName(t: Tenant): string {
  if (t["first-name"]) return [t["first-name"], t["last-name"]].filter(Boolean).join(" ");
  return t.name ?? "";
}

function resolveAptId(raw: any): number | null {
  if (raw == null) return null;
  if (typeof raw === "object") return Number(raw.id ?? raw["db/id"] ?? NaN);
  return Number(raw);
}

function isCurrentTenant(tn: Tenant): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const start = tn["start-date"] ?? "";
  const end   = tn["end-date"]   ?? "";
  return (!start || start <= today) && (!end || end >= today);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BankStatement({
  apartments      = [],
  tenants         = [],
  properties      = [],
  expenseTypes    = [],
  allRentPayments = [],
  allCosts        = [],
  isSaving,
  onAssignPayment,
  onRecordExpense,
}: Props) {
  const { t }       = useTranslation("bank");
  const { t: tCom } = useTranslation("common");
  const { toast }   = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fileName, setFileName]         = useState("");
  const [parsing, setParsing]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [rowStates, setRowStates]       = useState<Record<number, RowState>>({});
  const [savedRows, setSavedRows]       = useState<Record<number, boolean>>({});
  const [aptPickerOpen, setAptPickerOpen] = useState<Record<number, boolean>>({});
  const [historyOpen, setHistoryOpen]   = useState(false);

  // ── Current tenant per apartment ─────────────────────────────────────────

  const currentTenantForApt = useMemo<Record<string, string>>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const map: Record<string, string> = {};
    for (const tn of tenants) {
      const start = tn["start-date"] ?? ""; const end = tn["end-date"] ?? "";
      if (start && start > today) continue;
      if (end   && end   < today) continue;
      const raw = tn["apartment-id"];
      if (raw == null) continue;
      // Mirror ApartmentView's comparison: String(tn["apartment-id"])
      // But also handle entity-ref objects {id: N} from DataScript refs
      const aptIdStr = typeof raw === "object"
        ? String((raw as any).id ?? (raw as any)["db/id"] ?? "")
        : String(raw);
      if (!aptIdStr || aptIdStr === "null" || aptIdStr === "undefined") continue;
      if (!map[aptIdStr]) map[aptIdStr] = tenantDisplayName(tn);
    }
    return map;
  }, [tenants]);

  // ── Apartment combobox options ─────────────────────────────────────────────

  const aptOptions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return apartments
      .map(apt => {
        const rawId   = (apt as any).id ?? (apt as any)["db/id"];
        const aptId   = String(rawId ?? "");
        const tnName  = currentTenantForApt[aptId] ?? null;
        // Fallback: check occupied flag OR whether any tenant's apartment-id matches
        const occupied = !!(apt as any).occupied
          || tenants.some(tn => {
            const raw = tn["apartment-id"];
            if (raw == null) return false;
            const tid = typeof raw === "object"
              ? String((raw as any).id ?? (raw as any)["db/id"] ?? "")
              : String(raw);
            if (tid !== aptId) return false;
            const s = tn["start-date"] ?? ""; const e = tn["end-date"] ?? "";
            return (!s || s <= today) && (!e || e >= today);
          });
        return { id: aptId, code: apt.code, tenantName: tnName, occupied,
                 label: tnName ? `${apt.code} – ${tnName}` : apt.code };
      })
      .filter(opt => !!opt.id && opt.occupied);
  }, [apartments, tenants, currentTenantForApt]);

  // ── Duplicate detection ───────────────────────────────────────────────────

  const importedFileNames = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const rp of allRentPayments) { const sf = rp["source-file"] ?? rp.sourceFile; if (sf) s.add(sf); }
    for (const c  of allCosts)        { const sf = c["source-file"]  ?? c.sourceFile;  if (sf) s.add(sf); }
    return s;
  }, [allRentPayments, allCosts]);

  const fileAlreadyImported = fileName ? importedFileNames.has(fileName) : false;

  const isDuplicateTx = useCallback((tx: Transaction): boolean => {
    if (!fileName) return false;
    const rentMatch = allRentPayments.some(rp => {
      const sf = rp["source-file"] ?? rp.sourceFile;
      return sf === fileName && rp.date === tx.date
        && Math.abs(Number(rp.value) - Math.abs(tx.amount)) < 0.01;
    });
    if (rentMatch) return true;
    // costs have no date field — match on year + amount
    return allCosts.some(c => {
      const sf = c["source-file"] ?? c.sourceFile;
      return sf === fileName && Number(c.year) === tx.year
        && Math.abs(Number(c.value) - Math.abs(tx.amount)) < 0.01;
    });
  }, [fileName, allRentPayments, allCosts]);

  // ── Import history ─────────────────────────────────────────────────────────

  const historyByFile = useMemo(() => {
    const map: Record<string, { type: string; date?: string; description?: string; value: number }[]> = {};
    for (const rp of allRentPayments) {
      const sf = rp["source-file"] ?? rp.sourceFile;
      if (!sf) continue;
      if (!map[sf]) map[sf] = [];
      map[sf].push({ type: "rent", date: rp.date, description: rp.description, value: Number(rp.value) });
    }
    for (const c of allCosts) {
      const sf = c["source-file"] ?? c.sourceFile;
      if (!sf) continue;
      if (!map[sf]) map[sf] = [];
      map[sf].push({ type: "expense", date: c.date, description: c.name, value: Number(c.value) });
    }
    return map;
  }, [allRentPayments, allCosts]);

  // ── Row state helpers ─────────────────────────────────────────────────────

  const defaultRow = (tx: Transaction): RowState => ({
    category: tx.amount < 0 ? "expense" : "miete",
    aptId: "", propertyId: "", year: tx.year, month: tx.month, expenseLine: "",
  });

  const getRow   = (idx: number) => rowStates[idx] ?? defaultRow(transactions[idx]);
  const patchRow = (idx: number, patch: Partial<RowState>) =>
    setRowStates(prev => ({ ...prev, [idx]: { ...(prev[idx] ?? defaultRow(transactions[idx])), ...patch } }));

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") { setError(t("invalidFile")); return; }
    setError(null); setParsing(true);
    setTransactions([]); setRowStates({}); setSavedRows({}); setAptPickerOpen({});
    setFileName(file.name);
    try {
      const txs = await extractTransactions(file);
      setTransactions(txs);
      if (txs.length === 0) setError(t("noTransactions"));
    } catch {
      setError(t("parseError"));
    } finally {
      setParsing(false);
    }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = (idx: number, tx: Transaction) => {
    const row = getRow(idx);
    if (row.category === "skip") { setSavedRows(p => ({ ...p, [idx]: true })); return; }
    const recordedAt = new Date().toISOString();
    if (row.category === "expense") {
      if (!row.propertyId) return;
      onRecordExpense?.({
        type: "expense", propertyId: row.propertyId, year: row.year,
        value: Math.abs(tx.amount), date: tx.date, description: tx.description,
        expenseLine: row.expenseLine || "sonstige", sourceFile: fileName, recordedAt,
      });
    } else {
      if (!row.aptId) return;
      onAssignPayment?.({
        type: row.category, apartmentId: row.aptId, year: row.year, month: row.month,
        value: tx.amount, date: tx.date, description: tx.description,
        sourceFile: fileName, recordedAt,
      });
    }
    setSavedRows(p => ({ ...p, [idx]: true }));
    toast({ title: tCom("saved") });
  };

  const canSave = (idx: number) => {
    const row = getRow(idx);
    if (row.category === "skip")    return true;
    if (row.category === "expense") return !!row.propertyId;
    return !!row.aptId;
  };

  const reset = () => {
    setTransactions([]); setError(null); setRowStates({}); setSavedRows({});
    setAptPickerOpen({}); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const CATS: { id: TxCategory; label: string }[] = [
    { id: "miete",       label: t("typeMiete",       { defaultValue: "Miete" }) },
    { id: "nebenkosten", label: t("typeNebenkosten",  { defaultValue: "NK" }) },
    { id: "expense",     label: t("typeExpense",      { defaultValue: "Ausgabe" }) },
    { id: "skip",        label: t("typeSkip",         { defaultValue: "—" }) },
  ];

  const hasHistory = Object.keys(historyByFile).length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">{t("title")}</h2>
      </div>

      {/* Upload zone */}
      {transactions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted rounded-lg p-10 cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {parsing ? t("parsing") : t("dropOrClick")}
              </p>
              {!parsing && (
                <Button type="button" variant="outline" size="sm"
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                  {t("browse")}
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              disabled={parsing}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {error && <p className="text-sm text-destructive mt-3 text-center">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{t("found", { count: transactions.length })}</p>
              {fileName && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-xs">{fileName}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>{t("uploadNew")}</Button>
          </div>

          {fileAlreadyImported && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t("alreadyImported", { defaultValue: "Dieses Dokument wurde bereits teilweise importiert. Bereits gespeicherte Buchungen sind deaktiviert." })}</span>
            </div>
          )}

          <div className="space-y-2">
            {transactions.map((tx, idx) => {
              const row        = getRow(idx);
              const saved      = !!savedRows[idx];
              const debit      = tx.amount < 0;
              const isDupe     = isDuplicateTx(tx);
              const pickerOpen = !!aptPickerOpen[idx];
              const selectedApt = aptOptions.find(a => a.id === row.aptId);

              return (
                <Card key={idx} className={cn("overflow-hidden", (saved || isDupe) && "opacity-50")}>
                  <CardContent className="px-4 pt-3 pb-3 space-y-2.5">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs tabular-nums text-muted-foreground">{tx.date}</p>
                        <p className="text-sm mt-0.5 truncate">{tx.description}</p>
                      </div>
                      <p className={cn("text-sm font-semibold tabular-nums shrink-0",
                        debit ? "text-red-600" : "text-green-700")}>
                        {debit ? "−" : "+"}€ {fmtAbs(tx.amount)}
                      </p>
                    </div>

                    {isDupe ? (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {t("alreadySaved", { defaultValue: "Bereits importiert" })}
                      </p>
                    ) : saved ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <Check className="h-3.5 w-3.5" />
                        {row.category === "skip"
                          ? t("typeSkip", { defaultValue: "Übersprungen" })
                          : tCom("saved")}
                      </div>
                    ) : (
                      <div className="space-y-2">

                        {/* Category pills */}
                        <div className="flex flex-wrap gap-1">
                          {CATS.map(cat => (
                            <button key={cat.id} type="button"
                              onClick={() => patchRow(idx, { category: cat.id })}
                              className={cn(
                                "px-2.5 py-0.5 text-xs rounded-full border transition-colors",
                                row.category === cat.id
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground border-input hover:border-primary hover:text-foreground"
                              )}>
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {row.category !== "skip" && (
                          <div className="flex flex-wrap items-center gap-2">

                            {/* Apartment combobox */}
                            {(row.category === "miete" || row.category === "nebenkosten") && (
                              <Popover open={pickerOpen}
                                onOpenChange={v => setAptPickerOpen(p => ({ ...p, [idx]: v }))}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={pickerOpen}
                                    className="h-7 text-xs w-52 justify-between font-normal px-2">
                                    <span className={cn("truncate", !selectedApt && "text-muted-foreground")}>
                                      {selectedApt ? selectedApt.label : t("selectApt")}
                                    </span>
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder={t("searchApt", { defaultValue: "Wohnung suchen…" })}
                                      className="h-8 text-xs" />
                                    <CommandList>
                                      <CommandEmpty className="text-xs py-2 text-center text-muted-foreground">
                                        {t("noAptFound", { defaultValue: "Keine Wohnung gefunden." })}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {aptOptions.map(opt => (
                                          <CommandItem key={opt.id} value={opt.label}
                                            onSelect={() => {
                                              patchRow(idx, { aptId: opt.id });
                                              setAptPickerOpen(p => ({ ...p, [idx]: false }));
                                            }}
                                            className="text-xs">
                                            <Check className={cn("mr-2 h-3 w-3 shrink-0",
                                              row.aptId === opt.id ? "opacity-100" : "opacity-0")} />
                                            <span className="truncate">
                                              <span className="font-medium">{opt.code}</span>
                                              {opt.tenantName && (
                                                <span className="text-muted-foreground"> – {opt.tenantName}</span>
                                              )}
                                            </span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}

                            {/* Property selector (expense) */}
                            {row.category === "expense" && (
                              <Select value={row.propertyId}
                                onValueChange={v => patchRow(idx, { propertyId: v })}>
                                <SelectTrigger className="h-7 text-xs w-44">
                                  <SelectValue placeholder={t("selectProperty", { defaultValue: "Immobilie" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {properties.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Month (miete only) */}
                            {row.category === "miete" && (
                              <Select value={String(row.month)}
                                onValueChange={v => patchRow(idx, { month: parseInt(v, 10) })}>
                                <SelectTrigger className="h-7 text-xs w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MONTH_LABELS.map((m, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Year */}
                            <Select value={String(row.year)}
                              onValueChange={v => patchRow(idx, { year: parseInt(v, 10) })}>
                              <SelectTrigger className="h-7 text-xs w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YEARS.map(y => (
                                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Expense type */}
                            {row.category === "expense" && expenseTypes.length > 0 && (
                              <Select value={row.expenseLine}
                                onValueChange={v => patchRow(idx, { expenseLine: v })}>
                                <SelectTrigger className="h-7 text-xs w-36">
                                  <SelectValue placeholder={t("expenseType", { defaultValue: "Kostenart" })} />
                                </SelectTrigger>
                                <SelectContent>
                                  {expenseTypes.map(et => (
                                    <SelectItem key={et.key} value={et.key}>
                                      {et["name-de"] ?? et["name-en"] ?? et.key}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            <Button size="sm" className="h-7 px-3 text-xs ml-auto"
                              disabled={!canSave(idx) || isSaving}
                              onClick={() => handleSave(idx, tx)}>
                              {tCom("save")}
                            </Button>
                          </div>
                        )}

                        {row.category === "skip" && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost" className="h-7 px-3 text-xs"
                              onClick={() => setSavedRows(p => ({ ...p, [idx]: true }))}>
                              {t("typeSkip", { defaultValue: "Überspringen" })}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Import history */}
      {hasHistory && (
        <div className="border rounded-lg overflow-hidden">
          <button type="button" onClick={() => setHistoryOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              {t("importHistory", { defaultValue: "Importverlauf" })}
              <span className="text-xs text-muted-foreground font-normal">
                ({Object.keys(historyByFile).length}{" "}
                {t("files", { defaultValue: "Dateien" })})
              </span>
            </span>
            {historyOpen
              ? <ChevronUp   className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {historyOpen && (
            <div className="divide-y">
              {Object.entries(historyByFile).map(([file, entries]) => (
                <div key={file} className="px-4 py-3 space-y-1">
                  <p className="text-xs font-mono text-foreground truncate">{file}</p>
                  <p className="text-xs text-muted-foreground">
                    {entries.length}{" "}{t("entries", { defaultValue: "Buchungen" })}
                    {" · "}
                    {entries.filter(e => e.type === "rent").length}{" "}{t("typeMiete", { defaultValue: "Miete" })}
                    {", "}
                    {entries.filter(e => e.type === "expense").length}{" "}{t("typeExpense", { defaultValue: "Ausgaben" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
