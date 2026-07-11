// Doppelte Buchführung — Ableitungs- und Auswertungslogik.
//
// Buchungen entstehen auf zwei Wegen:
//  1. Automatisch abgeleitet aus den vorhandenen Stamm- und Bewegungsdaten
//     (Mietzahlungen, Kosten, Darlehen, AfA, Erhaltungsaufwand, NK-Nachzahlungen,
//     sonstige Einnahmen/Ausgaben). Diese werden nicht gespeichert, sondern
//     deterministisch berechnet — die Quelldaten bleiben führend.
//  2. Manuell erfasste Buchungssätze (journal-entry Entities). Diese sind
//     GoBD-konform unveränderlich; Korrektur nur per Storno.
//
// Jede Buchung ist ein einfacher Buchungssatz (ein Sollkonto an ein Habenkonto),
// dadurch ist jede Buchung in sich ausgeglichen und Bilanz/GuV stimmen per
// Konstruktion überein.

import { account, expenseAccountFor, taxExpenseAccountFor, isDebitNormal, ACCOUNTS } from "./chartOfAccounts";
import type { AccountType } from "./chartOfAccounts";

export type JournalLine = {
  id: string;
  number: string;        // Belegnummer ("A-…" automatisch, "M-…" manuell)
  date: string;          // YYYY-MM-DD (Belegdatum)
  year: number;
  description: string;
  debit: string;         // Sollkonto
  credit: string;        // Habenkonto
  amount: number;
  source: "auto" | "manual";
  sourceType?: string;
  propertyId?: string;
  stornoed?: boolean;    // wurde durch Storno neutralisiert
  isStorno?: boolean;    // ist selbst eine Stornobuchung
  entityId?: string;     // db-id für manuelle Buchungen (Storno-Ziel)
};

export type AccountingData = {
  properties: any[];
  apartments: any[];
  garages: any[];
  allCosts: any[];
  allRentPayments: any[];
  taxConfigs: any[];
  loans: any[];
  maintenances: any[];
  nkSettlements: any[];
  taxIncomes: any[];
  taxExpenses: any[];
  journalEntries: any[];
  /** Eröffnungsbilanz-Stichtag (einmalige Aufnahme beim Start). */
  onboarding?: { date: string } | null;
  /** Saldenvorträge: [{account, side "S"|"H", amount}] */
  openingBalances?: any[];
};

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kleinstes Jahr, in dem Bewegungsdaten existieren (für rechnerische Garagenerlöse). */
function minDataYear(data: AccountingData, fallback: number): number {
  let min = Infinity;
  for (const p of data.allRentPayments) if (Number(p.year) > 1900) min = Math.min(min, Number(p.year));
  for (const c of data.allCosts)        if (Number(c.year) > 1900) min = Math.min(min, Number(c.year));
  return min === Infinity ? fallback : min;
}

