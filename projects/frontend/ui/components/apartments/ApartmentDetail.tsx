import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type Tenant = {
  id: string;
  name: string;
  "apartment-id"?: string | number;
  "start-date"?: string;
  "end-date"?: string;
};

type CostLine = { id: string; key: string; name: string };


type Props = {
  apartment: any;
  properties?: any[];
  tenants?: Tenant[];
  expenseTypes?: CostLine[];
  // cost allocation props
  aptCosts?: any[];
  aptCostsLoading?: boolean;
  aptCostsSaving?: boolean;
  onLoadAptCosts?: (apartmentId: string) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number }) => void;
  onUpdateAptCost?: (data: { id: string; value: number }) => void;
  onDeleteAptCost?: (id: string) => void;
  // rent payment props
  rentPayments?: any[];
  rentLoading?: boolean;
  rentSaving?: boolean;
  onLoadRentPayments?: (apartmentId: string) => void;
  onAddRentPayment?: (data: { apartmentId: string; year: number; month: number; value: number }) => void;
  onUpdateRentPayment?: (data: { id: string; value: number }) => void;
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
  return {
    year:  isNaN(year)  ? null : year,
    month: isNaN(month) ? null : month,
  };
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTenantTab, setActiveTenantTab] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<Record<string, string | null>>({});
  const [rentInput, setRentInput] = useState<Record<number, string | null>>({});
  const [costSelectKey, setCostSelectKey] = useState(0);

  useEffect(() => {
    if (apartment?.id) {
      onLoadAptCosts?.(apartment.id);
      onLoadRentPayments?.(apartment.id);
    }
  }, [apartment?.id]);

  useEffect(() => {
    setCostInput({});
    setRentInput({});
    setActiveTenantTab(null);
  }, [year]);

  const property = properties.find((p: any) => p.id === apartment?.["property-id"]);
  const costLines: CostLine[] = expenseTypes;

  // ── Tenant helpers ────────────────────────────────────────────────────────

  const aptTenants = tenants.filter(
    (tn) => String(tn["apartment-id"]) === String(apartment?.id)
  );
  const yearTenants = aptTenants.filter((tn) => tenantActiveInYear(tn, year));
  const selectedTenant =
    yearTenants.find((tn) => tn.id === activeTenantTab) ?? yearTenants[0] ?? null;
  const visibleMonths: readonly number[] = selectedTenant
    ? tenantMonthsInYear(selectedTenant, year)
    : MONTHS;

  // ── Cost helpers ──────────────────────────────────────────────────────────

  const costEntryFor = (lineId: string) =>
    aptCosts.find((c: any) => c.line === lineId && Number(c.year) === year) ?? null;

  const inheritedCostFor = (lineId: string) =>
    [...aptCosts]
      .filter((c: any) => c.line === lineId && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;

  const openCostEdit = (lineId: string, initial: string) =>
    setCostInput(prev => ({ ...prev, [lineId]: initial }));

  const closeCostEdit = (lineId: string) =>
    setCostInput(prev => { const n = { ...prev }; delete n[lineId]; return n; });

  const commitCost = (line: CostLine) => {
    const raw = costInput[line.key];
    if (raw == null) return;
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const existing = costEntryFor(line.key);
    if (existing) {
      onUpdateAptCost?.({ id: existing.id, value });
    } else {
      onAddAptCost?.({ apartmentId: apartment.id, line: line.key, name: line.name, year, value });
    }
    closeCostEdit(line.key);
  };

  // ── Rent helpers ──────────────────────────────────────────────────────────

  const rentEntryFor = (month: number) =>
    rentPayments.find((r: any) => Number(r.month) === month && Number(r.year) === year) ?? null;

  const openRentEdit = (month: number, initial: string) =>
    setRentInput(prev => ({ ...prev, [month]: initial }));

  const closeRentEdit = (month: number) =>
    setRentInput(prev => { const n = { ...prev }; delete n[month]; return n; });

  const commitRent = (month: number) => {
    const raw = rentInput[month];
    if (raw == null) return;
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const existing = rentEntryFor(month);
    if (existing) {
      onUpdateRentPayment?.({ id: existing.id, value });
    } else {
      onAddRentPayment?.({ apartmentId: apartment.id, year, month, value });
    }
    closeRentEdit(month);
  };

  const monthName = (m: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(new Date(2024, m - 1, 1));

  // ── Copy-from-previous-year ───────────────────────────────────────────────

  const activeCostLines = costLines.filter(l => costEntryFor(l.key) || costInput[l.key] != null);
  const availableCostLines = costLines.filter(l => !costEntryFor(l.key) && costInput[l.key] == null);

  const handleSelectCostLine = (key: string) => {
    const line = costLines.find(l => l.key === key);
    if (!line) return;
    const inherited = inheritedCostFor(line.key);
    openCostEdit(line.key, inherited ? String(inherited.value) : "");
    setCostSelectKey(k => k + 1);
  };

  const prevCostLinesToCopy = availableCostLines.filter(l => inheritedCostFor(l.key));

  const copyPrevYearCosts = () => {
    prevCostLinesToCopy.forEach(line => {
      const prev = inheritedCostFor(line.key);
      if (prev) {
        onAddAptCost?.({ apartmentId: apartment.id, line: line.key, name: line.name, year, value: Number(prev.value) });
      }
    });
  };

  const prevRentMonthsToCopy = MONTHS.filter(m => {
    const prev = rentPayments.find((r: any) => Number(r.month) === m && Number(r.year) === year - 1);
    return prev && !rentEntryFor(m);
  });

  const copyPrevYearRent = () => {
    prevRentMonthsToCopy.forEach(month => {
      const prev = rentPayments.find((r: any) => Number(r.month) === month && Number(r.year) === year - 1);
      if (prev) {
        onAddRentPayment?.({ apartmentId: apartment.id, year, month, value: Number(prev.value) });
      }
    });
  };

  // ── Row renderers ─────────────────────────────────────────────────────────

  function CostRow({ line }: { line: CostLine }) {
    const entry     = costEntryFor(line.key);
    const isEditing = costInput[line.key] != null;
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium">{line.name}</span>
        {isEditing ? (
          <>
            <Input autoFocus type="text" inputMode="decimal"
              value={costInput[line.key]!}
              onChange={e => setCostInput(prev => ({ ...prev, [line.key]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") commitCost(line); if (e.key === "Escape") closeCostEdit(line.key); }}
              className="w-36 h-7 text-sm text-right" />
            <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving} onClick={() => commitCost(line)}>{t("save")}</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.key)}>{t("cancel")}</Button>
          </>
        ) : entry ? (
          <>
            <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={aptCostsSaving} onClick={() => openCostEdit(line.key, String(entry.value))}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={aptCostsSaving} onClick={() => onDeleteAptCost?.(entry.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  function RentRow({ month }: { month: number }) {
    const entry     = rentEntryFor(month);
    const isEditing = rentInput[month] != null;
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium capitalize">{monthName(month)}</span>
        {isEditing ? (
          <>
            <Input autoFocus type="text" inputMode="decimal"
              value={rentInput[month]!}
              onChange={e => setRentInput(prev => ({ ...prev, [month]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") commitRent(month); if (e.key === "Escape") closeRentEdit(month); }}
              className="w-36 h-7 text-sm text-right" />
            <Button size="sm" className="h-7 px-3" disabled={rentSaving} onClick={() => commitRent(month)}>{t("save")}</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeRentEdit(month)}>{t("cancel")}</Button>
          </>
        ) : entry ? (
          <>
            <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={rentSaving} onClick={() => openRentEdit(month, String(entry.value))}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={rentSaving} onClick={() => onDeleteRentPayment?.(entry.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground w-28 text-right">—</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => openRentEdit(month, "")}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <div className="w-7" />
          </>
        )}
      </div>
    );
  }

  // ── Year nav ──────────────────────────────────────────────────────────────

  const YearNav = () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="w-12 text-center text-sm font-medium tabular-nums">{year}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // ── Tenant date range label ───────────────────────────────────────────────

  const tenantDateRange = (tn: Tenant) => {
    const sd = tn["start-date"];
    const ed = tn["end-date"];
    if (sd && ed) return `${sd} – ${ed}`;
    if (sd)       return `${sd} →`;
    return "";
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + header */}
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

      {/* Apartment info */}
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

      {/* Tenant tabs + content */}
      {yearTenants.length === 0 ? (
        <>
          {/* No tenants for this year — show full-year view */}
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
                  {MONTHS.map(m => <RentRow key={m} month={m} />)}
                </CardContent>
              </Card>
            )}
          </div>

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
                      <CardContent className="p-0">
                        {activeCostLines.map(line => <CostRow key={line.id} line={line} />)}
                      </CardContent>
                    </Card>
                  )}
                  {availableCostLines.length > 0 && (
                    <Select key={costSelectKey} onValueChange={handleSelectCostLine}>
                      <SelectTrigger className="h-8 text-sm text-muted-foreground border-dashed">
                        <SelectValue placeholder={t("addCostLine")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCostLines.map(line => (
                          <SelectItem key={line.id} value={line.key}>{line.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {/* Tab bar */}
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
                onClick={() => {
                  setActiveTenantTab(tn.id);
                  setCostInput({});
                  setRentInput({});
                }}
              >
                <span className="truncate block">{tn.name}</span>
                {tenantDateRange(tn) && (
                  <span className="block text-xs font-normal text-muted-foreground truncate">
                    {tenantDateRange(tn)}
                  </span>
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
                      {visibleMonths.map(m => <RentRow key={m} month={m} />)}
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
                          <CardContent className="p-0">
                            {activeCostLines.map(line => <CostRow key={line.id} line={line} />)}
                          </CardContent>
                        </Card>
                      )}
                      {availableCostLines.length > 0 && (
                        <Select key={costSelectKey} onValueChange={handleSelectCostLine}>
                          <SelectTrigger className="h-8 text-sm text-muted-foreground border-dashed">
                            <SelectValue placeholder={t("addCostLine")} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCostLines.map(line => (
                              <SelectItem key={line.id} value={line.key}>{line.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
