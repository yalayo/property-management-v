import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, CalendarClock, Copy, Pencil, Plus, Trash2, Building2, User, Warehouse, Search } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import AddTenantForm from "../tenants/AddTenant";
import AddApartment from "../apartments/AddApartment";
import AddGarage from "../apartments/AddGarage";
import { getApartmentsForProperty, getTenantsForPropertyApartments, getApartmentCode } from "../../lib/propertyUtils";

type CostLine = { id: string; key: string; name?: string; "name-en"?: string; "name-de"?: string };

function costLineName(line: CostLine, lang: string): string {
  return (lang.startsWith("de") ? line["name-de"] : line["name-en"]) ?? line.name ?? line.key ?? "";
}

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  property: any;
  apartments?: any[];
  tenants?: any[];
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
  onViewApartment?: (aptId: any) => void;
  onViewTenant?: (tenantId: any) => void;
  onAddApartment?: (propertyId: string, data: { code: string; wohnflaeche?: string; stromZaehlerNr?: string; wasserZaehlerNrn?: string[] }) => void;
  onAddTenant?: (data: any) => void;
  aptsSaving?: boolean;
  tenantsSaving?: boolean;
  garages?: any[];
  garagesSaving?: boolean;
  onAddGarage?: (propertyId: string, data: { code: string; flaeche?: string; monthlyRent?: string; tenantId?: string }) => void;
  onViewGarage?: (garageId: string) => void;
};

// ── Apartments tab ────────────────────────────────────────────────────────────