/** Alle Buchungen (automatisch + manuell) mit Belegdatum bis einschließlich 31.12. maxYear. */
export function deriveJournal(data: AccountingData, maxYear: number): JournalLine[] {
  const lines: JournalLine[] = [];
  const cutoff = `${maxYear}-12-31`;
  const aptById = new Map(data.apartments.map(a => [String(a.id), a]));

  // Eröffnungsbilanz-Stichtag: die Aufnahme des Anfangsbestands ersetzt die
  // Historie — automatisch abgeleitete Buchungen vor dem Stichtag entfallen,
  // ihr Effekt steckt bereits in den Saldenvorträgen.
  const openingDate = data.onboarding?.date ?? null;

  const push = (l: Omit<JournalLine, "number" | "year" | "source">) => {
    if (l.date > cutoff || l.amount <= 0) return;
    if (openingDate && l.date < openingDate && l.sourceType !== "opening") return;
    lines.push({ ...l, number: "", year: parseInt(l.date.slice(0, 4), 10), source: "auto" });
  };

  // ── Saldenvorträge (Eröffnungsbilanz gegen Konto 9000) ────────────────────
  if (openingDate) {
    for (const ob of data.openingBalances ?? []) {
      const side = ob.side === "H" ? "H" : "S";
      const acc = String(ob.account);
      push({
        id: `ob-${acc}`,
        date: openingDate,
        description: `Saldovortrag ${account(acc).name}`,
        debit:  side === "S" ? acc : "9000",
        credit: side === "S" ? "9000" : acc,
        amount: num(ob.amount),
        sourceType: "opening",
      });
    }
  }

  // ── Anschaffung Gebäude/Grundstück (Eröffnung gegen Eigenkapital) ─────────
  for (const p of data.properties) {
    const cfg = data.taxConfigs.find(c => String(c["property-id"]) === String(p.id));
    const date = cfg?.["afa-start-date"] || p["acquisition-date"];
    if (!date) continue;
    const building = num(cfg?.["building-value"] ?? p["building-value"]);
    const land     = num(cfg?.["land-value"] ?? p["land-value"]);
    if (building > 0) {
      push({ id: `acq-b-${p.id}`, date, description: `Anschaffung Gebäude — ${p.name}`,
             debit: "0240", credit: "2000", amount: building, sourceType: "acquisition", propertyId: String(p.id) });
    }
    if (land > 0) {
      push({ id: `acq-l-${p.id}`, date, description: `Anschaffung Grundstück — ${p.name}`,
             debit: "0215", credit: "2000", amount: land, sourceType: "acquisition", propertyId: String(p.id) });
    }
  }

  // ── AfA je Immobilie und Jahr (zeitanteilig im ersten Jahr, Deckelung) ────
  for (const p of data.properties) {
    const cfg = data.taxConfigs.find(c => String(c["property-id"]) === String(p.id));
    const buildingValue = num(cfg?.["building-value"]);
    const rate = cfg?.["afa-rate"] !== undefined && cfg?.["afa-rate"] !== "" ? num(cfg["afa-rate"]) : 2;
    const startStr = cfg?.["afa-start-date"];
    if (!(buildingValue > 0 && rate > 0 && startStr)) continue;
    const start = new Date(startStr + "T00:00:00");
    const startYear = start.getFullYear();
    const lifetime = Math.ceil(100 / rate);
    const fullAfa = (buildingValue * rate) / 100;
    for (let y = startYear; y <= maxYear && y < startYear + lifetime; y++) {
      const amount = y === startYear ? (fullAfa * (12 - start.getMonth())) / 12 : fullAfa;
      push({ id: `afa-${p.id}-${y}`, date: `${y}-12-31`, description: `AfA Gebäude ${y} — ${p.name}`,
             debit: "6220", credit: "0240", amount, sourceType: "afa", propertyId: String(p.id) });
    }
  }

  // ── Mietzahlungen: Bank an Mieterträge / NK-Umlagen ───────────────────────
  for (const r of data.allRentPayments) {
    const y = Number(r.year);
    const m = Number(r.month);
    const date = m >= 1 && m <= 12 ? `${y}-${pad2(m)}-01` : `${y}-12-31`;
    const apt = aptById.get(String(r["apartment-id"]));
    const code = apt?.code ? ` Whg. ${apt.code}` : "";
    const propertyId = apt ? String(apt["property-id"]) : undefined;
    const kalt = num(r.kaltmiete);
    const nk   = num(r["nebenkosten-warm"]);
    if (kalt > 0) {
      push({ id: `rent-k-${r.id}`, date, description: `Kaltmiete ${pad2(m)}/${y}${code}`,
             debit: "1800", credit: "4120", amount: kalt, sourceType: "rent-payment", propertyId });
    }
    if (nk > 0) {
      push({ id: `rent-n-${r.id}`, date, description: `NK-Vorauszahlung ${pad2(m)}/${y}${code}`,
             debit: "1800", credit: "4125", amount: nk, sourceType: "rent-payment", propertyId });
    }
    if (kalt <= 0 && nk <= 0 && num(r.value) > 0) {
      push({ id: `rent-v-${r.id}`, date, description: `Miete ${pad2(m)}/${y}${code}`,
             debit: "1800", credit: "4120", amount: num(r.value), sourceType: "rent-payment", propertyId });
    }
  }

  // ── Garagen: rechnerische Jahreserlöse (12 × Monatsmiete) ─────────────────
  const firstYear = minDataYear(data, maxYear);
  for (const g of data.garages) {
    const monthly = num(g["monthly-rent"]);
    if (monthly <= 0) continue;
    for (let y = firstYear; y <= maxYear; y++) {
      push({ id: `gar-${g.id}-${y}`, date: `${y}-12-31`,
             description: `Garagenmiete ${g.code ?? ""} ${y} (rechnerisch 12 × ${monthly.toFixed(2)})`.trim(),
             debit: "1800", credit: "4130", amount: monthly * 12,
             sourceType: "garage", propertyId: g["property-id"] ? String(g["property-id"]) : undefined });
    }
  }

  // ── Betriebskosten der Immobilie ──────────────────────────────────────────
  for (const c of data.allCosts) {
    const y = Number(c.year);
    push({ id: `cost-${c.id}`, date: `${y}-12-31`, description: `${c.name ?? c.line ?? "Kosten"} ${y}`,
           debit: expenseAccountFor(c.line, c.name), credit: "1800", amount: num(c.value),
           sourceType: "cost", propertyId: c["property-id"] ? String(c["property-id"]) : undefined });
  }

  // ── Erhaltungsaufwand (handelsrechtlich sofort im Zahlungsjahr) ───────────
  for (const m of data.maintenances) {
    const y = Number(m.year);
    push({ id: `maint-${m.id}`, date: `${y}-12-31`, description: `${m.description ?? "Erhaltungsaufwand"} ${y}`,
           debit: "6450", credit: "1800", amount: num(m.amount),
           sourceType: "maintenance", propertyId: m["property-id"] ? String(m["property-id"]) : undefined });
  }

  // ── Schuldzinsen ──────────────────────────────────────────────────────────
  for (const l of data.loans) {
    const y = Number(l.year);
    push({ id: `int-${l.id}`, date: `${y}-12-31`, description: `Zinsen ${l["lender-name"] ?? "Darlehen"} ${y}`,
           debit: "7310", credit: "1800", amount: num(l["annual-interest"]),
           sourceType: "loan-interest", propertyId: l["property-id"] ? String(l["property-id"]) : undefined });
  }

  // ── NK-Nachzahlungen (Zahlungseingang aus Abrechnung) ─────────────────────
  for (const s of data.nkSettlements) {
    const date = s.date ?? `${Number(s.year)}-12-31`;
    push({ id: `nks-${s.id}`, date, description: `NK-Nachzahlung Abrechnungsjahr ${s.year}${s.notes ? " — " + s.notes : ""}`,
           debit: "1800", credit: "4126", amount: num(s.amount), sourceType: "nk-settlement" });
  }

  // ── Sonstige Einnahmen / sonstige Werbungskosten ──────────────────────────
  for (const i of data.taxIncomes) {
    const date = i.date || `${Number(i.year)}-12-31`;
    push({ id: `ti-${i.id}`, date, description: i.description ?? "Sonstige Einnahme",
           debit: "1800", credit: "4190", amount: num(i.amount),
           sourceType: "tax-income", propertyId: i["property-id"] ? String(i["property-id"]) : undefined });
  }
  for (const e of data.taxExpenses) {
    const date = e.date || `${Number(e.year)}-12-31`;
    push({ id: `te-${e.id}`, date, description: e.description ?? "Sonstige Ausgabe",
           debit: taxExpenseAccountFor(e.category), credit: "1800", amount: num(e.amount),
           sourceType: "tax-expense", propertyId: e["property-id"] ? String(e["property-id"]) : undefined });
  }

  // ── Sortieren + Belegnummern für abgeleitete Buchungen ────────────────────
  lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  lines.forEach((l, i) => { l.number = `A-${String(i + 1).padStart(4, "0")}`; });

  // ── Manuelle Buchungen aus der Datenbank ──────────────────────────────────
  for (const j of data.journalEntries) {
    const date = j.date ?? "";
    if (!date || date > cutoff) continue;
    lines.push({
      id: `man-${j.id}`,
      entityId: String(j.id),
      number: `M-${j.number}`,
      date,
      year: Number(j.year ?? parseInt(date.slice(0, 4), 10)),
      description: j.description ?? "",
      debit: String(j["debit-account"]),
      credit: String(j["credit-account"]),
      amount: num(j.amount),
      source: "manual",
      propertyId: j["property-id"] ? String(j["property-id"]) : undefined,
      stornoed: !!j.stornoed,
      isStorno: j["storno-of"] != null,
    });
  }

  lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.number < b.number ? -1 : 1));
  return lines;
}

