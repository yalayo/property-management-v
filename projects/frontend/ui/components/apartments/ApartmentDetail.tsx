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

type Props = {
  apartment: any;
  properties?: any[];
  aptCosts?: any[];
  aptCostsLoading?: boolean;
  aptCostsSaving?: boolean;
  onLoadAptCosts?: (apartmentId: string) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number }) => void;
  onUpdateAptCost?: (data: { id: string; value: number }) => void;
  onDeleteAptCost?: (id: string) => void;
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
  onBack,
}: Props) {
  const { t } = useTranslation("costs");
  const [year, setYear] = useState(new Date().getFullYear());
  const [inputState, setInputState] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (apartment?.id && onLoadAptCosts) onLoadAptCosts(apartment.id);
  }, [apartment?.id]);

  useEffect(() => { setInputState({}); }, [year]);

  const property = properties.find((p: any) => p.id === apartment?.["property-id"]);

  const entryFor = (lineId: string) =>
    aptCosts.find((c: any) => c.line === lineId && Number(c.year) === year) ?? null;

  const openEdit = (lineId: string, initial: string) =>
    setInputState(prev => ({ ...prev, [lineId]: initial }));

  const closeEdit = (lineId: string) =>
    setInputState(prev => { const n = { ...prev }; delete n[lineId]; return n; });

  const commit = (line: { id: string; name: string }) => {
    const raw = inputState[line.id];
    if (raw == null) return;
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value <= 0) return;

    const existing = entryFor(line.id);
    if (existing) {
      onUpdateAptCost?.({ id: existing.id, value });
    } else {
      onAddAptCost?.({ apartmentId: apartment.id, line: line.id, name: line.name, year, value });
    }
    closeEdit(line.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, line: { id: string; name: string }) => {
    if (e.key === "Enter") commit(line);
    if (e.key === "Escape") closeEdit(line.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>
        <h2 className="text-xl font-bold">{apartment.code}</h2>
      </div>

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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("aptNebenkosten")}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-sm font-medium tabular-nums">{year}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {aptCostsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              {COST_LINES.map((line, idx) => {
                const entry     = entryFor(line.id);
                const isEditing = inputState[line.id] != null;
                const isLast    = idx === COST_LINES.length - 1;

                return (
                  <div
                    key={line.id}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${!isLast ? "border-b" : ""}`}
                  >
                    <span className="flex-1 font-medium">{line.name}</span>

                    {isEditing ? (
                      <>
                        <Input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          value={inputState[line.id]!}
                          onChange={e => setInputState(prev => ({ ...prev, [line.id]: e.target.value }))}
                          onKeyDown={e => handleKeyDown(e, line)}
                          className="w-36 h-7 text-sm text-right"
                        />
                        <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving} onClick={() => commit(line)}>
                          {t("save")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeEdit(line.id)}>
                          {t("cancel")}
                        </Button>
                      </>
                    ) : entry ? (
                      <>
                        <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={aptCostsSaving}
                          onClick={() => openEdit(line.id, String(entry.value))}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={aptCostsSaving}
                          onClick={() => onDeleteAptCost?.(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground w-28 text-right">—</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(line.id, "")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-7" />
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
