// Automatic reconciliation of stored apartment-cost allocations.
//
// Verteiler/Anteil of saved cost entries derive from live attributes:
//   "Wohnfläche"      → property living area / apartment living area
//   "Anzahl Personen" → property person-days / tenant (or apartment) person-days
//   "Wohneinheiten"   → number of apartments in the property
// When those attributes change (Wohnfläche edited, residents-count updated,
// persons-change added/removed, tenant dates shifted, apartments added), the
// stored entries go stale. computeAptCostSyncUpdates() recomputes the expected
// values for every derived entry and returns updates for entries that differ,
// mirroring the exact formulas used in ApartmentView when entries are created.
// "Verbraucht" (consumed) and fixed-value entries are never touched.
//
// Year scoping: entries of the current or future years are always kept in
// sync. Entries of PAST years stay frozen unless the mutation explicitly
// targeted that year — components register such targeted edits via
// markCostSyncYear(year, schluessel?) (e.g. a Personenzahl-Änderung dated in
// 2023, or a Wohnfläche edit made while viewing 2023). Marks expire after a
// few minutes; they only need to survive until the store reloads.

type Tenant = any;
type PersonsChange = any;

const EPS = 0.005;

// ── Explicit past-year sync targets ─────────────────────────────────────────

const MARK_TTL_MS = 5 * 60 * 1000;
const dirtyMarks: { year: number; schluessel: string | null; at: number }[] = [];

/** Register that the user deliberately edited data for a (possibly past) year.
 *  Optional schluessel narrows the sync to entries using that key. */
export function markCostSyncYear(year: number, schluessel?: string) {
  if (!year || isNaN(year)) return;
  dirtyMarks.push({ year, schluessel: schluessel ?? null, at: Date.now() });
}

function isYearMarked(year: number, schluessel: string): boolean {
  const now = Date.now();
  for (let i = dirtyMarks.length - 1; i >= 0; i--) {
    if (now - dirtyMarks[i].at > MARK_TTL_MS) { dirtyMarks.splice(i, 1); continue; }
    const m = dirtyMarks[i];
    if (m.year === year && (m.schluessel === null || m.schluessel === schluessel)) return true;
  }
  return false;
}

/** Mark every year spanned by a tenant date correction (old ↔ new value).
 *  Date changes shift person-days and day-proration for all years between the
 *  two values, affecting every tenant of the property (shared Verteiler) — so
 *  the marks carry no Schlüssel restriction. An empty date means "open-ended"
 *  and is bounded by the current year. */
export function markCostSyncYearsForDateChange(oldDate?: string | null, newDate?: string | null) {
  const currentYear = new Date().getFullYear();
  const oy = parseYear(oldDate) ?? currentYear;
  const ny = parseYear(newDate) ?? currentYear;
  const from = Math.max(Math.min(oy, ny), currentYear - 10);
  const to   = Math.min(Math.max(oy, ny), currentYear);
  for (let y = from; y <= to; y++) markCostSyncYear(y);
}

function parseYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const y = parseInt(String(dateStr).slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

function tenantActiveInYear(tenant: Tenant, year: number): boolean {
  const sy = parseYear(tenant["start-date"]);
  const ey = parseYear(tenant["end-date"]);
  if (sy !== null && sy > year) return false;
  if (ey !== null && ey < year) return false;
  return true;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function tenantDaysInYear(tenant: Tenant, year: number): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const rawStart  = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const rawEnd    = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const effStart  = rawStart > yearStart ? rawStart : yearStart;
  const effEnd    = rawEnd   < yearEnd   ? rawEnd   : yearEnd;
  if (effStart > effEnd) return 0;
  return Math.round((effEnd.getTime() - effStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function dateStrDays(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000) + 1;
}

function previousDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function tenantPersonDaysWithChanges(tenant: Tenant, year: number, changes: PersonsChange[]): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const rawStart  = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const rawEnd    = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const effStart  = rawStart > yearStart ? rawStart : yearStart;
  const effEnd    = rawEnd   < yearEnd   ? rawEnd   : yearEnd;
  if (effStart > effEnd) return 0;

  const effStartStr = effStart.toISOString().split("T")[0];
  const effEndStr   = effEnd.toISOString().split("T")[0];
  const baseCount   = tenant["residents-count"] != null && !isNaN(Number(tenant["residents-count"]))
    ? Number(tenant["residents-count"]) : 0;

  const relevant = changes
    .filter((c: any) =>
      String(c["tenant-id"]) === String(tenant.id) &&
      Number(c.year) === year &&
      c["from-date"] > effStartStr &&
      c["from-date"] <= effEndStr
    )
    .sort((a: any, b: any) => a["from-date"].localeCompare(b["from-date"]));

  if (relevant.length === 0) return baseCount * dateStrDays(effStartStr, effEndStr);

  let total = 0;
  let cursor = effStartStr;
  let curCount = baseCount;
  for (const ch of relevant) {
    total += curCount * dateStrDays(cursor, previousDateStr(ch["from-date"]));
    cursor   = ch["from-date"];
    curCount = Number(ch.count);
  }
  total += curCount * dateStrDays(cursor, effEndStr);
  return total;
}

export type AptCostSyncInput = {
  properties: any[];
  apartments: any[];
  tenants: any[];
  personsChanges: any[];
  allAptCosts: any[];
  allCosts: any[];
  expenseTypes: any[];
};

export type AptCostUpdate = {
  id: string;
  value: number;
  verteiler: number;
  anteil: number;
  /** Change-specific key used to de-duplicate dispatches. */
  key: string;
};

/** Effective property cost total for a line/year: exact → latest past → earliest future. */
function propertyCostTotal(propertyCosts: any[], lineKey: string, year: number): number | null {
  const candidates = propertyCosts.filter((c: any) => c.line === lineKey);
  if (candidates.length === 0) return null;
  const exact = candidates.find((c: any) => Number(c.year) === year);
  if (exact) return Number(exact.value);
  const past = [...candidates]
    .filter((c: any) => Number(c.year) < year)
    .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0];
  if (past) return Number(past.value);
  const future = [...candidates].sort((a: any, b: any) => Number(a.year) - Number(b.year))[0];
  return future ? Number(future.value) : null;
}

export function computeAptCostSyncUpdates(input: AptCostSyncInput): AptCostUpdate[] {
  const { properties, apartments, tenants, personsChanges, allAptCosts, allCosts, expenseTypes } = input;
  const updates: AptCostUpdate[] = [];
  const currentYear = new Date().getFullYear();

  const aptById = new Map(apartments.map((a: any) => [String(a.id), a]));
  const methodByLine = new Map(expenseTypes.map((e: any) => [e.key, e["distribution-method"] ?? "living-area"]));

  const aptsOfProperty = (propertyId: string) =>
    apartments.filter((a: any) => String(a["property-id"] ?? a.property_id) === propertyId);

  const aptPersonDays = (aptId: string, year: number): number =>
    tenants
      .filter((tn: any) => String(tn["apartment-id"]) === aptId && tenantActiveInYear(tn, year))
      .reduce((sum: number, tn: any) => sum + tenantPersonDaysWithChanges(tn, year, personsChanges), 0);

  // Memoized property-level aggregates per (propertyId, year)
  const propPersonDaysCache = new Map<string, number>();
  const propertyPersonDays = (propertyId: string, year: number): number => {
    const k = `${propertyId}:${year}`;
    let v = propPersonDaysCache.get(k);
    if (v === undefined) {
      v = aptsOfProperty(propertyId).reduce((sum: number, a: any) => sum + aptPersonDays(String(a.id), year), 0);
      propPersonDaysCache.set(k, v);
    }
    return v;
  };

  for (const entry of allAptCosts) {
    const schl = entry.schluessel;
    if (schl !== "Wohnfläche" && schl !== "Anzahl Personen" && schl !== "Wohneinheiten") continue;

    const apt = aptById.get(String(entry["apartment-id"]));
    if (!apt) continue;
    const propertyId = String(apt["property-id"] ?? apt.property_id);
    const property = properties.find((p: any) => String(p.id) === propertyId);
    const year = Number(entry.year);
    if (!year) continue;

    // Closed years stay frozen unless the edit explicitly targeted this year
    if (year < currentYear && !isYearMarked(year, schl)) continue;

    // ── Expected Verteiler / Anteil per Schlüssel ─────────────────────────
    let newVerteiler: number;
    let newAnteil: number;

    if (schl === "Wohnfläche") {
      const propArea = property?.["living-area-m2"] != null && String(property["living-area-m2"]) !== ""
        ? Number(property["living-area-m2"])
        : aptsOfProperty(propertyId)
            .filter((a: any) => a.wohnflaeche != null)
            .reduce((sum: number, a: any) => sum + parseFloat(String(a.wohnflaeche)), 0);
      newVerteiler = propArea;
      newAnteil    = apt.wohnflaeche != null ? parseFloat(String(apt.wohnflaeche)) : NaN;
    } else if (schl === "Anzahl Personen") {
      newVerteiler = propertyPersonDays(propertyId, year);
      if (entry["tenant-id"] != null) {
        const tenant = tenants.find((tn: any) => String(tn.id) === String(entry["tenant-id"]));
        if (!tenant) continue;
        newAnteil = tenantPersonDaysWithChanges(tenant, year, personsChanges);
      } else {
        newAnteil = aptPersonDays(String(apt.id), year);
      }
    } else { // Wohneinheiten
      newVerteiler = aptsOfProperty(propertyId).length;
      newAnteil    = Number(entry.anteil ?? 1); // Anteil bleibt (i.d.R. 1)
    }

    // Never overwrite stored data with empty/zero derived values
    if (!isFinite(newVerteiler) || newVerteiler <= 0 || !isFinite(newAnteil) || newAnteil <= 0) continue;

    // ── Expected value (same formula as ApartmentView.calculateShare) ─────
    const propertyCosts = allCosts.filter((c: any) => String(c["property-id"]) === propertyId);
    const propTotal = propertyCostTotal(propertyCosts, entry.line, year);
    let newValue = Number(entry.value ?? 0);
    if (propTotal != null) {
      let share = (propTotal / newVerteiler) * newAnteil;
      const method = methodByLine.get(entry.line) ?? "living-area";
      if (method !== "person" && method !== "consumed" && entry["tenant-id"] != null) {
        const tenant = tenants.find((tn: any) => String(tn.id) === String(entry["tenant-id"]));
        if (tenant) {
          const yearDays = isLeapYear(year) ? 366 : 365;
          share = (share * tenantDaysInYear(tenant, year)) / yearDays;
        }
      }
      newValue = Math.round(share * 100) / 100;
    }

    const oldVerteiler = Number(entry.verteiler ?? 0);
    const oldAnteil    = Number(entry.anteil ?? 0);
    const oldValue     = Number(entry.value ?? 0);
    if (
      Math.abs(newVerteiler - oldVerteiler) > EPS ||
      Math.abs(newAnteil - oldAnteil) > EPS ||
      Math.abs(newValue - oldValue) > EPS
    ) {
      updates.push({
        id: String(entry.id),
        value: newValue,
        verteiler: newVerteiler,
        anteil: newAnteil,
        key: `${entry.id}:${newVerteiler}:${newAnteil}:${newValue}`,
      });
    }
  }

  return updates;
}
