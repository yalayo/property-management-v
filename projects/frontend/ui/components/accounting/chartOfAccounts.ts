// Kontenrahmen in Anlehnung an SKR04, zugeschnitten auf Wohnungsvermietung.
// Kontenklassen: 0 Anlagevermögen, 1 Umlaufvermögen, 2 Eigenkapital,
// 3 Fremdkapital, 4 Erträge, 6/7 Aufwendungen.

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type Account = {
  number: string;
  name: string;
  type: AccountType;
};

export const ACCOUNTS: Account[] = [
  { number: "0215", name: "Grundstücke (Grund und Boden)",                    type: "asset" },
  { number: "0240", name: "Gebäude",                                          type: "asset" },
  { number: "1200", name: "Forderungen aus Vermietung",                       type: "asset" },
  { number: "1800", name: "Bank",                                             type: "asset" },
  { number: "2000", name: "Eigenkapital",                                     type: "equity" },
  { number: "2100", name: "Privatentnahmen",                                  type: "equity" },
  { number: "2180", name: "Privateinlagen",                                   type: "equity" },
  { number: "3150", name: "Verbindlichkeiten gegenüber Kreditinstituten",     type: "liability" },
  { number: "3300", name: "Verbindlichkeiten aus Lieferungen und Leistungen", type: "liability" },
  { number: "4120", name: "Mieterträge (steuerfrei §4 Nr. 12 UStG)",          type: "revenue" },
  { number: "4125", name: "Umlagen Nebenkosten (Vorauszahlungen)",            type: "revenue" },
  { number: "4126", name: "Erlöse aus Nebenkostenabrechnung",                 type: "revenue" },
  { number: "4130", name: "Erlöse Garagen und Stellplätze",                   type: "revenue" },
  { number: "4190", name: "Sonstige Erlöse",                                  type: "revenue" },
  { number: "6220", name: "Abschreibungen auf Gebäude (AfA)",                 type: "expense" },
  { number: "6300", name: "Sonstige betriebliche Aufwendungen",               type: "expense" },
  { number: "6325", name: "Gas, Strom, Wasser",                               type: "expense" },
  { number: "6335", name: "Hausmeister, Reinigung, Gartenpflege",             type: "expense" },
  { number: "6400", name: "Versicherungen",                                   type: "expense" },
  { number: "6450", name: "Instandhaltung baulicher Anlagen",                 type: "expense" },
  { number: "6495", name: "Verwaltungskosten",                                type: "expense" },
  { number: "6825", name: "Rechts- und Beratungskosten",                      type: "expense" },
  { number: "6855", name: "Nebenkosten des Geldverkehrs",                     type: "expense" },
  { number: "7310", name: "Zinsaufwendungen",                                 type: "expense" },
  { number: "7680", name: "Grundsteuer und sonstige Steuern",                 type: "expense" },
  { number: "9000", name: "Saldenvorträge",                                   type: "equity" },
];

/** Bestandskonten, die in der Eröffnungsbilanz erfasst werden können. */
export const OPENING_ASSET_ACCOUNTS     = ["0215", "0240", "1200", "1800"];
export const OPENING_LIABILITY_ACCOUNTS = ["3150", "3300"];

const byNumber = new Map(ACCOUNTS.map(a => [a.number, a]));

export function account(no: string): Account {
  return byNumber.get(no) ?? { number: no, name: `Konto ${no}`, type: "expense" };
}

export function accountLabel(no: string): string {
  const a = account(no);
  return `${a.number} ${a.name}`;
}

/** Soll-Saldo ist der Normalsaldo für Aktiv- und Aufwandskonten. */
export function isDebitNormal(no: string): boolean {
  const t = account(no).type;
  return t === "asset" || t === "expense";
}

/** Map an operating-cost line key/name to its Aufwandskonto. */
export function expenseAccountFor(lineKey: string | undefined, name?: string): string {
  const k = `${lineKey ?? ""} ${name ?? ""}`.toLowerCase();
  if (/heiz|gas|strom|wasser|abwasser/.test(k))                      return "6325";
  if (/versicherung/.test(k))                                        return "6400";
  if (/grundsteuer/.test(k))                                         return "7680";
  if (/hausmeister|reinigung|garten|winterdienst|schornstein|müll|abfall/.test(k)) return "6335";
  if (/verwaltung/.test(k))                                          return "6495";
  if (/instandhaltung|reparatur|wartung/.test(k))                    return "6450";
  return "6300";
}

/** Map a tax-expense category (sonstige Werbungskosten) to its Aufwandskonto. */
export function taxExpenseAccountFor(category: string | undefined): string {
  const k = (category ?? "").toLowerCase();
  if (/steuerberat|rechts|beratung/.test(k)) return "6825";
  if (/konto/.test(k))                       return "6855";
  return "6300";
}
