import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const SCHLUESSEL_OPTIONS = ["Wohnfläche", "Verbraucht", "Anzahl Personen", "MEA"];

type Tenant = {
  id: string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  "apartment-id"?: string | number;
  "start-date"?: string;
  "end-date"?: string;
  kaltmiete?: number | string;
  "nebenkosten-warm"?: number | string;
};

type CostLine = { id: string; key: string; name?: string; "name-en"?: string; "name-de"?: string };

type CostEditFields = {
  value: string;
  verteiler: string;
  schluessel: string;
  anteil: string;
  fixedValue: boolean;
};

type Props = {
  apartment: any;
  properties?: any[];
  tenants?: Tenant[];
  expenseTypes?: CostLine[];
  aptCosts?: any[];
  aptCostsLoading?: boolean;
  aptCostsSaving?: boolean;
  onLoadAptCosts?: (apartmentId: string) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number; verteiler?: number; anteil?: number; schluessel?: string }) => void;
  onUpdateAptCost?: (data: { id: string; value: number; verteiler?: number; anteil?: number; schluessel?: string }) => void;
  onDeleteAptCost?: (id: string) => void;
  allCosts?: any[];
  rentPayments?: any[];
  rentLoading?: boolean;
  rentSaving?: boolean;
  onLoadRentPayments?: (apartmentId: string) => void;
  onAddRentPayment?: (data: { apartmentId: string; year: number; month: number; value: number; kaltmiete?: number; nebenkostenWarm?: number }) => void;
  onUpdateRentPayment?: (data: { id: string; value: number; kaltmiete?: number; nebenkostenWarm?: number }) => void;
  onDeleteRentPayment?: (id: string) => void;
  onBack: () => void;
};

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDateParts(dateStr: string | undefined): { year: number | null; month: number | null } {
  if (!dateStr) return { year: null, month: null };
  const parts = dateStr.split("-");
  const year  = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return { year: isNaN(year) ? null : year, month: isNaN(month) ? null : month };
}

function tenantActiveInYear(tenant: Tenant, year: number): boolean {
  const { year: sy } = parseDateParts(tenant["start-date"]);
  const { year: ey } = parseDateParts(tenant["end-date"]);
  if (sy !== null && sy > year) return false;
  if (ey !== null && ey < year) return false;
  return true;
}

function tenantMonthsInYear(tenant: Tenant, year: number): readonly number[] {
  const { year: sy, month: sm } = parseDateParts(tenant["start-date"]);
  const { year: ey, month: em } = parseDateParts(tenant["end-date"]);
  const startMonth = (sy === year && sm !== null) ? sm : 1;
  const endMonth   = (ey === year && em !== null) ? em : 12;
  return MONTHS.filter(m => m >= startMonth && m <= endMonth);
}

function tenantDisplayName(tenant: Tenant): string {
  if (tenant["first-name"]) return [tenant["first-name"], tenant["last-name"]].filter(Boolean).join(" ");
  return tenant.name ?? "";
}

