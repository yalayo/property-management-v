import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Landmark, Check } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

// ── PDF.js loaded lazily from CDN ─────────────────────────────────────────────

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

// Deutsche Apothekerbank / Sparkasse: "12. Dez. 2023 NAME description 1.015,00"
function parseGermanLongLine(line: string): Transaction | null {
  const match = cleanStr(line).match(
    /^(\d{1,2})\. ([A-ZÄÖÜa-zäöüß]+)\. (\d{4}) (.*?) (-?\d{1,3}(?:\.\d{3})*,\d{2})/
  );
  if (!match) return null;
  const [, dayStr, monthName, yearStr, description, amountStr] = match;
  const month = GERMAN_MONTHS[monthName];
  if (!month) return null;
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  return {
    date: `${yearStr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    description: description.trim(),
    amount: parseAmount(amountStr),
    year,
    month,
  };
}

// HVB / numeric-date format: "24.06.2024 [24.06.2024] description -?1.990,00[ EUR]"
function parseNumericDateLine(line: string): Transaction | null {
  const clean = cleanStr(line);
  const dateMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+\d{2}\.\d{2}\.\d{4})?\s+/);
  if (!dateMatch) return null;
  const [fullPart, day, mon, year] = dateMatch;
  const rest = clean.slice(fullPart.length);
  // Greedy: capture up to last amount (optionally followed by " EUR")
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
    year: y,
    month: m,
  };
}

function parseLine(line: string): Transaction | null {
  return parseGermanLongLine(line) ?? parseNumericDateLine(line);
}

// Merge PDF text items into transaction lines.
// For numeric-date PDFs the Buchung + Valuta dates are two consecutive items —
// we must NOT start a new transaction on the Valuta date (second consecutive date).
function mergeItems(parts: string[]): string[] {
  const result: string[] = [];
  let current: string[] = [];
  let prevWasNumericDate = false;

  for (const raw of parts) {
    const part = cleanStr(raw);
    if (!part) continue;

    const isGermanDate = /^\d{1,2}\. [A-ZÄÖÜa-zäöüß]+\. \d{4}/.test(part);
    // Match a standalone numeric date item (exactly dd.mm.yyyy, possibly with trailing space)
    const isNumericDate = /^\d{2}\.\d{2}\.\d{4}(\s|$)/.test(part);

    if (isGermanDate) {
      if (current.length) result.push(current.join(" "));
      current = [part];
      prevWasNumericDate = false;
    } else if (isNumericDate && !prevWasNumericDate) {
      if (current.length) result.push(current.join(" "));
      current = [part];
      prevWasNumericDate = true;
    } else {
      current.push(part);
      prevWasNumericDate = false;
    }
  }
  if (current.length) result.push(current.join(" "));
  return result;
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  year: number;
  month: number;
}

async function extractTransactions(file: File): Promise<Transaction[]> {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item) parts.push((item as any).str);
    }
  }
  return mergeItems(parts)
    .map(parseLine)
    .filter((t): t is Transaction => t !== null);
}

// ── Domain types ──────────────────────────────────────────────────────────────

type TxCategory = "miete" | "nebenkosten" | "expense" | "skip";

interface RowState {
  category: TxCategory;
  aptId: string;
  propertyId: string;
  year: number;
  month: number;
  expenseLine: string;
}

type Apartment   = { id: number | string; code: string };
type Property    = { id: number | string; name: string };
type ExpenseType = { key: string; "name-de"?: string; "name-en"?: string };

type Props = {
  apartments?: Apartment[];
  properties?: Property[];
  expenseTypes?: ExpenseType[];
  isSaving?: boolean;
  onAssignPayment?: (data: {
    type: "miete" | "nebenkosten";
    apartmentId: string;
    year: number;
    month: number;
    value: number;
    date: string;
    description: string;
    sourceFile: string;
    recordedAt: string;
  }) => void;
  onRecordExpense?: (data: {
    type: "expense";
    propertyId: string;
    year: number;
    value: number;
    date: string;
    description: string;
    expenseLine: string;
    sourceFile: string;
    recordedAt: string;
  }) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => NOW_YEAR - 5 + i);

function fmtAbs(v: number) {
  return Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BankStatement({
  apartments = [],
  properties = [],
  expenseTypes = [],
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

  const defaultRow = (tx: Transaction): RowState => ({
    category:    tx.amount < 0 ? "expense" : "miete",
    aptId:       "",
    propertyId:  "",
    year:        tx.year,
    month:       tx.month,
    expenseLine: "",
  });

  const getRow = (idx: number): RowState =>
    rowStates[idx] ?? defaultRow(transactions[idx]);

  const patchRow = (idx: number, patch: Partial<RowState>) =>
    setRowStates(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? defaultRow(transactions[idx])), ...patch },
    }));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") { setError(t("invalidFile")); return; }
    setError(null);
    setParsing(true);
    setTransactions([]);
    setRowStates({});
    setSavedRows({});
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

  const handleSave = (idx: number, tx: Transaction) => {
    const row = getRow(idx);
    if (row.category === "skip") {
      setSavedRows(prev => ({ ...prev, [idx]: true }));
      return;
    }
    const recordedAt = new Date().toISOString();
    if (row.category === "expense") {
      if (!row.propertyId) return;
      onRecordExpense?.({
        type: "expense",
        propertyId: row.propertyId,
        year: row.year,
        value: Math.abs(tx.amount),
        date: tx.date,
        description: tx.description,
        expenseLine: row.expenseLine || "sonstige",
        sourceFile: fileName,
        recordedAt,
      });
    } else {
      if (!row.aptId) return;
      onAssignPayment?.({
        type: row.category,
        apartmentId: row.aptId,
        year: row.year,
        month: row.month,
        value: tx.amount,
        date: tx.date,
        description: tx.description,
        sourceFile: fileName,
        recordedAt,
      });
    }
    setSavedRows(prev => ({ ...prev, [idx]: true }));
    toast({ title: tCom("saved") });
  };

  const canSave = (idx: number): boolean => {
    const row = getRow(idx);
    if (row.category === "skip")    return true;
    if (row.category === "expense") return !!row.propertyId;
    return !!row.aptId;
  };

  const reset = () => {
    setTransactions([]); setError(null);
    setRowStates({}); setSavedRows({}); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const CATS: { id: TxCategory; label: string }[] = [
    { id: "miete",       label: t("typeMiete",       { defaultValue: "Miete" }) },
    { id: "nebenkosten", label: t("typeNebenkosten",  { defaultValue: "NK" }) },
    { id: "expense",     label: t("typeExpense",      { defaultValue: "Ausgabe" }) },
    { id: "skip",        label: t("typeSkip",         { defaultValue: "—" }) },
  ];

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
              <p className="text-sm text-muted-foreground">
                {t("found", { count: transactions.length })}
              </p>
              {fileName && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-xs">{fileName}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>{t("uploadNew")}</Button>
          </div>

          <div className="space-y-2">
            {transactions.map((tx, idx) => {
              const row   = getRow(idx);
              const saved = !!savedRows[idx];
              const debit = tx.amount < 0;

              return (
                <Card key={idx} className={cn("overflow-hidden transition-opacity", saved && "opacity-50")}>
                  <CardContent className="px-4 pt-3 pb-3 space-y-2.5">

                    {/* Header row: date + amount */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs tabular-nums text-muted-foreground">{tx.date}</p>
                        <p className="text-sm mt-0.5 truncate">{tx.description}</p>
                      </div>
                      <p className={cn(
                        "text-sm font-semibold tabular-nums shrink-0",
                        debit ? "text-red-600" : "text-green-700"
                      )}>
                        {debit ? "−" : "+"}€ {fmtAbs(tx.amount)}
                      </p>
                    </div>

                    {/* Controls */}
                    {saved ? (
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

                            {/* Apartment selector (miete / nebenkosten) */}
                            {(row.category === "miete" || row.category === "nebenkosten") && (
                              <Select value={row.aptId} onValueChange={v => patchRow(idx, { aptId: v })}>
                                <SelectTrigger className="h-7 text-xs w-40">
                                  <SelectValue placeholder={t("selectApt")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {apartments.map(apt => (
                                    <SelectItem key={apt.id} value={String(apt.id)}>{apt.code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Property selector (expense) */}
                            {row.category === "expense" && (
                              <Select value={row.propertyId} onValueChange={v => patchRow(idx, { propertyId: v })}>
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
                              <Select value={String(row.month)} onValueChange={v => patchRow(idx, { month: parseInt(v, 10) })}>
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
                            <Select value={String(row.year)} onValueChange={v => patchRow(idx, { year: parseInt(v, 10) })}>
                              <SelectTrigger className="h-7 text-xs w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YEARS.map(y => (
                                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Expense type (expense, optional) */}
                            {row.category === "expense" && expenseTypes.length > 0 && (
                              <Select value={row.expenseLine} onValueChange={v => patchRow(idx, { expenseLine: v })}>
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

                            {/* Save */}
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
                              onClick={() => setSavedRows(prev => ({ ...prev, [idx]: true }))}>
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
    </div>
  );
}
