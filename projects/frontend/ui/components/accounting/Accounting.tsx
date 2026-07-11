import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Info, Undo2, BookOpen, Camera } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ACCOUNTS, accountLabel, account, OPENING_ASSET_ACCOUNTS, OPENING_LIABILITY_ACCOUNTS } from "./chartOfAccounts";
import { deriveJournal, trialBalance, guv, bilanz, ledger } from "./engine";
import type { AccountingData, JournalLine } from "./engine";

type Props = {
  properties?: any[];
  apartments?: any[];
  garages?: any[];
  allCosts?: any[];
  allRentPayments?: any[];
  taxConfigs?: any[];
  taxLoans?: any[];
  taxMaintenances?: any[];
  nebenkostenSettlements?: any[];
  taxIncomes?: any[];
  taxExpenses?: any[];
  journalEntries?: any[];
  accountingOnboarding?: { date: string; completed?: boolean } | null;
  openingBalances?: any[];
  accountingOnboardingLoaded?: boolean;
  isReadOnly?: boolean;
  isSaving?: boolean;
  onAddJournalEntry?: (data: any) => void;
  onStornoJournalEntry?: (id: string) => void;
  onCompleteAccountingOnboarding?: (data: any) => void;
};

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

type Tab = "journal" | "susa" | "guv" | "bilanz" | "konten";

const emptyForm = { date: "", debit: "", credit: "", amount: "", description: "", propertyId: "", reference: "" };