// ── Auswertungen ──────────────────────────────────────────────────────────────

export type TrialBalanceRow = {
  account: string;
  opening: number;      // Saldo Vorjahre (Soll positiv)
  debit: number;        // Sollumsatz im Jahr
  credit: number;       // Habenumsatz im Jahr
  closing: number;      // Endsaldo (Soll positiv)
};

/** Summen- und Saldenliste für ein Geschäftsjahr. */
export function trialBalance(lines: JournalLine[], year: number): TrialBalanceRow[] {
  const rows = new Map<string, TrialBalanceRow>();
  const row = (acc: string) => {
    let r = rows.get(acc);
    if (!r) { r = { account: acc, opening: 0, debit: 0, credit: 0, closing: 0 }; rows.set(acc, r); }
    return r;
  };
  for (const l of lines) {
    if (l.year < year) {
      row(l.debit).opening += l.amount;
      row(l.credit).opening -= l.amount;
    } else if (l.year === year) {
      row(l.debit).debit += l.amount;
      row(l.credit).credit += l.amount;
    }
  }
  for (const r of rows.values()) r.closing = r.opening + r.debit - r.credit;
  return [...rows.values()]
    .filter(r => Math.abs(r.opening) > 0.005 || r.debit > 0.005 || r.credit > 0.005)
    .sort((a, b) => a.account.localeCompare(b.account));
}

