import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

const COST_LINES = [
  { id: "strom",        name: "Allgemeinstrom" },
  { id: "versicherung", name: "Versicherung" },
  { id: "grundsteuer",  name: "Grundsteuer" },
  { id: "muell",        name: "Müllabfuhr" },
  { id: "trinkwasser",  name: "Trinkwasser" },
] as const;

type Props = {
  property: any;
  costs?: any[];
  costsLoading?: boolean;
  costsSaving?: boolean;
  onLoadCosts?: (propertyId: string) => void;
  onAddCost?: (data: { propertyId: string; line: string; name: string; year: number; value: number }) => void;
  onUpdateCost?: (data: { id: string; value: number }) => void;
  onDeleteCost?: (id: string) => void;
  onBack: () => void;
};

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PropertyDetail({
  property,
  costs = [],
  costsLoading,
  costsSaving,
  onLoadCosts,
  onAddCost,
  onUpdateCost,
  onDeleteCost,
  onBack,
}: Props) {
  const { t } = useTranslation("costs");
  const [year, setYear]       = useState(new Date().getFullYear());
  // inputState: lineId → current string being typed, or null = row not in edit mode
  const [inputState, setInputState] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (property?.id && onLoadCosts) onLoadCosts(property.id);
  }, [property?.id]);

  // Close all open inputs when year changes
  useEffect(() => { setInputState({}); }, [year]);

  const entryFor = (lineId: string) =>
    costs.find((c: any) => c.line === lineId && Number(c.year) === year) ?? null;

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
      onUpdateCost?.({ id: existing.id, value });
    } else {
      onAddCost?.({ propertyId: property.id, line: line.id, name: line.name, year, value });
    }
    closeEdit(line.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, line: { id: string; name: string }) => {
    if (e.key === "Enter") commit(line);
    if (e.key === "Escape") closeEdit(line.id);
  };

  return (
    <div className="space-y-6">
      {/* Back + property name */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>
        <h2 className="text-xl font-bold">{property.name}</h2>
      </div>

      {/* Property info */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("address")}</p>
            <p>{property.address}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("city")}</p>
            <p>{property.city}</p>
          </div>
          {property["postal-code"] && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("postalCode")}</p>
              <p>{property["postal-code"]}</p>
            </div>
          )}
          {property.units && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("units")}</p>
              <p>{property.units}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nebenkosten + year navigator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("nebenkosten")}</h3>
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

        {costsLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              {COST_LINES.map((line, idx) => {
                const entry    = entryFor(line.id);
                const isEditing = inputState[line.id] != null;
                const isLast    = idx === COST_LINES.length - 1;

                return (
                  <div
                    key={line.id}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${!isLast ? "border-b" : ""}`}
                  >
                    {/* Line name */}
                    <span className="flex-1 font-medium">{line.name}</span>

                    {isEditing ? (
                      /* Edit mode */
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
                        <Button size="sm" className="h-7 px-3" disabled={costsSaving} onClick={() => commit(line)}>
                          {t("save")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeEdit(line.id)}>
                          {t("cancel")}
                        </Button>
                      </>
                    ) : entry ? (
                      /* Value exists */
                      <>
                        <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          disabled={costsSaving}
                          onClick={() => openEdit(line.id, String(entry.value))}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={costsSaving}
                          onClick={() => onDeleteCost?.(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      /* No value for this year */
                      <>
                        <span className="text-muted-foreground w-28 text-right">—</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(line.id, "")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-7" /> {/* spacer to align with rows that have two action buttons */}
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