export default function Accounting({
  properties = [],
  apartments = [],
  garages = [],
  allCosts = [],
  allRentPayments = [],
  taxConfigs = [],
  taxLoans = [],
  taxMaintenances = [],
  nebenkostenSettlements = [],
  taxIncomes = [],
  taxExpenses = [],
  journalEntries = [],
  accountingOnboarding = null,
  openingBalances = [],
  accountingOnboardingLoaded = false,
  isReadOnly = false,
  isSaving = false,
  onAddJournalEntry,
  onStornoJournalEntry,
  onCompleteAccountingOnboarding,
}: Props) {
  const { t } = useTranslation("accounting");
  const { t: tCommon } = useTranslation("common");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState<Tab>("journal");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("1800");
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [stornoConfirmId, setStornoConfirmId] = useState<string | null>(null);

  // ── Onboarding (Eröffnungsbilanz) state ──────────────────────────────────
  const [obDate, setObDate] = useState(`${currentYear}-01-01`);
  const [obValues, setObValues] = useState<Record<string, string>>(() => {
    // Vorschläge aus vorhandenen Stammdaten: Gebäude-/Bodenwert aus der AfA-Konfiguration
    const building = taxConfigs.reduce((s: number, c: any) => s + pNum(c["building-value"]), 0);
    const land     = taxConfigs.reduce((s: number, c: any) => s + pNum(c["land-value"]), 0);
    const init: Record<string, string> = {};
    if (building > 0) init["0240"] = String(building);
    if (land > 0)     init["0215"] = String(land);
    return init;
  });

  const obSumAssets = OPENING_ASSET_ACCOUNTS.reduce((s, a) => s + pNum(obValues[a]), 0);
  const obSumLiabs  = OPENING_LIABILITY_ACCOUNTS.reduce((s, a) => s + pNum(obValues[a]), 0);
  const obEquity    = obSumAssets - obSumLiabs;

  const needsOnboarding =
    accountingOnboardingLoaded && !accountingOnboarding && !isReadOnly && !!onCompleteAccountingOnboarding;

  function completeOnboarding(skip: boolean) {
    const positions: { account: string; side: "S" | "H"; amount: number }[] = [];
    if (!skip) {
      for (const acc of OPENING_ASSET_ACCOUNTS) {
        const v = pNum(obValues[acc]);
        if (v > 0) positions.push({ account: acc, side: "S", amount: v });
      }
      for (const acc of OPENING_LIABILITY_ACCOUNTS) {
        const v = pNum(obValues[acc]);
        if (v > 0) positions.push({ account: acc, side: "H", amount: v });
      }
      if (Math.abs(obEquity) > 0.005) {
        positions.push({ account: "2000", side: obEquity > 0 ? "H" : "S", amount: Math.abs(obEquity) });
      }
    }
    onCompleteAccountingOnboarding?.({ date: obDate, positions });
  }

  const data: AccountingData = useMemo(() => ({
    properties, apartments, garages, allCosts, allRentPayments, taxConfigs,
    loans: taxLoans, maintenances: taxMaintenances, nkSettlements: nebenkostenSettlements,
    taxIncomes, taxExpenses, journalEntries,
    onboarding: accountingOnboarding, openingBalances,
  }), [properties, apartments, garages, allCosts, allRentPayments, taxConfigs,
       taxLoans, taxMaintenances, nebenkostenSettlements, taxIncomes, taxExpenses, journalEntries,
       accountingOnboarding, openingBalances]);

  const allLines = useMemo(() => deriveJournal(data, year), [data, year]);

  const journalLines = useMemo(() => {
    let ls = allLines.filter(l => l.year === year);
    if (propertyFilter) ls = ls.filter(l => l.propertyId === propertyFilter);
    return ls;
  }, [allLines, year, propertyFilter]);

  const susa = useMemo(() => trialBalance(allLines, year), [allLines, year]);
  const guvData = useMemo(() => guv(allLines, year), [allLines, year]);
  const bilanzData = useMemo(() => bilanz(allLines, year), [allLines, year]);
  const kontoData = useMemo(() => ledger(allLines, selectedAccount, year), [allLines, selectedAccount, year]);

  const activeAccounts = useMemo(() => {
    const used = new Set<string>();
    for (const l of allLines) { used.add(l.debit); used.add(l.credit); }
    return ACCOUNTS.filter(a => used.has(a.number));
  }, [allLines]);

  function handleSave() {
    if (!form || !form.date || !form.debit || !form.credit || !form.amount) return;
    if (form.debit === form.credit) return;
    onAddJournalEntry?.({
      date: form.date,
      debitAccount: form.debit,
      creditAccount: form.credit,
      amount: parseFloat(form.amount),
      description: form.description,
      propertyId: form.propertyId || undefined,
      reference: form.reference || undefined,
    });
    setForm(null);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "journal", label: t("tabs.journal") },
    { id: "konten",  label: t("tabs.konten") },
    { id: "susa",    label: t("tabs.susa") },
    { id: "guv",     label: t("tabs.guv") },
    { id: "bilanz",  label: t("tabs.bilanz") },
  ];

  // ── One-time onboarding: capture the opening balance sheet ───────────────
  if (!accountingOnboardingLoaded) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{tCommon("loading")}</p>;
  }

  if (needsOnboarding) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("onboarding.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("onboarding.intro")}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1 max-w-xs">
              <Label className="text-xs">{t("onboarding.stichtag")}</Label>
              <Input type="date" className="h-8 text-sm" value={obDate}
                onChange={e => setObDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{t("onboarding.stichtagHint")}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("bilanz.aktiva")}</p>
                {OPENING_ASSET_ACCOUNTS.map(acc => (
                  <div key={acc} className="space-y-0.5">
                    <Label className="text-xs">{accountLabel(acc)}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" className="h-8 text-sm"
                      value={obValues[acc] ?? ""}
                      onChange={e => setObValues(v => ({ ...v, [acc]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("bilanz.passiva")}</p>
                {OPENING_LIABILITY_ACCOUNTS.map(acc => (
                  <div key={acc} className="space-y-0.5">
                    <Label className="text-xs">{accountLabel(acc)}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" className="h-8 text-sm"
                      value={obValues[acc] ?? ""}
                      onChange={e => setObValues(v => ({ ...v, [acc]: e.target.value }))} />
                  </div>
                ))}
                <div className="pt-1 border-t space-y-0.5">
                  <p className="text-xs">{t("onboarding.equityAuto")}</p>
                  <p className={`text-sm font-semibold tabular-nums ${obEquity >= 0 ? "" : "text-destructive"}`}>
                    € {fmt(obEquity)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t("onboarding.equityHint")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">{t("onboarding.balanceCheck")}</span>
              <span className="tabular-nums font-medium">
                € {fmt(obSumAssets)} = € {fmt(obSumLiabs + obEquity)}
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>{t("onboarding.onceWarning")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={!obDate || isSaving} onClick={() => completeOnboarding(false)}>
                {t("onboarding.confirm")}
              </Button>
              <Button variant="outline" disabled={!obDate || isSaving} onClick={() => completeOnboarding(true)}>
                {t("onboarding.skip")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums w-12 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          {TABS.map(x => (
            <button
              key={x.id}
              className={`px-3 py-1.5 text-sm whitespace-nowrap ${tab === x.id ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              onClick={() => setTab(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
        {tab === "journal" && properties.length > 1 && (
          <select
            className="border rounded px-2 py-1.5 text-sm bg-background"
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
          >
            <option value="">{t("allProperties")}</option>
            {properties.map((p: any) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* GoB / GoBD note */}
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="space-y-1">
          {accountingOnboarding?.date && (
            <p className="font-medium text-foreground">
              {t("onboarding.completedInfo", { date: fmtDate(accountingOnboarding.date) })}
            </p>
          )}
          <p>{t("gobdNote")}</p>
        </div>
      </div>

      {/* ── Journal (Grundbuch) ─────────────────────────────────────────── */}
      {tab === "journal" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t("journal.title", { year })}
              </CardTitle>
              {!isReadOnly && onAddJournalEntry && !form && (
                <Button size="sm" variant="outline" className="h-7 gap-1"
                  onClick={() => setForm({ ...emptyForm, date: `${year}-12-31` })}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("journal.add")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {form && (
              <div className="border-b px-4 py-3 space-y-2 bg-muted/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.date")}</Label>
                    <Input className="h-8 text-sm" type="date" value={form.date}
                      min={accountingOnboarding?.date}
                      onChange={e => setForm(f => f ? { ...f, date: e.target.value } : f)} />
                    {accountingOnboarding?.date && form.date && form.date < accountingOnboarding.date && (
                      <p className="text-[10px] text-destructive">{t("journal.beforeOpening", { date: fmtDate(accountingOnboarding.date) })}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.debit")}</Label>
                    <select className="border rounded px-2 h-8 text-sm w-full bg-background" value={form.debit}
                      onChange={e => setForm(f => f ? { ...f, debit: e.target.value } : f)}>
                      <option value="">—</option>
                      {ACCOUNTS.map(a => <option key={a.number} value={a.number}>{a.number} {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.credit")}</Label>
                    <select className="border rounded px-2 h-8 text-sm w-full bg-background" value={form.credit}
                      onChange={e => setForm(f => f ? { ...f, credit: e.target.value } : f)}>
                      <option value="">—</option>
                      {ACCOUNTS.map(a => <option key={a.number} value={a.number}>{a.number} {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.amount")}</Label>
                    <Input className="h-8 text-sm" type="number" min="0" step="0.01" placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm(f => f ? { ...f, amount: e.target.value } : f)} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">{t("journal.description")}</Label>
                    <Input className="h-8 text-sm" placeholder={t("journal.descPlaceholder")}
                      value={form.description}
                      onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.property")}</Label>
                    <select className="border rounded px-2 h-8 text-sm w-full bg-background" value={form.propertyId}
                      onChange={e => setForm(f => f ? { ...f, propertyId: e.target.value } : f)}>
                      <option value="">—</option>
                      {properties.map((p: any) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("journal.reference")}</Label>
                    <Input className="h-8 text-sm" placeholder={t("journal.refPlaceholder")}
                      value={form.reference}
                      onChange={e => setForm(f => f ? { ...f, reference: e.target.value } : f)} />
                  </div>
                </div>
                {form.debit && form.credit && form.debit === form.credit && (
                  <p className="text-xs text-destructive">{t("journal.sameAccount")}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7"
                    disabled={!form.date || !form.debit || !form.credit || !form.amount || form.debit === form.credit || isSaving
                      || (!!accountingOnboarding?.date && form.date < accountingOnboarding.date)}
                    onClick={handleSave}>
                    {t("journal.post")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setForm(null)}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left  font-medium px-4 py-2">{t("journal.number")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.date")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.description")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.debit")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.credit")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("journal.amount")}</th>
                    <th className="text-left  font-medium px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {journalLines.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">{t("journal.empty")}</td></tr>
                  )}
                  {journalLines.map(l => (
                    <tr key={l.id} className={`border-b last:border-b-0 ${l.stornoed || l.isStorno ? "opacity-50" : ""}`}>
                      <td className="px-4 py-1.5 tabular-nums text-xs whitespace-nowrap">{l.number}</td>
                      <td className="px-2 py-1.5 tabular-nums text-xs whitespace-nowrap">{fmtDate(l.date)}</td>
                      <td className="px-2 py-1.5">
                        {l.description}
                        {l.stornoed && <span className="ml-1 text-[10px] text-destructive">({t("journal.stornoedBadge")})</span>}
                      </td>
                      <td className="px-2 py-1.5 text-xs whitespace-nowrap" title={accountLabel(l.debit)}>{l.debit}</td>
                      <td className="px-2 py-1.5 text-xs whitespace-nowrap" title={accountLabel(l.credit)}>{l.credit}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">€ {fmt(l.amount)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {l.source === "manual" ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] rounded bg-blue-100 text-blue-700 px-1.5 py-0.5">{t("journal.manual")}</span>
                            {!isReadOnly && onStornoJournalEntry && !l.stornoed && !l.isStorno && (
                              stornoConfirmId === l.entityId ? (
                                <>
                                  <button className="text-[10px] text-destructive font-semibold hover:underline"
                                    onClick={() => { onStornoJournalEntry(l.entityId!); setStornoConfirmId(null); }}>
                                    {t("journal.stornoConfirm")}
                                  </button>
                                  <button className="text-[10px] text-muted-foreground hover:underline"
                                    onClick={() => setStornoConfirmId(null)}>
                                    {tCommon("cancel")}
                                  </button>
                                </>
                              ) : (
                                <button className="text-muted-foreground hover:text-destructive" title={t("journal.storno")}
                                  onClick={() => setStornoConfirmId(l.entityId!)}>
                                  <Undo2 className="h-3.5 w-3.5" />
                                </button>
                              )
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] rounded bg-muted text-muted-foreground px-1.5 py-0.5">{t("journal.auto")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kontenblatt (Hauptbuch) ─────────────────────────────────────── */}
      {tab === "konten" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base">{t("konten.title")}</CardTitle>
              <select
                className="border rounded px-2 py-1.5 text-sm bg-background"
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
              >
                {(activeAccounts.length > 0 ? activeAccounts : ACCOUNTS).map(a => (
                  <option key={a.number} value={a.number}>{a.number} {a.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left  font-medium px-4 py-2">{t("journal.date")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.number")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("journal.description")}</th>
                    <th className="text-left  font-medium px-2 py-2">{t("konten.counterAccount")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("konten.soll")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("konten.haben")}</th>
                    <th className="text-right font-medium px-4 py-2">{t("konten.saldo")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/30">
                    <td colSpan={6} className="px-4 py-1.5 text-xs font-medium">{t("konten.opening")}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-xs font-medium">€ {fmt(kontoData.opening)}</td>
                  </tr>
                  {kontoData.rows.map((r, i) => (
                    <tr key={i} className={`border-b ${r.line.stornoed || r.line.isStorno ? "opacity-50" : ""}`}>
                      <td className="px-4 py-1.5 tabular-nums text-xs whitespace-nowrap">{fmtDate(r.line.date)}</td>
                      <td className="px-2 py-1.5 tabular-nums text-xs whitespace-nowrap">{r.line.number}</td>
                      <td className="px-2 py-1.5">{r.line.description}</td>
                      <td className="px-2 py-1.5 text-xs whitespace-nowrap" title={accountLabel(r.counter)}>{r.counter}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">{r.side === "S" ? `€ ${fmt(r.line.amount)}` : ""}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">{r.side === "H" ? `€ ${fmt(r.line.amount)}` : ""}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums whitespace-nowrap">€ {fmt(r.balance)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold">{t("konten.closing")}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-xs font-semibold">€ {fmt(kontoData.closing)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Summen- und Saldenliste ─────────────────────────────────────── */}
      {tab === "susa" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("susa.title", { year })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left  font-medium px-4 py-2">{t("susa.account")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("susa.opening")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("konten.soll")}</th>
                    <th className="text-right font-medium px-2 py-2">{t("konten.haben")}</th>
                    <th className="text-right font-medium px-4 py-2">{t("susa.closing")}</th>
                  </tr>
                </thead>
                <tbody>
                  {susa.map(r => (
                    <tr key={r.account} className="border-b last:border-b-0">
                      <td className="px-4 py-1.5 text-xs">{accountLabel(r.account)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">€ {fmt(r.opening)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">€ {fmt(r.debit)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">€ {fmt(r.credit)}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums whitespace-nowrap font-medium">€ {fmt(r.closing)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold text-xs">
                    <td className="px-4 py-2">{t("susa.total")}</td>
                    <td className="px-2 py-2 text-right tabular-nums">€ {fmt(susa.reduce((s, r) => s + r.opening, 0))}</td>
                    <td className="px-2 py-2 text-right tabular-nums">€ {fmt(susa.reduce((s, r) => s + r.debit, 0))}</td>
                    <td className="px-2 py-2 text-right tabular-nums">€ {fmt(susa.reduce((s, r) => s + r.credit, 0))}</td>
                    <td className="px-4 py-2 text-right tabular-nums">€ {fmt(susa.reduce((s, r) => s + r.closing, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── GuV ─────────────────────────────────────────────────────────── */}
      {tab === "guv" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("guv.title", { year })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b">{t("guv.revenues")}</div>
            {guvData.revenues.map(r => (
              <div key={r.account} className="flex justify-between px-4 py-1.5 border-b text-sm">
                <span className="text-xs">{accountLabel(r.account)}</span>
                <span className="tabular-nums">€ {fmt(r.amount)}</span>
              </div>
            ))}
            {guvData.revenues.length === 0 && <p className="px-4 py-2 text-sm text-muted-foreground">—</p>}
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-t">{t("guv.expenses")}</div>
            {guvData.expenses.map(e => (
              <div key={e.account} className="flex justify-between px-4 py-1.5 border-b text-sm">
                <span className="text-xs">{accountLabel(e.account)}</span>
                <span className="tabular-nums">− € {fmt(e.amount)}</span>
              </div>
            ))}
            {guvData.expenses.length === 0 && <p className="px-4 py-2 text-sm text-muted-foreground">—</p>}
            <div className="flex justify-between px-4 py-3 border-t bg-muted/30">
              <span className="font-semibold text-sm">
                {guvData.result >= 0 ? t("guv.profit") : t("guv.loss")}
              </span>
              <span className={`font-semibold tabular-nums ${guvData.result >= 0 ? "text-green-600" : "text-destructive"}`}>
                € {fmt(Math.abs(guvData.result))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bilanz ──────────────────────────────────────────────────────── */}
      {tab === "bilanz" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("bilanz.aktiva")} — {t("bilanz.asOf", { date: `31.12.${year}` })}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bilanzData.aktiva.map(a => (
                <div key={a.account} className="flex justify-between px-4 py-1.5 border-b text-sm">
                  <span className="text-xs">{accountLabel(a.account)}</span>
                  <span className="tabular-nums">€ {fmt(a.amount)}</span>
                </div>
              ))}
              {bilanzData.aktiva.length === 0 && <p className="px-4 py-2 text-sm text-muted-foreground">—</p>}
              <div className="flex justify-between px-4 py-2.5 bg-muted/30 font-semibold text-sm">
                <span>{t("bilanz.total")}</span>
                <span className="tabular-nums">€ {fmt(bilanzData.totalAktiva)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("bilanz.passiva")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bilanzData.passiva.map((p, i) => (
                <div key={i} className="flex justify-between px-4 py-1.5 border-b text-sm">
                  <span className="text-xs">{p.label ?? accountLabel(p.account)}</span>
                  <span className="tabular-nums">€ {fmt(p.amount)}</span>
                </div>
              ))}
              {bilanzData.passiva.length === 0 && <p className="px-4 py-2 text-sm text-muted-foreground">—</p>}
              <div className="flex justify-between px-4 py-2.5 bg-muted/30 font-semibold text-sm">
                <span>{t("bilanz.total")}</span>
                <span className="tabular-nums">€ {fmt(bilanzData.totalPassiva)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
