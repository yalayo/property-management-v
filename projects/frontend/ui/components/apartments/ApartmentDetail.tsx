import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

const COST_LINES = [
  { id: "strom",        name: "Allgemeinstrom" },
  { id: "versicherung", name: "Versicherung" },
  { id: "grundsteuer",  name: "Grundsteuer" },
  { id: "muell",        name: "Müllabfuhr" },
  { id: "trinkwasser",  name: "Trinkwasser" },
] as const;

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

type Props = {
  apartment: any;
  properties?: any[];
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

export default function ApartmentDetail({
  apartment,
  properties = [],
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
  const [costInput, setCostInput] = useState<Record<string, string | null>>({});
  const [rentInput, setRentInput] = useState<Record<number, string | null>>({});

  useEffect(() => {
    if (apartment?.id) {
      onLoadAptCosts?.(apartment.id);
      onLoadRentPayments?.(apartment.id);
    }
  }, [apartment?.id]);

  useEffect(() => {
    setCostInput({});
    setRentInput({});
  }, [year]);

  const property = properties.find((p: any) => p.id === apartment?.["property-id"]);

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

  const commitCost = (line: { id: string; name: string }) => {
    const raw = costInput[line.id];
    if (raw == null) return;
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const existing = costEntryFor(line.id);
    if (existing) {
      onUpdateAptCost?.({ id: existing.id, value });
    } else {
      onAddAptCost?.({ apartmentId: apartment.id, line: line.id, name: line.name, year, value });
    }
    closeCostEdit(line.id);
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

  // ── Shared row renderer ───────────────────────────────────────────────────

  function CostRow({ line }: { line: { id: string; name: string } }) {
    const entry     = costEntryFor(line.id);
    const inherited = !entry ? inheritedCostFor(line.id) : null;
    const isEditing = costInput[line.id] != null;
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium">{line.name}</span>
        {isEditing ? (
          <>
            <Input autoFocus type="text" inputMode="decimal"
              value={costInput[line.id]!}
              onChange={e => setCostInput(prev => ({ ...prev, [line.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") commitCost(line); if (e.key === "Escape") closeCostEdit(line.id); }}
              className="w-36 h-7 text-sm text-right" />
            <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving} onClick={() => commitCost(line)}>{t("save")}</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.id)}>{t("cancel")}</Button>
          </>
        ) : entry ? (
          <>
            <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={aptCostsSaving} onClick={() => openCostEdit(line.id, String(entry.value))}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={aptCostsSaving} onClick={() => onDeleteAptCost?.(entry.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : inherited ? (
          <>
            <div className="w-28 text-right">
              <span className="tabular-nums text-muted-foreground">€{formatEur(Number(inherited.value))}</span>
              <span className="block text-xs text-muted-foreground/60">{inherited.year}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={aptCostsSaving} onClick={() => openCostEdit(line.id, String(inherited.value))}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <div className="w-7" />
          </>
        ) : (
          <>
            <span className="text-muted-foreground w-28 text-right">—</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => openCostEdit(line.id, "")}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <div className="w-7" />
          </>
        )}
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

  // ── Year nav (shared) ─────────────────────────────────────────────────────

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

      {/* Rent payments */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">{t("rentPayments")}</h3>
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

      {/* Cost allocations */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">{t("aptNebenkosten")}</h3>
        {aptCostsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              {COST_LINES.map(line => <CostRow key={line.id} line={line} />)}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
