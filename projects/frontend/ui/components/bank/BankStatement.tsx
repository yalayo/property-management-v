import React, { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Landmark, Check, ChevronsUpDown, AlertTriangle, History, ChevronDown, ChevronUp, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
  Jan: 1, Feb: 2, "Mär": 3, "März": 3, Apr: 4, Mai: 5,
  Jun: 6, Juni: 6, Jul: 7, Juli: 7, Aug: 8, Sep: 9, Okt: 10, Nov: 11, Dez: 12,
};

// Known banks: [detection pattern, canonical display name]
const BANK_PATTERNS: [RegExp, string][] = [
  [/deutsche\s+apotheker|ärztebank/i,  "Deutsche Apotheker- und Ärztebank"],
  [/HypoVereinsbank/i,                       "HypoVereinsbank"],
  [/UniCredit/i,                             "HypoVereinsbank"],
  [/Commerzbank/i,                           "Commerzbank"],
  [/Deutsche\s+Bank/i,                       "Deutsche Bank"],
  [/\bDKB\b/,                                "DKB"],
  [/\bING\b/,                                "ING"],
  [/Comdirect/i,                             "Comdirect"],
  [/Postbank/i,                              "Postbank"],
  [/Sparkasse/i,                             "Sparkasse"],
  [/Volksbank/i,                             "Volksbank"],
  [/Raiffeisen/i,                            "Raiffeisen"],
  [/\bN26\b/,                                "N26"],
];

