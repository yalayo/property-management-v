import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Landmark, Check } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// ── pdfjs loaded lazily from CDN so shadow-cljs never inspects the package ──

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

// ── German bank statement parsing ────────────────────────────────────────────

const GERMAN_MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, März: 3, Apr: 4, Mai: 5, Juni: 6,
  Juli: 7, Aug: 8, Sep: 9, Okt: 10, Nov: 11, Dez: 12,
};

function cleanStr(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

function startsWithDate(line: string): boolean {
  return /^\d{1,2}\. \S+\. \d{4} /.test(cleanStr(line));
}

function mergeMultiLine(lines: string[]): string[] {
  const result: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (startsWithDate(line)) {
      if (current.length > 0) result.push(current.join(" "));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) result.push(current.join(" "));
  return result;
}

interface Transaction {
  date: string;
  description: string;
  amount: number;
  year: number;
  month: number;
}

function parseLine(line: string): Transaction | null {
  const match = cleanStr(line).match(
    /^(\d{1,2})\. ([A-ZÄÖÜa-zäöüß]+)\. (\d{4}) (.*?) (\d{1,3}(?:\.\d{3})*,\d{2})/
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
  return mergeMultiLine(parts.map(cleanStr).filter(Boolean))
    .map(parseLine)
    .filter((t): t is Transaction => t !== null);
}

// ── Component ─────────────────────────────────────────────────────────────────

type Apartment = { id: number | string; code: string };

type Props = {
  apartments?: Apartment[];
  isSaving?: boolean;
  onAssignPayment?: (data: {
    apartmentId: string;
    year: number;
    month: number;
    value: number;
    date: string;
    description: string;
  }) => void;
};

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankStatement({ apartments = [], isSaving, onAssignPayment }: Props) {
  const { t } = useTranslation("bank");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<number, string>>({});
  const [savedRows, setSavedRows] = useState<Record<number, boolean>>({});

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError(t("invalidFile"));
      return;
    }
    setError(null);
    setParsing(true);
    setTransactions([]);
    setAssigned({});
    setSavedRows({});
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

  const handleAssign = (idx: number, tx: Transaction) => {
    const aptId = assigned[idx];
    if (!aptId) return;
    onAssignPayment?.({
      apartmentId: aptId,
      year: tx.year,
      month: tx.month,
      value: tx.amount,
      date: tx.date,
      description: tx.description,
    });
    setSavedRows(prev => ({ ...prev, [idx]: true }));
    toast({ title: tCommon("saved") });
  };

  const reset = () => {
    setTransactions([]);
    setError(null);
    setAssigned({});
    setSavedRows({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">{t("title")}</h2>
      </div>

      {transactions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted rounded-lg p-10 cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {parsing ? t("parsing") : t("dropOrClick")}
              </p>
              {!parsing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  {t("browse")}
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={parsing}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {error && <p className="text-sm text-destructive mt-3 text-center">{error}</p>}
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("found", { count: transactions.length })}
            </p>
            <Button variant="outline" size="sm" onClick={reset}>
              {t("uploadNew")}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{t("date")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("description")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t("amount")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("apartment")}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                        {tx.date}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate text-muted-foreground">
                        {tx.description}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                        €{formatEur(tx.amount)}
                      </td>
                      <td className="px-4 py-2.5 w-44">
                        {savedRows[idx] ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            {t("assigned")}
                          </span>
                        ) : (
                          <Select
                            value={assigned[idx] ?? ""}
                            onValueChange={val => setAssigned(prev => ({ ...prev, [idx]: val }))}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder={t("selectApt")} />
                            </SelectTrigger>
                            <SelectContent>
                              {apartments.map(apt => (
                                <SelectItem key={apt.id} value={String(apt.id)}>
                                  {apt.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {!savedRows[idx] && (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs"
                            disabled={!assigned[idx] || isSaving}
                            onClick={() => handleAssign(idx, tx)}
                          >
                            {t("assign")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
