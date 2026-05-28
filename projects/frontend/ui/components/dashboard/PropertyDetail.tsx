import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

type CostLine = { id: string; key: string; name?: string; "name-en"?: string; "name-de"?: string };

function costLineName(line: CostLine, lang: string): string {
  return (lang.startsWith("de") ? line["name-de"] : line["name-en"]) ?? line.name ?? line.key ?? "";
}

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  property: any;
  expenseTypes?: CostLine[];
  costs?: any[];
  costsLoading?: boolean;
  costsSaving?: boolean;
  isReadOnly?: boolean;
  onLoadCosts?: (propertyId: string) => void;
  onAddCost?: (data: { propertyId: string; line: string; name: string; year: number; value: number }) => void;
  onUpdateCost?: (data: { id: string; value: number }) => void;
  onDeleteCost?: (id: string) => void;
  onBack: () => void;
};

export default function PropertyDetail({
  property,
  expenseTypes = [],
  costs = [],
  costsLoading,
  costsSaving,
  isReadOnly = false,
  onLoadCosts,
  onAddCost,
  onUpdateCost,
  onDeleteCost,
  onBack,
}: Props) {
  const { t, i18n } = useTranslation("costs");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [inputState, setInputState] = useState<Record<string, string | null>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [addLineOpen, setAddLineOpen] = useState(false);

  React.useEffect(() => {
    if (property?.id && onLoadCosts) onLoadCosts(property.id);
  }, [property?.id]);

  React.useEffect(() => { setInputState({}); setSavingKeys(new Set()); }, [year]);

  // Auto-close pending edits once costs confirms the save
  React.useEffect(() => {
    if (savingKeys.size === 0) return;
    const yearEntries = costs.filter((c: any) => Number(c.year) === year);
    const nowSaved = [...savingKeys].filter(k => yearEntries.some((c: any) => c.line === k));
    if (nowSaved.length > 0) {
      setInputState(prev => { const n = { ...prev }; nowSaved.forEach(k => delete n[k]); return n; });
      setSavingKeys(prev => { const n = new Set(prev); nowSaved.forEach(k => n.delete(k)); return n; });
    }
  }, [costs, year, savingKeys]);

  const costLines: CostLine[] = expenseTypes;

  const yearCostEntries = costs.filter((c: any) => Number(c.year) === year);
  const savedKeys = yearCostEntries.map((c: any) => c.line as string);

  const entryFor = (key: string) => yearCostEntries.find((c: any) => c.line === key) ?? null;

  const prevEntryFor = (key: string) =>
    [...costs]
      .filter((c: any) => c.line === key && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;

  const openEdit = (key: string, initial: string) =>
    setInputState(prev => ({ ...prev, [key]: initial }));

  const closeEdit = (key: string) =>
    setInputState(prev => { const n = { ...prev }; delete n[key]; return n; });

  const commit = (line: CostLine) => {
    const raw = inputState[line.key];
    if (raw == null) return;
    const value = parseFloat(raw.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const existing = entryFor(line.key);
    if (existing) {
      onUpdateCost?.({ id: existing.id, value });
      closeEdit(line.key);
    } else {
      onAddCost?.({ propertyId: property.id, line: line.key, name: costLineName(line, i18n.language), year, value });
      setSavingKeys(prev => new Set([...prev, line.key]));
    }
    toast({ title: tCommon("saved") });
  };

  const handleSelectLine = (key: string) => {
    const line = costLines.find(l => l.key === key);
    if (!line) return;
    const prev = prevEntryFor(line.key);
    openEdit(line.key, prev ? String(prev.value) : "");
    setAddLineOpen(false);
  };

  // Active lines in insertion order (savedKeys from DB, then pending, then new edits)
  const pendingKeys = [...savingKeys].filter(k => !savedKeys.includes(k));
  const editingNewKeys = Object.keys(inputState).filter(k => inputState[k] != null && !savedKeys.includes(k) && !savingKeys.has(k));
  const activeLines = [
    ...savedKeys.map(k => costLines.find(l => l.key === k)),
    ...pendingKeys.map(k => costLines.find(l => l.key === k)),
    ...editingNewKeys.map(k => costLines.find(l => l.key === k)),
  ].filter(Boolean) as CostLine[];

  const availableLines = costLines.filter(l => !savedKeys.includes(l.key) && inputState[l.key] == null && !savingKeys.has(l.key));

  const prevYearLinesToCopy = availableLines.filter(l => prevEntryFor(l.key));

  const copyFromPrevYear = () => {
    prevYearLinesToCopy.forEach(line => {
      const prev = prevEntryFor(line.key);
      if (prev) onAddCost?.({ propertyId: property.id, line: line.key, name: costLineName(line, i18n.language), year, value: Number(prev.value) });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("back")}
        </Button>
        <h2 className="text-xl font-bold">{property.name}</h2>
      </div>

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

      {costLines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{t("nebenkosten")}</h3>
            <div className="flex items-center gap-2">
              {prevYearLinesToCopy.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={costsSaving || isReadOnly} onClick={copyFromPrevYear}>
                  <Copy className="h-3 w-3 mr-1.5" />
                  {t("copyFromYear", { year: year - 1 })}
                </Button>
              )}
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
          </div>

          {costsLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <div className="space-y-2">
              {activeLines.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    {activeLines.map((line) => {
                      const entry     = entryFor(line.key);
                      const isSaving  = savingKeys.has(line.key);
                      const isEditing = inputState[line.key] != null && !isSaving;

                      if (isSaving) {
                        return (
                          <div key={line.id} className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 opacity-60">
                            <span className="flex-1 font-medium">{costLineName(line, i18n.language)}</span>
                            <span className="text-xs text-muted-foreground italic">{t("save")}…</span>
                          </div>
                        );
                      }

                      return (
                        <div key={line.id} className={`flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0`}>
                          <span className="flex-1 font-medium">{costLineName(line, i18n.language)}</span>
                          {isEditing ? (
                            <>
                              <Input
                                autoFocus type="text" inputMode="decimal"
                                value={inputState[line.key]!}
                                onChange={e => setInputState(prev => ({ ...prev, [line.key]: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") commit(line); if (e.key === "Escape") closeEdit(line.key); }}
                                className="w-36 h-7 text-sm text-right"
                              />
                              <Button size="sm" className="h-7 px-3" disabled={costsSaving || isReadOnly} onClick={() => commit(line)}>{t("save")}</Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeEdit(line.key)}>{t("cancel")}</Button>
                            </>
                          ) : entry ? (
                            <>
                              <span className="tabular-nums text-right w-28">€{formatEur(Number(entry.value))}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                disabled={costsSaving || isReadOnly} onClick={() => openEdit(line.key, String(entry.value))}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={costsSaving || isReadOnly} onClick={() => { onDeleteCost?.(entry.id); toast({ title: tCommon("deleted") }); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {availableLines.length > 0 && (
                <Popover open={addLineOpen} onOpenChange={setAddLineOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 border-dashed text-sm text-muted-foreground justify-start font-normal" disabled={isReadOnly}>
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
                          {availableLines.map(line => (
                            <CommandItem
                              key={line.id}
                              value={costLineName(line, i18n.language)}
                              onSelect={() => handleSelectLine(line.key)}
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
  );
}