function ApartmentsTab({ apartments, tenants, t, tApts, propertyId, onViewApartment, onAddApartment, aptsSaving, isReadOnly }: {
  apartments: any[];
  tenants: any[];
  t: (key: string) => string;
  tApts: (key: string, opts?: any) => string;
  propertyId: string;
  onViewApartment?: (aptId: any) => void;
  onAddApartment?: (propertyId: string, data: { code: string; wohnflaeche?: string; stromZaehlerNr?: string; wasserZaehlerNrn?: string[] }) => void;
  aptsSaving?: boolean;
  isReadOnly?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newWohnflaeche, setNewWohnflaeche] = useState("");
  const [newStrom, setNewStrom] = useState("");
  const [newWasser, setNewWasser] = useState<string[]>([]);

  const lowerFilter = filterText.toLowerCase();
  const filteredApartments = filterText
    ? apartments.filter((apt: any) => {
        const code = (apt["apartment/code"] ?? apt.code ?? "").toLowerCase();
        if (code.includes(lowerFilter)) return true;
        const aptId = apt.id ?? apt["db/id"];
        const aptTenants = tenants.filter((tn: any) => {
          const raw = tn["apartment-id"];
          const tid = raw != null && typeof raw === "object" ? (raw.id ?? raw["db/id"]) : raw;
          return String(tid) === String(aptId);
        });
        const activeTenant = aptTenants.find((tn: any) => !tn["end-date"] || new Date(tn["end-date"]) >= new Date());
        if (!activeTenant) return false;
        const name = [activeTenant["first-name"], activeTenant["last-name"]].filter(Boolean).join(" ") || activeTenant.name || "";
        return name.toLowerCase().includes(lowerFilter);
      })
    : apartments;

  const resetForm = () => {
    setNewCode("");
    setNewWohnflaeche("");
    setNewStrom("");
    setNewWasser([]);
  };

  const handleSubmit = () => {
    if (!newCode.trim()) return;
    onAddApartment?.(propertyId, {
      code: newCode.trim(),
      wohnflaeche: newWohnflaeche || undefined,
      stromZaehlerNr: newStrom || undefined,
      wasserZaehlerNrn: newWasser.length > 0 ? newWasser : undefined,
    });
    resetForm();
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={tApts("searchPlaceholder", { defaultValue: "Code oder Mieter…" })}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {!isReadOnly && onAddApartment && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {tApts("addApartment")}
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <AddApartment
            apartments={apartments}
            isLoading={aptsSaving}
            code={newCode}
            wohnflaeche={newWohnflaeche}
            stromZaehlerNr={newStrom}
            wasserZaehlerNrn={newWasser}
            initialPropertyId={propertyId}
            onChangeAddApartmentDialogClose={() => { setAddOpen(false); resetForm(); }}
            onChangeCode={(e) => setNewCode(e.target.value)}
            onChangeWohnflaeche={(e) => setNewWohnflaeche(e.target.value)}
            onChangeStromZaehlerNr={(v) => setNewStrom(v)}
            onChangeWasserZaehlerNrn={(v) => setNewWasser(v)}
            submitApartment={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      {apartments.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {t("noApartmentsInProperty")}
        </div>
      ) : filteredApartments.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {t("noResults", { defaultValue: "Keine Treffer" })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredApartments.map((apt: any, index: number) => {
            const aptId = apt.id ?? apt["db/id"];
            const code = apt["apartment/code"] ?? apt.code ?? "—";
            const occupied: boolean = !!(apt["apartment/occupied"] ?? apt.occupied);
            const aptTenants = tenants.filter((tn: any) => {
              const raw = tn["apartment-id"];
              const tid = raw != null && typeof raw === "object" ? (raw.id ?? raw["db/id"]) : raw;
              return String(tid) === String(aptId);
            });
            const activeTenant = aptTenants.find((tn: any) => !tn["end-date"] || new Date(tn["end-date"]) >= new Date());

            return (
              <Card key={aptId ?? `apt-${index}`} className="overflow-hidden">
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      className="font-semibold text-left hover:underline hover:text-primary leading-tight"
                      onClick={() => onViewApartment?.(aptId)}
                    >
                      {tApts("apartment", { code })}
                    </button>
                    <Badge variant={occupied ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                      {occupied ? tApts("occupied") : tApts("available")}
                    </Badge>
                  </div>
                  {activeTenant ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{[activeTenant["first-name"], activeTenant["last-name"]].filter(Boolean).join(" ") || activeTenant.name || "—"}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{tApts("vacantMessage")}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tenants tab ───────────────────────────────────────────────────────────────

function TenantsTab({ tenants, allTenants, propertyApartments, apartments, t, tTenants, tCommon, onViewTenant, onAddTenant, tenantsSaving, isReadOnly }: {
  tenants: any[];
  allTenants: any[];
  propertyApartments: any[];
  apartments: any[];
  t: (key: string) => string;
  tTenants: (key: string, opts?: any) => string;
  tCommon: (key: string) => string;
  onViewTenant?: (tenantId: any) => void;
  onAddTenant?: (data: any) => void;
  tenantsSaving?: boolean;
  isReadOnly?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const aptOptions = propertyApartments
    .filter((apt: any) => !(apt.occupied ?? apt["apartment/occupied"]))
    .map((apt: any) => ({
      id: apt["db/id"] ?? apt.id,
      code: apt["apartment/code"] ?? apt.code ?? "—",
    }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!isReadOnly && onAddTenant && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {tTenants("addTenant")}
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <AddTenantForm
            apartments={aptOptions}
            tenants={allTenants}
            isLoading={tenantsSaving}
            onClose={() => setAddOpen(false)}
            onSubmit={(data) => { onAddTenant?.(data); setAddOpen(false); }}
          />
        </DialogContent>
      </Dialog>

      {tenants.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {t("noTenantsInProperty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant: any) => {
            const id = tenant["db/id"] ?? tenant.id;
            const fullName = [tenant["first-name"], tenant["last-name"]].filter(Boolean).join(" ") || tenant.name || "—";
            const aptCode = getApartmentCode(apartments, tenant["apartment-id"]);
            const isActive = !tenant["end-date"] || new Date(tenant["end-date"]) >= new Date();

            return (
              <Card key={id} className="overflow-hidden">
                <CardContent className="pt-4 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      className="font-semibold text-left hover:underline hover:text-primary leading-tight"
                      onClick={() => onViewTenant?.(id)}
                    >
                      {fullName}
                    </button>
                    <Badge variant={isActive ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                      {isActive ? tTenants("active") : tTenants("past")}
                    </Badge>
                  </div>
                  {tenant.email && (
                    <p className="text-xs text-muted-foreground">{tenant.email}</p>
                  )}
                  {aptCode && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span>{aptCode}</span>
                    </div>
                  )}
                  {tenant["start-date"] && (
                    <p className="text-xs text-muted-foreground">
                      {tenant["end-date"]
                        ? tTenants("fromTo", { from: tenant["start-date"], to: tenant["end-date"] })
                        : tTenants("from", { from: tenant["start-date"] })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Garages tab ───────────────────────────────────────────────────────────────

function GaragesTab({ garages, propertyId, tenants, properties, onAddGarage, onViewGarage, garagesSaving, isReadOnly }: {
  garages: any[];
  propertyId: string;
  tenants: any[];
  properties: any[];
  onAddGarage?: (propertyId: string, data: { code: string; flaeche?: string; monthlyRent?: string; tenantId?: string }) => void;
  onViewGarage?: (garageId: string) => void;
  garagesSaving?: boolean;
  isReadOnly?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState("");
  const [flaeche, setFlaeche] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [tenantId, setTenantId] = useState("");

  const reset = () => { setCode(""); setFlaeche(""); setMonthlyRent(""); setTenantId(""); };

  const handleSubmit = () => {
    if (!code.trim()) return;
    onAddGarage?.(propertyId, {
      code: code.trim(),
      flaeche: flaeche || undefined,
      monthlyRent: monthlyRent || undefined,
      tenantId: tenantId || undefined,
    });
    reset();
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!isReadOnly && onAddGarage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {"Garage hinzufügen"}
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <AddGarage
            initialPropertyId={propertyId}
            properties={properties}
            tenants={tenants}
            isLoading={garagesSaving}
            code={code}
            flaeche={flaeche}
            monthlyRent={monthlyRent}
            selectedTenantId={tenantId}
            onClose={() => { setAddOpen(false); reset(); }}
            onChangeCode={(e) => setCode(e.target.value)}
            onChangeFlaeche={(e) => setFlaeche(e.target.value)}
            onChangeMonthlyRent={(e) => setMonthlyRent(e.target.value)}
            onChangeTenant={(id) => setTenantId(id)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      {garages.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {"Noch keine Garagen für dieses Objekt"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {garages.map((g: any) => {
            const gId       = g.id ?? g["db/id"];
            const gCode     = g.code ?? "—";
            const occupied  = !!(g.occupied);
            const flaeche   = g.flaeche != null ? parseFloat(String(g.flaeche)) : null;
            const monthlyRent = g["monthly-rent"] ?? g.monthlyRent;
            const tenantName  = g["tenant-name"] ?? null;
            return (
              <Card key={gId} className="overflow-hidden">
                <CardContent className="pt-4 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      className="font-semibold text-left hover:underline hover:text-primary leading-tight flex items-center gap-1.5"
                      onClick={() => onViewGarage?.(String(gId))}
                    >
                      <Warehouse className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {gCode}
                    </button>
                    <Badge variant={occupied ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                      {occupied ? "Belegt" : "Frei"}
                    </Badge>
                  </div>
                  {tenantName && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{tenantName}</span>
                    </div>
                  )}
                  {(flaeche != null || monthlyRent != null) && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {flaeche != null && <span>{flaeche.toLocaleString("de-DE")} m²</span>}
                      {monthlyRent != null && <span>€ {parseFloat(String(monthlyRent)).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Mo.</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Nebenkosten tab ───────────────────────────────────────────────────────────

function NebenkostenTab({
  property, expenseTypes, costs, costsLoading, costsSaving, isReadOnly,
  onLoadCosts, onAddCost, onUpdateCost, onDeleteCost, t, tCommon, i18nLanguage,
}: {
  property: any;
  expenseTypes: CostLine[];
  costs: any[];
  costsLoading?: boolean;
  costsSaving?: boolean;
  isReadOnly: boolean;
  onLoadCosts?: (id: string) => void;
  onAddCost?: (data: any) => void;
  onUpdateCost?: (data: any) => void;
  onDeleteCost?: (id: string) => void;
  t: (key: string, opts?: any) => string;
  tCommon: (key: string) => string;
  i18nLanguage: string;
}) {
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 1;
  const [year, setYear] = useState(defaultYear);
  const [inputState, setInputState] = useState<Record<string, string | null>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [addLineOpen, setAddLineOpen] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (property?.id && onLoadCosts) onLoadCosts(property.id);
  }, [property?.id]);

  React.useEffect(() => { setInputState({}); setSavingKeys(new Set()); }, [year]);

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
      onAddCost?.({ propertyId: property.id, line: line.key, name: costLineName(line, i18nLanguage), year, value });
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
      if (prev) onAddCost?.({ propertyId: property.id, line: line.key, name: costLineName(line, i18nLanguage), year, value: Number(prev.value) });
    });
  };

  if (costLines.length === 0) return null;

  return (
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
            <span className={`min-w-[3rem] text-center text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
              year !== defaultYear
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-transparent text-foreground"
            }`}>{year}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {year !== defaultYear && (
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
      )}
      {costsLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : (
        <div className="space-y-2">
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
                          value={costLineName(line, i18nLanguage)}
                          onSelect={() => handleSelectLine(line.key)}
                        >
                          {costLineName(line, i18nLanguage)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          {activeLines.length > 0 && (() => {
            const savedTotal = activeLines.reduce((sum, line) => {
              const entry = entryFor(line.key);
              return sum + (entry ? Number(entry.value) : 0);
            }, 0);
            return (
              <Card>
                <CardContent className="p-0">
                  {activeLines.map((line) => {
                    const entry     = entryFor(line.key);
                    const isSaving  = savingKeys.has(line.key);
                    const isEditing = inputState[line.key] != null && !isSaving;

                    if (isSaving) {
                      return (
                        <div key={line.id} className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 opacity-60">
                          <span className="flex-1 font-medium">{costLineName(line, i18nLanguage)}</span>
                          <span className="text-xs text-muted-foreground italic">{t("save")}…</span>
                        </div>
                      );
                    }

                    return (
                      <div key={line.id} className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
                        <span className="flex-1 font-medium">{costLineName(line, i18nLanguage)}</span>
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
                  <div className="flex items-center gap-3 px-4 py-3 text-sm border-t bg-muted/40">
                    <span className="flex-1 font-semibold">{tCommon("total", { defaultValue: "Total" })}</span>
                    <span className="tabular-nums text-right w-28 font-semibold">€{formatEur(savedTotal)}</span>
                    <span className="w-[3.5rem]" />
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyDetail({
  property,
  apartments = [],
  tenants = [],
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
  onViewApartment,
  onViewTenant,
  onAddApartment,
  onAddTenant,
  aptsSaving,
  tenantsSaving,
  garages = [],
  garagesSaving,
  onAddGarage,
  onViewGarage,
}: Props) {
  const { t, i18n } = useTranslation("costs");
  const { t: tCommon } = useTranslation("common");
  const { t: tApts } = useTranslation("apartments");
  const { t: tTenants } = useTranslation("tenants");
  const { t: tProps } = useTranslation("properties");

  const propertyApartments = getApartmentsForProperty(apartments, property.id);
  const propertyTenants = getTenantsForPropertyApartments(propertyApartments, tenants);
  const propertyGarages = garages.filter((g: any) =>
    String(g["property-id"] ?? g.property_id ?? g.propertyId ?? "") === String(property.id)
  );

  // ── Property field formatting ────────────────────────────────────────────────
  const num = (v: any) => (v === null || v === undefined || v === "" ? null : parseFloat(String(v).replace(",", ".")));
  const money = (v: any) => { const n = num(v); return n == null || isNaN(n) ? null : `€ ${formatEur(n)}`; };
  const area  = (v: any) => { const n = num(v); return n == null || isNaN(n) ? null : `${n.toLocaleString("de-DE")} m²`; };
  const pct   = (v: any) => { const n = num(v); return n == null || isNaN(n) ? null : `${(n * 100).toLocaleString("de-DE")} %`; };
  const usageKey: Record<string, string> = {
    "full-rental": "fullRental", "partial-rental": "partialRental",
    "owner-occupied": "ownerOccupied", "mixed": "mixed",
  };
  const usageLabel = property.usage
    ? tProps(`usage.${usageKey[property.usage] ?? property.usage}`, { defaultValue: property.usage })
    : null;

  // Section definitions: [translationKey, formattedValue]
  const basicFields: Array<[string, string | null]> = [
    [t("address"), property.address || null],
    [t("city"), property.city || null],
    [t("postalCode"), property["postal-code"] || null],
    [t("units"), property.units != null ? String(property.units) : null],
  ];
  const fmtDate = (v: any) => {
    if (!v) return null;
    const d = new Date(String(v) + (String(v).length === 10 ? "T00:00:00" : ""));
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US");
  };
  const financialFields: Array<[string, string | null]> = [
    [tProps("fields.acquisitionDate"), fmtDate(property["acquisition-date"])],
    [tProps("fields.purchasePrice"), money(property["purchase-price"])],
    [tProps("fields.landValue"), money(property["land-value"])],
    [tProps("fields.buildingValue"), money(property["building-value"])],
    [tProps("fields.currentValue"), money(property["current-value"])],
  ];
  const detailFields: Array<[string, string | null]> = [
    [tProps("fields.yearBuilt"), property["year-built"] != null ? String(property["year-built"]) : null],
    [tProps("fields.ownershipShare"), pct(property["ownership-share"])],
    [tProps("fields.livingAreaM2"), area(property["living-area-m2"])],
    [tProps("fields.rentalAreaM2"), area(property["rental-area-m2"])],
    [tProps("fields.usage"), usageLabel],
  ];

  const renderFields = (fields: Array<[string, string | null]>) =>
    fields.map(([label, value]) => (
      <div key={label}>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p>{value != null && value !== "" ? value : "—"}</p>
      </div>
    ));

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
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {renderFields(basicFields)}
          </div>

          <div className="border-t pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {tProps("sections.financial")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {renderFields(financialFields)}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {tProps("sections.propertyDetails")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {renderFields(detailFields)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="apartments">
        <TabsList className="w-full">
          <TabsTrigger value="apartments" className="flex-1">
            {t("tabs.apartments")}
            {propertyApartments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {propertyApartments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="garages" className="flex-1">
            {"Garagen"}
            {propertyGarages.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {propertyGarages.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex-1">
            {t("tabs.tenants")}
            {propertyTenants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {propertyTenants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="nebenkosten" className="flex-1">
            {t("tabs.nebenkosten")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apartments" className="mt-4">
          <ApartmentsTab
            apartments={propertyApartments}
            tenants={tenants}
            t={t}
            tApts={tApts}
            propertyId={String(property.id)}
            onViewApartment={onViewApartment}
            onAddApartment={onAddApartment}
            aptsSaving={aptsSaving}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="tenants" className="mt-4">
          <TenantsTab
            tenants={propertyTenants}
            allTenants={tenants}
            propertyApartments={propertyApartments}
            apartments={apartments}
            t={t}
            tTenants={tTenants}
            tCommon={tCommon}
            onViewTenant={onViewTenant}
            onAddTenant={onAddTenant}
            tenantsSaving={tenantsSaving}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="garages" className="mt-4">
          <GaragesTab
            garages={propertyGarages}
            propertyId={String(property.id)}
            tenants={tenants}
            properties={[{ id: property.id, name: property.name }]}
            onAddGarage={onAddGarage}
            onViewGarage={onViewGarage}
            garagesSaving={garagesSaving}
            isReadOnly={isReadOnly}
          />
        </TabsContent>

        <TabsContent value="nebenkosten" className="mt-4">
          <NebenkostenTab
            property={property}
            expenseTypes={expenseTypes}
            costs={costs}
            costsLoading={costsLoading}
            costsSaving={costsSaving}
            isReadOnly={isReadOnly}
            onLoadCosts={onLoadCosts}
            onAddCost={onAddCost}
            onUpdateCost={onUpdateCost}
            onDeleteCost={onDeleteCost}
            t={t}
            tCommon={tCommon}
            i18nLanguage={i18n.language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