function cleanStr(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

const DESCRIPTION_LABELS = /\b(Verwendungszweck|Auftraggeber|Empfänger|Beguenstigter|Glaeubiger-?ID|Mandatsreferenz|Kundenreferenz|End-to-End-Ref)\b\.?\s*:?\s*/gi;

function cleanDescription(desc: string): string {
  return desc.replace(DESCRIPTION_LABELS, " ").replace(/\s+/g, " ").trim();
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

// DAB style: "12. Dez. 2023 SALVATORE RASPANTI ... 1.015,00"
function parseGermanLongLine(line: string): Transaction | null {
  const match = cleanStr(line).match(
    /^(\d{1,2})\.\s+([A-ZÄÖÜ][a-zäöüß]+)\.?\s+(\d{4})\s+(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
  );
  if (!match) return null;
  const [, dayStr, monthName, yearStr, description, amountStr] = match;
  const month = GERMAN_MONTHS[monthName];
  if (!month) return null;
  const day  = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  return {
    date: `${yearStr}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    description: cleanDescription(description),
    amount: parseAmount(amountStr),
    year, month,
  };
}

// HVB style: "24.06.2024 24.06.2024 SEPA-GUTSCHRIFT ... 1.990,00 EUR"
// DAB numeric style would also hit this.
function parseNumericDateLine(line: string): Transaction | null {
  const clean     = cleanStr(line);
  // Optional second date (valuta date in HVB format)
  const dateMatch = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+\d{2}\.\d{2}\.\d{4})?\s+/);
  if (!dateMatch) return null;
  const [fullPart, day, mon, year] = dateMatch;
  const rest = clean.slice(fullPart.length);
  // Amount at end, optionally followed by " EUR"
  const amtMatch = rest.match(/^(.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+EUR)?\s*$/);
  if (!amtMatch) return null;
  const [, description, amountStr] = amtMatch;
  const m = parseInt(mon, 10);
  const y = parseInt(year, 10);
  if (m < 1 || m > 12) return null;
  return {
    date: `${year}-${mon}-${day}`,
    description: cleanDescription(description),
    amount: parseAmount(amountStr),
    year: y, month: m,
  };
}

function parseLine(line: string): Transaction | null {
  return parseGermanLongLine(line) ?? parseNumericDateLine(line);
}

// Merge PDF text items into one string per transaction.
// HVB has two consecutive dates per row (Buchung + Valuta date).
// When we're still in an all-date prefix, additional dates are appended
// (treated as valuta) instead of starting a new block.
function mergeItems(parts: string[]): string[] {
  const result: string[]  = [];
  let current: string[]   = [];
  let blockOnlyDates      = false;

  for (const raw of parts) {
    const part = cleanStr(raw);
    if (!part) continue;
    const isGermanDate  = /^\d{1,2}\.\s+[A-ZÄÖÜ]/.test(part);
    const isNumericDate = /^\d{2}\.\d{2}\.\d{4}(\s|$)/.test(part);

    if (isGermanDate) {
      if (current.length) result.push(current.join(" "));
      current = [part]; blockOnlyDates = true;
    } else if (isNumericDate) {
      if (blockOnlyDates) {
        // Second date in block (HVB valuta) — keep in same row
        current.push(part);
      } else {
        if (current.length) result.push(current.join(" "));
        current = [part]; blockOnlyDates = true;
      }
    } else {
      current.push(part); blockOnlyDates = false;
    }
  }
  if (current.length) result.push(current.join(" "));
  return result;
}

// ── PDF meta (IBAN, bank name, owner) ────────────────────────────────────────

interface PdfMeta { iban: string; bankName: string; owner?: string; }

// BLZ (chars 4-11 of a German IBAN) → canonical bank name
const BLZ_TO_BANK: Record<string, string> = {
  "30060601": "Deutsche Apotheker- und Ärztebank",
  "30060610": "Deutsche Apotheker- und Ärztebank",
  "36020186": "HypoVereinsbank",
  "10020200": "HypoVereinsbank",
  "10070024": "Deutsche Bank",
  "20070024": "Deutsche Bank",
  "37070024": "Deutsche Bank",
  "10040000": "Commerzbank",
  "20040050": "Commerzbank",
  "30040000": "Commerzbank",
  "20010010": "Postbank",
  "10010010": "Postbank",
  "44010046": "Postbank",
  "12030000": "DKB",
  "50010517": "ING",
  "20041111": "Comdirect",
  "10011001": "N26",
};

function detectBankFromIban(iban: string): string {
  if (iban.startsWith("DE") && iban.length === 22) {
    const blz = iban.slice(4, 12);
    return BLZ_TO_BANK[blz] ?? "";
  }
  return "";
}

function detectBankName(iban: string, text: string): string {
  const fromIban = detectBankFromIban(iban);
  if (fromIban) return fromIban;
  for (const [rx, name] of BANK_PATTERNS) {
    if (rx.test(text)) return name;
  }
  return "";
}

function detectOwner(text: string): string | undefined {
  // Pattern 1: explicit "Kontoinhaber:" label (HVB and others)
  const labelled = text.match(/Kontoinhaber\s*:?\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß ,.\-&]{3,80})/);
  if (labelled) return labelled[1].trim().slice(0, 100);

  // Pattern 2: <Name> <AccountType> with overlapping search so a rejected match at an
  // earlier position (e.g. "Kontoauszug …Privatkonto") doesn't consume the real match.
  const rx = /([A-ZÄÖÜ][A-Za-zäöüÄÖÜß ,.\-&]{3,100}?)\s{1,3}(Privatkonto|Girokonto|Geschäftskonto|Sparkonto|AktivKonto)\s/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const candidate = m[1].trim();
    const words = candidate.split(/\s+/);
    if (
      !/^(Konto|Kunden|Datum|Name|Text|Buchung|Seite|Erstellt|Saldo|IBAN)/i.test(candidate) &&
      words.length >= 2 &&
      words.length <= 10
    ) {
      return candidate.slice(0, 100);
    }
    rx.lastIndex = m.index + 1;
  }
  return undefined;
}

function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

// IBAN lengths by country code (chars after stripping spaces)
const IBAN_LENGTHS: Record<string, number> = {
  DE: 22, AT: 20, CH: 21, NL: 18, FR: 27, GB: 22, ES: 24, IT: 27, BE: 16,
};

function trimIban(raw: string): string {
  const len = IBAN_LENGTHS[raw.slice(0, 2)];
  return len ? raw.slice(0, len) : raw;
}

// Groups of 1-4 chars handle trailing short groups (e.g. DE20...4970 94 where "94" is only 2 digits)
function extractIban(text: string): string | null {
  const labelled = text.match(/\bIBAN:?\s+([A-Z]{2}\d{2}(?:\s*[A-Z0-9]{1,4}){3,9})/);
  if (labelled) {
    const iban = trimIban(labelled[1].replace(/\s/g, ""));
    if (iban.length >= 15) return iban;
  }
  const any = text.match(/\b([A-Z]{2}\d{2}(?:\s*[A-Z0-9]{1,4}){3,9})\b/);
  if (any) {
    const iban = trimIban(any[1].replace(/\s/g, ""));
    if (iban.length >= 15) return iban;
  }
  return null;
}

function extractMetaFromParts(parts: string[]): PdfMeta | null {
  const fullText = parts.map(cleanStr).join(" ");
  const iban = extractIban(fullText);
  if (!iban) return null;
  return {
    iban,
    bankName: detectBankName(iban, fullText),
    owner:    detectOwner(fullText),
  };
}

async function extractPdf(file: File): Promise<{ transactions: Transaction[]; meta: PdfMeta | null }> {
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
  const transactions = mergeItems(parts).map(parseLine).filter((t): t is Transaction => t !== null);
  const meta = extractMetaFromParts(parts);
  return { transactions, meta };
}

// ── Domain types ──────────────────────────────────────────────────────────────

interface Transaction {
  date: string; description: string; amount: number; year: number; month: number;
}

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
type BankAccount = {
  id?: number | string;
  "db/id"?: number | string;
  iban?: string;
  "bank-account/iban"?: string;
  "bank-account/bank-name"?: string;
  "bank-account/owner"?: string;
};

type Props = {
  apartments?:      Apartment[];
  tenants?:         Tenant[];
  properties?:      Property[];
  expenseTypes?:    ExpenseType[];
  allRentPayments?: any[];
  allCosts?:        any[];
  bankAccounts?:    BankAccount[];
  isSaving?:        boolean;
  onAssignPayment?: (data: {
    type: "miete" | "nebenkosten";
    apartmentId: string; year: number; month: number; value: number;
    date: string; description: string; sourceFile: string; recordedAt: string;
    bankAccountId?: string;
  }) => void;
  onRecordExpense?: (data: {
    type: "expense";
    propertyId: string; year: number; value: number;
    date: string; description: string; expenseLine: string; sourceFile: string; recordedAt: string;
    bankAccountId?: string;
  }) => void;
  onSaveBankAccount?: (data: {
    iban: string; owner: string; bankName: string; description: string;
  }) => void;
  onUpdateBankAccount?: (data: {
    id: string | number; iban: string; owner: string; bankName: string;
  }) => void;
  onDeleteBankAccount?: (id: string | number) => void;
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

function baIban(ba: BankAccount): string {
  return ((ba["bank-account/iban"] ?? ba.iban) ?? "").replace(/\s/g, "");
}

function baId(ba: BankAccount): string {
  return String(ba.id ?? ba["db/id"] ?? "");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BankStatement({
  apartments      = [],
  tenants         = [],
  properties      = [],
  expenseTypes    = [],
  allRentPayments = [],
  allCosts        = [],
  bankAccounts    = [],
  isSaving,
  onAssignPayment,
  onRecordExpense,
  onSaveBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
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

  // Detected bank account from PDF
  const [detectedMeta, setDetectedMeta]     = useState<PdfMeta | null>(null);
  const [newAccOwner, setNewAccOwner]       = useState("");
  const [newAccBankName, setNewAccBankName] = useState("");
  const [newAccDesc, setNewAccDesc]         = useState("");
  const [accBannerOpen, setAccBannerOpen]   = useState(false);
  const [accSaved, setAccSaved]             = useState(false);

  // Bank account inline edit / delete / create state
  const [editingBaId, setEditingBaId]   = useState<string | null>(null);
  const [editOwner, setEditOwner]       = useState("");
  const [editBankName, setEditBankName] = useState("");
  const [deletingBaId, setDeletingBaId] = useState<string | null>(null);
  const [showCreateBa, setShowCreateBa] = useState(false);
  const [createIban, setCreateIban]     = useState("");
  const [createOwner, setCreateOwner]   = useState("");
  const [createBank, setCreateBank]     = useState("");

  // ── Matched bank account ──────────────────────────────────────────────────

  const matchedBankAccount = useMemo<BankAccount | null>(() => {
    if (!detectedMeta) return null;
    const norm = detectedMeta.iban.replace(/\s/g, "");
    return bankAccounts.find(ba => baIban(ba) === norm) ?? null;
  }, [detectedMeta, bankAccounts]);

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

  // ── Transactions per bank account ─────────────────────────────────────────

  type BaTx = { date: string; description: string; amount: number; type: "rent" | "expense" };

  const txsByBankAccount = useMemo<Record<string, BaTx[]>>(() => {
    const map: Record<string, BaTx[]> = {};
    for (const ba of bankAccounts) {
      const id = baId(ba);
      if (id) map[id] = [];
    }
    const baRef = (item: any): string =>
      String(item["bank-account-id"] ?? item["bank-account/id"] ?? item.bankAccountId ?? "");
    for (const rp of allRentPayments) {
      const ref = baRef(rp);
      if (ref && map[ref] !== undefined)
        map[ref].push({ date: rp.date ?? "", description: rp.description ?? "", amount: Math.abs(Number(rp.value)), type: "rent" });
    }
    for (const c of allCosts) {
      const ref = baRef(c);
      if (ref && map[ref] !== undefined)
        map[ref].push({ date: c.date ?? String(c.year ?? ""), description: c.name ?? c.description ?? "", amount: Math.abs(Number(c.value)), type: "expense" });
    }
    for (const id in map)
      map[id] = map[id].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    return map;
  }, [bankAccounts, allRentPayments, allCosts]);

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
    setDetectedMeta(null); setAccSaved(false); setAccBannerOpen(false);
    setFileName(file.name);
    try {
      const { transactions: txs, meta } = await extractPdf(file);
      setTransactions(txs);
      if (meta) {
        setDetectedMeta(meta);
        setNewAccBankName(meta.bankName);
        setNewAccOwner(meta.owner ?? "");
        setAccBannerOpen(true);
      }
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

  // ── Bank account save ─────────────────────────────────────────────────────

  const handleSaveBankAccount = () => {
    if (!detectedMeta) return;
    onSaveBankAccount?.({
      iban:        detectedMeta.iban,
      owner:       newAccOwner,
      bankName:    newAccBankName,
      description: newAccDesc,
    });
    setAccSaved(true);
    setAccBannerOpen(false);
    toast({ title: t("bankAccountSaved", { defaultValue: "Bankkonto gespeichert" }) });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const bankAccountId = matchedBankAccount ? baId(matchedBankAccount) : undefined;

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
        ...(bankAccountId ? { bankAccountId } : {}),
      });
    } else {
      if (!row.aptId) return;
      onAssignPayment?.({
        type: row.category, apartmentId: row.aptId, year: row.year, month: row.month,
        value: tx.amount, date: tx.date, description: tx.description,
        sourceFile: fileName, recordedAt,
        ...(bankAccountId ? { bankAccountId } : {}),
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
    setDetectedMeta(null); setAccSaved(false); setAccBannerOpen(false);
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

          {/* Detected bank account banner */}
          {detectedMeta && accBannerOpen && (
            <Card className={cn("border", matchedBankAccount ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50")}>
              <CardContent className="pt-4 pb-4">
                {matchedBankAccount ? (
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <Check className="h-4 w-4 shrink-0 text-green-600" />
                    <span>
                      {t("bankAccountDetected", { defaultValue: "Erkanntes Konto" })}{": "}
                      <span className="font-mono font-medium">{formatIban(detectedMeta.iban)}</span>
                      {matchedBankAccount["bank-account/bank-name"] && (
                        <> — {matchedBankAccount["bank-account/bank-name"]}</>
                      )}
                    </span>
                    <button onClick={() => setAccBannerOpen(false)} className="ml-auto text-xs text-green-700 hover:underline">✕</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-blue-900 font-medium">
                        <PlusCircle className="h-4 w-4 shrink-0" />
                        {t("newBankAccountDetected", { defaultValue: "Neues Bankkonto erkannt" })}{": "}
                        <span className="font-mono">{formatIban(detectedMeta.iban)}</span>
                      </div>
                      <button onClick={() => setAccBannerOpen(false)} className="text-xs text-blue-700 hover:underline">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-800">{t("bankAccountOwner", { defaultValue: "Kontoinhaber" })}</Label>
                        <Input value={newAccOwner} onChange={e => setNewAccOwner(e.target.value)}
                          className="h-7 text-xs" placeholder={t("bankAccountOwnerPlaceholder", { defaultValue: "z.B. Max Mustermann" })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-800">{t("bankName", { defaultValue: "Bank" })}</Label>
                        <Input value={newAccBankName} onChange={e => setNewAccBankName(e.target.value)}
                          className="h-7 text-xs" placeholder="Deutsche Bank" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveBankAccount}>
                        {t("saveBankAccount", { defaultValue: "Konto speichern" })}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                        {debit ? "−" : "+"}&#8364; {fmtAbs(tx.amount)}
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

      {/* Stored bank accounts + transaction history */}
      <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("storedBankAccounts", { defaultValue: "Bankkonten" })}</p>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => { setShowCreateBa(v => !v); setCreateIban(""); setCreateOwner(""); setCreateBank(""); setEditingBaId(null); setDeletingBaId(null); }}>
              <PlusCircle className="h-3.5 w-3.5" />
              {t("addBankAccount", { defaultValue: "Konto anlegen" })}
            </Button>
          </div>

          {/* Manual create form */}
          {showCreateBa && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="px-4 pt-3 pb-3 space-y-2">
                <p className="text-xs font-medium text-blue-900">{t("newBankAccount", { defaultValue: "Neues Bankkonto" })}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-800">IBAN *</Label>
                    <Input value={createIban} onChange={e => setCreateIban(e.target.value)}
                      className="h-7 text-xs font-mono" placeholder="DE89 3704 0044 …" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-800">{t("bankAccountOwner", { defaultValue: "Kontoinhaber" })} *</Label>
                    <Input value={createOwner} onChange={e => setCreateOwner(e.target.value)}
                      className="h-7 text-xs" placeholder="Max Mustermann" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-800">{t("bankName", { defaultValue: "Bank" })}</Label>
                    <Input value={createBank} onChange={e => setCreateBank(e.target.value)}
                      className="h-7 text-xs" placeholder="Deutsche Bank" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setShowCreateBa(false)}>
                    {tCom("cancel", { defaultValue: "Abbrechen" })}
                  </Button>
                  <Button size="sm" className="h-7 text-xs"
                    disabled={!createIban.trim() || !createOwner.trim()}
                    onClick={() => {
                      onSaveBankAccount?.({ iban: createIban.replace(/\s/g, ""), owner: createOwner.trim(), bankName: createBank.trim(), description: "" });
                      setShowCreateBa(false);
                      setCreateIban(""); setCreateOwner(""); setCreateBank("");
                    }}>
                    {tCom("save", { defaultValue: "Speichern" })}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {bankAccounts.length === 0 && !showCreateBa && (
            <Card className="border-dashed">
              <CardContent className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("noBankAccounts", { defaultValue: "Noch keine Bankkonten gespeichert. PDF importieren oder manuell anlegen." })}
              </CardContent>
            </Card>
          )}
          {bankAccounts.map((ba, i) => {
            const id    = baId(ba);
            const iban  = baIban(ba);
            const owner = ba["bank-account/owner"] ?? (ba as any).owner ?? "";
            const bank  = ba["bank-account/bank-name"] ?? (ba as any)["bank-name"] ?? "";
            const txs   = txsByBankAccount[id] ?? [];
            const isEditing  = editingBaId === id;
            const isDeleting = deletingBaId === id;

            return (
              <Card key={id || i} className="overflow-hidden">
                <CardContent className="px-4 pt-3 pb-3 space-y-2">

                  {isEditing ? (
                    /* ── Edit form ── */
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-muted-foreground">{formatIban(iban)}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">{t("bankAccountOwner", { defaultValue: "Kontoinhaber" })}</Label>
                          <Input value={editOwner} onChange={e => setEditOwner(e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("bankName", { defaultValue: "Bank" })}</Label>
                          <Input value={editBankName} onChange={e => setEditBankName(e.target.value)} className="h-7 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => setEditingBaId(null)}>
                          {tCom("cancel", { defaultValue: "Abbrechen" })}
                        </Button>
                        <Button size="sm" className="h-7 text-xs"
                          onClick={() => {
                            onUpdateBankAccount?.({ id, iban, owner: editOwner, bankName: editBankName });
                            setEditingBaId(null);
                          }}>
                          {tCom("save", { defaultValue: "Speichern" })}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal view ── */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium">{formatIban(iban)}</p>
                          {owner && <p className="text-xs text-muted-foreground mt-0.5 truncate">{owner}</p>}
                          {bank  && <p className="text-xs text-muted-foreground truncate">{bank}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums mr-1">
                            {txs.length > 0 ? `${txs.length} Buchung${txs.length !== 1 ? "en" : ""}` : "—"}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { setEditingBaId(id); setEditOwner(owner); setEditBankName(bank); setDeletingBaId(null); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeletingBaId(isDeleting ? null : id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Delete confirmation */}
                      {isDeleting && (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                          <p className="text-xs text-destructive">{t("confirmDeleteBankAccount", { defaultValue: "Konto wirklich löschen?" })}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2"
                              onClick={() => setDeletingBaId(null)}>
                              {tCom("cancel", { defaultValue: "Abbrechen" })}
                            </Button>
                            <Button variant="destructive" size="sm" className="h-6 text-xs px-2"
                              onClick={() => { onDeleteBankAccount?.(id); setDeletingBaId(null); }}>
                              {tCom("delete", { defaultValue: "Löschen" })}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Recent transactions */}
                      {txs.length > 0 ? (
                        <div className="divide-y border-t">
                          {txs.map((tx, j) => (
                            <div key={j} className="flex items-center gap-2 py-1 text-xs">
                              <span className="text-muted-foreground tabular-nums shrink-0 w-24">{tx.date}</span>
                              <span className="truncate flex-1 min-w-0 text-foreground">{tx.description}</span>
                              <span className={cn("tabular-nums shrink-0 font-medium", tx.type === "rent" ? "text-green-700" : "text-red-600")}>
                                {tx.type === "rent" ? "+" : "−"}&#8364;&nbsp;{fmtAbs(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic border-t pt-2">
                          {t("noLinkedTransactions", { defaultValue: "Noch keine Buchungen verknüpft" })}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

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