export type GuvSection = { account: string; amount: number }[];

/** Gewinn- und Verlustrechnung eines Jahres. */
export function guv(lines: JournalLine[], year: number): { revenues: GuvSection; expenses: GuvSection; result: number } {
  const rev = new Map<string, number>();
  const exp = new Map<string, number>();
  for (const l of lines) {
    if (l.year !== year) continue;
    for (const [acc, sign] of [[l.debit, 1], [l.credit, -1]] as [string, number][]) {
      const t = account(acc).type;
      if (t === "revenue") rev.set(acc, (rev.get(acc) ?? 0) - sign * l.amount);
      if (t === "expense") exp.set(acc, (exp.get(acc) ?? 0) + sign * l.amount);
    }
  }
  const toSection = (m: Map<string, number>): GuvSection =>
    [...m.entries()].filter(([, v]) => Math.abs(v) > 0.005)
      .map(([acc, amount]) => ({ account: acc, amount }))
      .sort((a, b) => a.account.localeCompare(b.account));
  const revenues = toSection(rev);
  const expenses = toSection(exp);
  const result = revenues.reduce((s, r) => s + r.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0);
  return { revenues, expenses, result };
}

export type BilanzSide = { account: string; label?: string; amount: number }[];

/** Bilanz zum 31.12. eines Jahres (kumulierte Salden aller Buchungen). */
export function bilanz(lines: JournalLine[], year: number): {
  aktiva: BilanzSide; passiva: BilanzSide; totalAktiva: number; totalPassiva: number;
  jahresueberschuss: number; gewinnvortrag: number;
} {
  const bal = new Map<string, number>(); // Bestandskonten, Soll positiv
  let cumResult = 0;   // kumulierter Erfolg bis Jahresende
  let priorResult = 0; // Erfolg der Vorjahre (Gewinn-/Verlustvortrag)
  for (const l of lines) {
    if (l.year > year) continue;
    for (const [acc, sign] of [[l.debit, 1], [l.credit, -1]] as [string, number][]) {
      const t = account(acc).type;
      if (t === "asset" || t === "liability" || t === "equity") {
        bal.set(acc, (bal.get(acc) ?? 0) + sign * l.amount);
      }
    }
    // Erfolg = Erträge (Haben − Soll) − Aufwendungen (Soll − Haben)
    let delta = 0;
    if (account(l.credit).type === "revenue") delta += l.amount;
    if (account(l.debit).type === "revenue")  delta -= l.amount;
    if (account(l.debit).type === "expense")  delta -= l.amount;
    if (account(l.credit).type === "expense") delta += l.amount;
    cumResult += delta;
    if (l.year < year) priorResult += delta;
  }
  const jahresueberschuss = cumResult - priorResult;

  const aktiva: BilanzSide = [];
  const passiva: BilanzSide = [];
  for (const acc of ACCOUNTS) {
    const v = bal.get(acc.number) ?? 0;
    if (Math.abs(v) < 0.005) continue;
    if (acc.type === "asset") {
      aktiva.push({ account: acc.number, amount: v });
    } else if (acc.type === "liability") {
      passiva.push({ account: acc.number, amount: -v });
    } else if (acc.type === "equity") {
      passiva.push({ account: acc.number, amount: -v });
    }
  }
  if (Math.abs(priorResult) > 0.005) passiva.push({ account: "", label: "Gewinn-/Verlustvortrag", amount: priorResult });
  if (Math.abs(jahresueberschuss) > 0.005) passiva.push({ account: "", label: jahresueberschuss >= 0 ? "Jahresüberschuss" : "Jahresfehlbetrag", amount: jahresueberschuss });

  const totalAktiva = aktiva.reduce((s, a) => s + a.amount, 0);
  const totalPassiva = passiva.reduce((s, p) => s + p.amount, 0);
  return { aktiva, passiva, totalAktiva, totalPassiva, jahresueberschuss, gewinnvortrag: priorResult };
}

export type LedgerRow = { line: JournalLine; side: "S" | "H"; counter: string; balance: number };

/** Kontenblatt (Hauptbuch) eines Kontos mit laufendem Saldo, EB aus Vorjahren. */
export function ledger(lines: JournalLine[], acc: string, year: number): { opening: number; rows: LedgerRow[]; closing: number } {
  let opening = 0;
  const rows: LedgerRow[] = [];
  const sign = isDebitNormal(acc) ? 1 : -1;
  for (const l of lines) {
    const touchesDebit = l.debit === acc;
    const touchesCredit = l.credit === acc;
    if (!touchesDebit && !touchesCredit) continue;
    const delta = (touchesDebit ? l.amount : 0) - (touchesCredit ? l.amount : 0);
    if (l.year < year) { opening += sign * delta; continue; }
    if (l.year > year) continue;
    rows.push({ line: l, side: touchesDebit ? "S" : "H", counter: touchesDebit ? l.credit : l.debit, balance: 0 });
  }
  let running = opening;
  for (const r of rows) {
    running += sign * ((r.side === "S" ? r.line.amount : 0) - (r.side === "H" ? r.line.amount : 0));
    r.balance = running;
  }
  return { opening, rows, closing: running };
}