function costLineName(line: CostLine, lang: string): string {
  return (lang.startsWith("de") ? line["name-de"] : line["name-en"]) ?? line.name ?? line.key ?? "";
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

export default function ApartmentDetail({
  apartment,
  properties = [],
  tenants = [],
  expenseTypes = [],
  aptCosts = [],
  aptCostsLoading,
  aptCostsSaving,
  onLoadAptCosts,
  onAddAptCost,
  onUpdateAptCost,
  onDeleteAptCost,
  allCosts = [],
  rentPayments = [],
  rentLoading,
  rentSaving,
  onLoadRentPayments,
  onAddRentPayment,
  onUpdateRentPayment,
  onDeleteRentPayment,
  onBack,
}: Props) {
  const { t, i18n } = useTranslation("costs");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 1;
  const [year, setYear] = useState(defaultYear);
  const [activeTenantTab, setActiveTenantTab] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<Record<string, CostEditFields | null>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [rentInput, setRentInput] = useState<Record<number, { kaltmiete: string; nebenkostenWarm: string } | null>>({});
  const [addLineOpen, setAddLineOpen] = useState(false);

  useEffect(() => {
    if (apartment?.id) {
      onLoadAptCosts?.(apartment.id);
      onLoadRentPayments?.(apartment.id);
    }
  }, [apartment?.id]);

  useEffect(() => {
    setCostInput({});
    setRentInput({});
    setSavingKeys(new Set());
    setActiveTenantTab(null);
  }, [year]);

  // Auto-close pending edits once aptCosts confirms the save
  const prevAptCostsRef = useRef(aptCosts);
  useEffect(() => {
    if (savingKeys.size === 0) return;
    const yearEntries = aptCosts.filter((c: any) => Number(c.year) === year);
    const nowSaved = [...savingKeys].filter(k => yearEntries.some((c: any) => c.line === k));
    if (nowSaved.length > 0) {
      setCostInput(prev => {
        const n = { ...prev };
        nowSaved.forEach(k => delete n[k]);
        return n;
      });
      setSavingKeys(prev => {
        const n = new Set(prev);
        nowSaved.forEach(k => n.delete(k));
        return n;
      });
    }
    prevAptCostsRef.current = aptCosts;
  }, [aptCosts, year, savingKeys]);

  const property = properties.find((p: any) => p.id === apartment?.["property-id"]);
  const costLines: CostLine[] = expenseTypes;

  // ── Tenant helpers ────────────────────────────────────────────────────────

  const aptTenants = tenants.filter(tn => String(tn["apartment-id"]) === String(apartment?.id));
  const yearTenants = aptTenants.filter(tn => tenantActiveInYear(tn, year));
  const selectedTenant = yearTenants.find(tn => tn.id === activeTenantTab) ?? yearTenants[0] ?? null;
  const visibleMonths: readonly number[] = selectedTenant ? tenantMonthsInYear(selectedTenant, year) : MONTHS;

  // ── Property cost lookup + share calculation ─────────────────────────────

  const propertyCosts = React.useMemo(() => {
    if (!apartment?.["property-id"]) return [];
    return allCosts.filter((c: any) => String(c["property-id"]) === String(apartment["property-id"]));
  }, [allCosts, apartment?.["property-id"]]);

  const getPropertyCostTotal = (lineKey: string): number | null => {
    const exact = propertyCosts.find((c: any) => c.line === lineKey && Number(c.year) === year);
    if (exact) return Number(exact.value);
    const inherited = [...propertyCosts]
      .filter((c: any) => c.line === lineKey && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0];
    return inherited ? Number(inherited.value) : null;
  };

  const calculateShare = (lineKey: string, verteilerStr: string, anteilStr: string): string => {
    const propTotal = getPropertyCostTotal(lineKey);
    const v = parseFloat(verteilerStr.replace(",", "."));
    const a = parseFloat(anteilStr.replace(",", "."));
    if (propTotal == null || isNaN(v) || v === 0 || isNaN(a) || a === 0) return "";
    const fullShare = (propTotal / v) * a;
    const yearDays = isLeapYear(year) ? 366 : 365;
    const tDays = selectedTenant ? tenantDaysInYear(selectedTenant, year) : yearDays;
    const value = tDays < yearDays ? fullShare * (tDays / yearDays) : fullShare;
    return value.toFixed(2);
  };

  // ── Cost helpers ──────────────────────────────────────────────────────────

  const yearCostEntries = aptCosts.filter((c: any) => Number(c.year) === year);
  const savedKeys = yearCostEntries.map((c: any) => c.line as string);

  const costEntryFor = (lineId: string) =>
    yearCostEntries.find((c: any) => c.line === lineId) ?? null;

  const inheritedCostFor = (lineId: string) =>
    [...aptCosts]
      .filter((c: any) => c.line === lineId && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;

  const openCostEdit = (lineId: string, fields: CostEditFields) =>
    setCostInput(prev => ({ ...prev, [lineId]: fields }));

  const closeCostEdit = (lineId: string) =>
    setCostInput(prev => { const n = { ...prev }; delete n[lineId]; return n; });

  const commitCost = (lineKey: string) => {
    const fields = costInput[lineKey];
    if (!fields) return;
    const value = parseFloat(fields.value.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const verteilerVal = parseFloat(fields.verteiler.replace(",", "."));
    const anteilVal = parseFloat(fields.anteil.replace(",", "."));
    const payload = {
      value,
      verteiler: isNaN(verteilerVal) ? undefined : verteilerVal,
      anteil:    isNaN(anteilVal)    ? undefined : anteilVal,
      schluessel: fields.schluessel.trim() || undefined,
    };
    const existing = costEntryFor(lineKey);
    if (existing) {
      onUpdateAptCost?.({ id: existing.id, ...payload });
      closeCostEdit(lineKey);
    } else {
      const line = costLines.find(l => l.key === lineKey);
      if (!line) return;
      onAddAptCost?.({ apartmentId: apartment.id, line: lineKey, name: costLineName(line, i18n.language), year, ...payload });
      setSavingKeys(prev => new Set([...prev, lineKey]));
    }
    toast({ title: tCommon("saved") });
  };

  // ── Ordering: active lines follow aptCosts insertion order ────────────────

  const pendingKeys = [...savingKeys].filter(k => !savedKeys.includes(k));
  const editingNewKeys = Object.keys(costInput).filter(k => costInput[k] != null && !savedKeys.includes(k) && !savingKeys.has(k));
  const activeCostLines = [
    ...savedKeys.map(k => costLines.find(l => l.key === k)),
    ...pendingKeys.map(k => costLines.find(l => l.key === k)),
    ...editingNewKeys.map(k => costLines.find(l => l.key === k)),
  ].filter(Boolean) as CostLine[];

  const availableCostLines = costLines.filter(l => !savedKeys.includes(l.key) && costInput[l.key] == null && !savingKeys.has(l.key));

  const handleSelectCostLine = (key: string) => {
    const line = costLines.find(l => l.key === key);
    if (!line) return;
    const inherited      = inheritedCostFor(line.key);
    const defaultVert    = inherited?.verteiler != null ? String(inherited.verteiler) : "100";
    const defaultAnteil  = inherited?.anteil    != null ? String(inherited.anteil)    : "";
    const defaultValue   = inherited
      ? String(inherited.value)
      : calculateShare(key, defaultVert, defaultAnteil);
    openCostEdit(line.key, {
      value:      defaultValue,
      verteiler:  defaultVert,
      schluessel: String(inherited?.schluessel ?? "Wohnfläche"),
      anteil:     defaultAnteil,
      fixedValue: false,
    });
    setAddLineOpen(false);
  };

  const prevCostLinesToCopy = availableCostLines.filter(l => inheritedCostFor(l.key));

  const copyPrevYearCosts = () => {
    prevCostLinesToCopy.forEach(line => {
      const prev = inheritedCostFor(line.key);
      if (prev) {
        onAddAptCost?.({
          apartmentId: apartment.id,
          line: line.key,
          name: costLineName(line, i18n.language),
          year,
          value:      Number(prev.value),
          verteiler:  prev.verteiler != null ? Number(prev.verteiler) : undefined,
          anteil:     prev.anteil != null    ? Number(prev.anteil)    : undefined,
          schluessel: prev.schluessel || undefined,
        });
      }
    });
  };

  // ── Rent helpers ──────────────────────────────────────────────────────────

  const rentEntryFor = (month: number) =>
    rentPayments.find((r: any) => Number(r.month) === month && Number(r.year) === year) ?? null;

  const openRentEdit = (month: number, entry?: any) => {
    const storedKalt = entry?.kaltmiete;
    const storedNk   = entry?.["nebenkosten-warm"];
    if (storedKalt != null) {
      setRentInput(prev => ({ ...prev, [month]: {
        kaltmiete: Number(storedKalt).toFixed(2),
        nebenkostenWarm: storedNk != null ? Number(storedNk).toFixed(2) : "",
      }}));
    } else if (entry != null) {
      const initialTotal = Number(entry.value);
      const tenantKalt = parseFloat(String(selectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
      const tenantNk   = parseFloat(String(selectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
      if ((tenantKalt + tenantNk).toFixed(2) === initialTotal.toFixed(2)) {
        setRentInput(prev => ({ ...prev, [month]: { kaltmiete: tenantKalt.toFixed(2), nebenkostenWarm: tenantNk.toFixed(2) } }));
      } else {
        setRentInput(prev => ({ ...prev, [month]: { kaltmiete: initialTotal.toFixed(2), nebenkostenWarm: "" } }));
      }
    } else {
      setRentInput(prev => ({ ...prev, [month]: { kaltmiete: "", nebenkostenWarm: "" } }));
    }
  };

  const closeRentEdit = (month: number) =>
    setRentInput(prev => { const n = { ...prev }; delete n[month]; return n; });

  const commitRent = (month: number) => {
    const fields = rentInput[month];
    if (fields == null) return;
    const kalt = parseFloat(fields.kaltmiete.replace(",", ".")) || 0;
    const nk   = parseFloat(fields.nebenkostenWarm.replace(",", ".")) || 0;
    const value = kalt + nk;
    if (value <= 0) return;
    const existing = rentEntryFor(month);
    if (existing) {
      onUpdateRentPayment?.({ id: existing.id, value, kaltmiete: kalt, nebenkostenWarm: nk });
    } else {
      onAddRentPayment?.({ apartmentId: apartment.id, year, month, value, kaltmiete: kalt, nebenkostenWarm: nk });
    }
    closeRentEdit(month);
    toast({ title: tCommon("saved") });
  };

  const monthName = (m: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(new Date(2024, m - 1, 1));

  const prevRentMonthsToCopy = MONTHS.filter(m => {
    const prev = rentPayments.find((r: any) => Number(r.month) === m && Number(r.year) === year - 1);
    return prev && !rentEntryFor(m);
  });

  const copyPrevYearRent = () => {
    prevRentMonthsToCopy.forEach(month => {
      const prev = rentPayments.find((r: any) => Number(r.month) === month && Number(r.year) === year - 1);
      if (prev) onAddRentPayment?.({
        apartmentId: apartment.id, year, month, value: Number(prev.value),
        ...(prev.kaltmiete != null && { kaltmiete: Number(prev.kaltmiete) }),
        ...(prev["nebenkosten-warm"] != null && { nebenkostenWarm: Number(prev["nebenkosten-warm"]) }),
      });
    });
  };

  // ── Row renderers ─────────────────────────────────────────────────────────

  const CostRow = ({ line }: { line: CostLine }) => {
    const entry    = costEntryFor(line.key);
    const fields   = costInput[line.key];
    const isSaving = savingKeys.has(line.key);
    const isEditing = fields != null && !isSaving;
    const name = costLineName(line, i18n.language);

    if (isSaving) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 opacity-60">
          <span className="flex-1 font-medium">{name}</span>
          <span className="text-xs text-muted-foreground italic">{t("save")}…</span>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="px-4 py-3 text-sm border-b last:border-b-0 space-y-3">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{name}</p>
          {!fields.fixedValue && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("verteiler")}</label>
              <Input
                type="text"
                inputMode="decimal"
                value={fields.verteiler}
                onChange={e => {
                  const val = e.target.value;
                  const calc = calculateShare(line.key, val, fields!.anteil);
                  setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, verteiler: val, ...(calc ? { value: calc } : {}) } }));
                }}
                onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                className="h-7 text-sm text-right"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("schluessel")}</label>
              <Input
                type="text"
                list={`schluessel-opts-${line.key}`}
                value={fields.schluessel}
                onChange={e => setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, schluessel: e.target.value } }))}
                onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                className="h-7 text-sm"
              />
              <datalist id={`schluessel-opts-${line.key}`}>
                {SCHLUESSEL_OPTIONS.map(o => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("anteil")}</label>
              <Input
                type="text"
                inputMode="decimal"
                value={fields.anteil}
                onChange={e => {
                  const val = e.target.value;
                  const calc = calculateShare(line.key, fields!.verteiler, val);
                  setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, anteil: val, ...(calc ? { value: calc } : {}) } }));
                }}
                onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                className="h-7 text-sm text-right"
              />
            </div>
          </div>}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`fixed-${line.key}`}
              checked={fields.fixedValue}
              onCheckedChange={checked =>
                setCostInput(prev => ({
                  ...prev,
                  [line.key]: {
                    ...prev[line.key]!,
                    fixedValue: !!checked,
                    ...(checked ? {} : { value: calculateShare(line.key, prev[line.key]!.verteiler, prev[line.key]!.anteil) || "" }),
                  },
                }))
              }
            />
            <label htmlFor={`fixed-${line.key}`} className="text-xs text-muted-foreground cursor-pointer select-none">
              {t("fixedValue")}
            </label>
          </div>
          {fields.fixedValue ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("gesamtkosten")} (€)</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={fields.value}
                  onChange={e => setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, value: e.target.value } }))}
                  onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                  className="h-7 text-sm text-right w-32"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving || !fields.value} onClick={() => commitCost(line.key)}>{t("save")}</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.key)}>{t("cancel")}</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {t("gesamtkosten")}:{" "}
                <span className="font-semibold text-foreground">
                  {fields.value ? `€ ${parseFloat(fields.value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving || !fields.value} onClick={() => commitCost(line.key)}>{t("save")}</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.key)}>{t("cancel")}</Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium min-w-0 truncate">{name}</span>
        {entry ? (
          <>
            <span className="tabular-nums text-right w-24 shrink-0">€{formatEur(Number(entry.value))}</span>
            <span className="tabular-nums text-right w-10 shrink-0 text-muted-foreground text-xs">{entry.verteiler ?? "—"}</span>
            <span className="w-20 shrink-0 text-muted-foreground text-xs truncate">{entry.schluessel ?? "—"}</span>
            <span className="tabular-nums text-right w-10 shrink-0 text-xs font-medium">{entry.anteil ?? "—"}</span>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={aptCostsSaving}
              onClick={() => openCostEdit(line.key, {
                value:      String(entry.value),
                verteiler:  entry.verteiler != null ? String(entry.verteiler) : "",
                schluessel: String(entry.schluessel ?? ""),
                anteil:     entry.anteil != null ? String(entry.anteil) : "",
                fixedValue: false,
              })}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={aptCostsSaving} onClick={() => { onDeleteAptCost?.(entry.id); toast({ title: tCommon("deleted") }); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>
    );
  };

  const RentRow = ({ month }: { month: number }) => {
    const entry      = rentEntryFor(month);
    const fields     = rentInput[month];
    const isEditing  = fields != null;
    const tenantKalt = parseFloat(String(selectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
    const tenantNk   = parseFloat(String(selectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
    const hasTenant  = selectedTenant != null;

    if (isEditing) {
      const kalt  = parseFloat(fields!.kaltmiete.replace(",", ".")) || 0;
      const nk    = parseFloat(fields!.nebenkostenWarm.replace(",", ".")) || 0;
      const total = kalt + nk;
      return (
        <div className="flex items-center gap-2 px-4 py-3 text-sm border-b last:border-b-0">
          <span className="font-medium capitalize shrink-0">{monthName(month)}</span>
          <Input autoFocus type="text" inputMode="decimal"
            placeholder={t("rent.kaltmiete")}
            value={fields!.kaltmiete}
            onChange={e => setRentInput(prev => ({ ...prev, [month]: { ...prev[month]!, kaltmiete: e.target.value } }))}
            onKeyDown={e => { if (e.key === "Enter") commitRent(month); if (e.key === "Escape") closeRentEdit(month); }}
            className="h-7 text-sm text-right flex-1 min-w-0" />
          <Input type="text" inputMode="decimal"
            placeholder={t("rent.nebenkostenWarm")}
            value={fields!.nebenkostenWarm}
            onChange={e => setRentInput(prev => ({ ...prev, [month]: { ...prev[month]!, nebenkostenWarm: e.target.value } }))}
            onKeyDown={e => { if (e.key === "Enter") commitRent(month); if (e.key === "Escape") closeRentEdit(month); }}
            className="h-7 text-sm text-right flex-1 min-w-0" />
          {total > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground shrink-0 whitespace-nowrap">
              = € {total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {hasTenant && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0"
              onClick={() => setRentInput(prev => ({ ...prev, [month]: { kaltmiete: tenantKalt > 0 ? tenantKalt.toFixed(2) : "", nebenkostenWarm: tenantNk > 0 ? tenantNk.toFixed(2) : "" } }))}>
              {t("fillFromTenant")}
            </Button>
          )}
          <Button size="sm" className="h-7 px-3 shrink-0" disabled={rentSaving || total <= 0} onClick={() => commitRent(month)}>{t("save")}</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => closeRentEdit(month)}>{t("cancel")}</Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium capitalize">{monthName(month)}</span>
        {entry ? (
          <>
            <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={rentSaving} onClick={() => openRentEdit(month, entry)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={rentSaving} onClick={() => { onDeleteRentPayment?.(entry.id); toast({ title: tCommon("deleted") }); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground w-28 text-right">—</span>
            {hasTenant ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title={t("fillFromTenant")} disabled={rentSaving || tenantKalt + tenantNk <= 0}
                onClick={() => {
                  const value = tenantKalt + tenantNk;
                  if (value > 0) { onAddRentPayment?.({ apartmentId: apartment.id, year, month, value, kaltmiete: tenantKalt, nebenkostenWarm: tenantNk }); toast({ title: tCommon("saved") }); }
                }}>
                <UserCheck className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="w-7" />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => openRentEdit(month)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    );
  };

  const YearNav = () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className={`min-w-[3rem] text-center text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
        year !== defaultYear
          ? "border-amber-400 bg-amber-50 text-amber-800"
          : "border-transparent text-foreground"
      }`}>{year}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const YearBanner = () => year !== defaultYear ? (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <CalendarClock className="h-4 w-4 shrink-0" />
      <span className="flex-1">{t(year < defaultYear ? "yearBanner.past" : "yearBanner.future", { year })}</span>
      <button
        className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap hover:text-amber-900"
        onClick={() => setYear(defaultYear)}
      >
        {t("yearBanner.returnTo", { year: defaultYear })}
      </button>
    </div>
  ) : null;

  const tenantDateRange = (tn: Tenant) => {
    const sd = tn["start-date"];
    const ed = tn["end-date"];
    if (sd && ed) return `${sd} – ${ed}`;
    if (sd)       return `${sd} →`;
    return "";
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!apartment) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <h2 className="text-xl font-bold">{apartment.code}</h2>
        </div>
        <YearNav />
      </div>
      <YearBanner />

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("aptCode")}</p>
            <p>{apartment.code}</p>
          </div>
          {property && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("property")}</p>
              <p>{property.name}</p>
            </div>
          )}
          {property?.address && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("address")}</p>
              <p>{property.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {yearTenants.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          {t("noTenantsInYear", { year, defaultValue: `No tenants in ${year}` })}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {/* Tenant tab bar */}
          <div className="flex border-b overflow-x-auto bg-muted/30">
            {yearTenants.map((tn) => (
              <button
                key={tn.id}
                type="button"
                className={`flex-1 min-w-0 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                  selectedTenant?.id === tn.id
                    ? "bg-background border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
                onClick={() => { setActiveTenantTab(tn.id); setCostInput({}); setRentInput({}); }}
              >
                <span className="truncate block">{tenantDisplayName(tn)}</span>
                {tenantDateRange(tn) && (
                  <span className="block text-xs font-normal text-muted-foreground truncate">{tenantDateRange(tn)}</span>
                )}
              </button>
            ))}
          </div>

          {selectedTenant && (
            <div className="p-4 space-y-6">

              {/* Rent payments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{t("rentPayments")}</h3>
                  {prevRentMonthsToCopy.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={rentSaving} onClick={copyPrevYearRent}>
                      <Copy className="h-3 w-3 mr-1.5" />
                      {t("copyFromYear", { year: year - 1 })}
                    </Button>
                  )}
                </div>
                {rentLoading ? (
                  <p className="text-sm text-muted-foreground">{t("loading")}</p>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {visibleMonths.map(m => <React.Fragment key={m}>{RentRow({ month: m })}</React.Fragment>)}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Cost allocations */}
              {costLines.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{t("aptNebenkosten")}</h3>
                    {prevCostLinesToCopy.length > 0 && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={aptCostsSaving} onClick={copyPrevYearCosts}>
                        <Copy className="h-3 w-3 mr-1.5" />
                        {t("copyFromYear", { year: year - 1 })}
                      </Button>
                    )}
                  </div>
                  {aptCostsLoading ? (
                    <p className="text-sm text-muted-foreground">{t("loading")}</p>
                  ) : (
                    <div className="space-y-2">
                      {activeCostLines.length > 0 && (
                        <Card>
                          {/* Table header */}
                          <div className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
                            <span className="flex-1">{/* name */}</span>
                            <span className="w-24 text-right">{t("gesamtkosten")}</span>
                            <span className="w-10 text-right">{t("verteiler")}</span>
                            <span className="w-20">{t("schluessel")}</span>
                            <span className="w-10 text-right">{t("anteil")}</span>
                            <span className="w-16" />
                          </div>
                          <CardContent className="p-0">
                            {activeCostLines.map(line => <React.Fragment key={line.id}>{CostRow({ line })}</React.Fragment>)}
                          </CardContent>
                        </Card>
                      )}
                      {availableCostLines.length > 0 && (
                        <Popover open={addLineOpen} onOpenChange={setAddLineOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-8 border-dashed text-sm text-muted-foreground justify-start font-normal">
                              <Plus className="h-3.5 w-3.5 mr-2" />
                              {t("addCostLine")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t("searchCostLine")} />
                              <CommandList>
                                <CommandEmpty>{t("noMatchCostLine")}</CommandEmpty>
                                <CommandGroup>
                                  {availableCostLines.map(line => (
                                    <CommandItem
                                      key={line.id}
                                      value={costLineName(line, i18n.language)}
                                      onSelect={() => handleSelectCostLine(line.key)}
                                    >
                                      {costLineName(line, i18n.language)}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
