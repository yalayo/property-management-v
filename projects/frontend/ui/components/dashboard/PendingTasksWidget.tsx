import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronRight, ChevronDown, ClipboardList, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskCategory = "steuer" | "nebenkosten";

type Task = {
  id: string;
  category: TaskCategory;
  type: string;
  propertyId: string;
  propertyName: string;
  aptCode?: string;
  aptId?: string;
  aptTab?: string;
  navigateTo: "properties" | "abrechnung" | "apartments" | "tax";
  priority: number;
  missingMonths?: number[];
};

type TasksResult = {
  tasks: Task[];
  totalChecks: number;
  passedChecks: number;
};

type NavContext = {
  propertyId?: string;
  aptId?: string;
  aptTab?: string;
};

type Props = {
  properties?: any[];
  apartments?: any[];
  tenants?: any[];
  allCosts?: any[];
  allAptCosts?: any[];
  allRentPayments?: any[];
  taxConfigs?: any[];
  expenseTypes?: any[];
  loans?: any[];
  year?: number;
  isLoading?: boolean;
  onNavigate?: (tab: string, context?: NavContext) => void;
  onEditProperty?: (id: string, data: Record<string, any>) => void;
  onUpdateApartment?: (aptId: string, data: Record<string, any>) => void;
  onAddRentPayment?: (data: { apartmentId: string; year: number; month: number; nebenkostenWarm: number }) => void;
  onAddCost?: (data: { propertyId: string; line: string; name: string; year: number; value: number }) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number; verteiler?: number; anteil?: number; schluessel?: string }) => void;
};

// ── Task types with inline modal ───────────────────────────────────────────────

const MODAL_TYPES = new Set([
  "missing-iban",
  "missing-rent-payments",
  "missing-wohnflaeche",
  "missing-tenant",
  "missing-property-costs",
  "missing-apt-allocation",
  "missing-acquisition-date",
  "missing-land-value",
  "missing-building-value",
  "missing-ownership-share",
  "missing-year-built",
  "missing-usage",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function tenantActiveMonths(tenant: any, year: number): number[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const tStart = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const tEnd   = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    if (tStart <= new Date(year, m, 0) && tEnd >= new Date(year, m - 1, 1)) months.push(m);
  }
  return months;
}

function etName(et: any, lang = "de"): string {
  return (lang.startsWith("de") ? et["name-de"] : et["name-en"]) ?? et.name ?? et.key ?? "";
}

// ── Task computation ──────────────────────────────────────────────────────────

function computeTasks(
  { properties, apartments, tenants, allCosts, allAptCosts, allRentPayments, taxConfigs }: Required<
    Pick<Props, "properties" | "apartments" | "tenants" | "allCosts" | "allAptCosts" | "allRentPayments" | "taxConfigs">
  >,
  year: number
): TasksResult {
  const tasks: Task[] = [];
  let totalChecks = 0, passedChecks = 0;

  function check(passing: boolean, task: Task) {
    totalChecks++;
    if (passing) passedChecks++;
    else tasks.push(task);
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);

  for (const property of properties) {
    const propId   = String(property.id);
    const propName = property.name || propId;

    // Steuer checks
    check(!!property["acquisition-date"],      { id: `steuer-${propId}-acquisition-date`, category: "steuer", type: "missing-acquisition-date", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 20 });
    check(property["land-value"] != null,      { id: `steuer-${propId}-land-value`,        category: "steuer", type: "missing-land-value",        propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 21 });
    check(property["building-value"] != null,  { id: `steuer-${propId}-building-value`,    category: "steuer", type: "missing-building-value",     propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 22 });
    check(property["ownership-share"] != null, { id: `steuer-${propId}-ownership-share`,   category: "steuer", type: "missing-ownership-share",    propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 23 });
    check(property["year-built"] != null,      { id: `steuer-${propId}-year-built`,         category: "steuer", type: "missing-year-built",         propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 24 });
    check(!!property.usage,                    { id: `steuer-${propId}-usage`,              category: "steuer", type: "missing-usage",              propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 25 });

    const taxConfig = taxConfigs.find(c => String(c["property-id"]) === propId);
    check(!!(taxConfig && taxConfig["building-value"] != null), { id: `steuer-${propId}-afa-config`, category: "steuer", type: "missing-afa-config", propertyId: propId, propertyName: propName, navigateTo: "tax", priority: 26 });

    // Property-level billing checks
    check(!!property.iban, { id: `nk-${propId}-iban`, category: "nebenkosten", type: "missing-iban", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 10 });

    const hasPropertyCosts = allCosts.some(c => String(c["property-id"]) === propId && Number(c.year) === year);
    check(hasPropertyCosts, { id: `nk-${propId}-costs-${year}`, category: "nebenkosten", type: "missing-property-costs", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 13 });

    // Per-apartment checks
    for (const apt of apartments.filter(a => String(a["property-id"]) === propId)) {
      const aptId   = String(apt.id);
      const aptCode = apt.code || aptId;

      // Fundamental data — all apartments
      check(apt.wohnflaeche != null, {
        id: `nk-${aptId}-wohnflaeche`, category: "nebenkosten", type: "missing-wohnflaeche",
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "info",
        navigateTo: "apartments", priority: 7,
      });

      const aptTenants = tenants.filter(t => {
        if (String(t["apartment-id"]) !== aptId) return false;
        const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
        const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
        return (!s || s <= yearEnd) && (!e || e >= yearStart);
      });

      check(aptTenants.length > 0 || !!apt.leerstand, {
        id: `nk-${aptId}-tenant-${year}`, category: "nebenkosten", type: "missing-tenant",
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "tenants",
        navigateTo: "apartments", priority: 8,
      });

      if (!aptTenants.length) continue;

      // Rent payments
      const activeMonths = new Set<number>();
      for (const t of aptTenants) for (const m of tenantActiveMonths(t, year)) activeMonths.add(m);
      const paidMonths = new Set<number>(
        allRentPayments.filter(p => String(p["apartment-id"]) === aptId && Number(p.year) === year).map(p => Number(p.month))
      );
      const missingMonths = [...activeMonths].filter(m => !paidMonths.has(m)).sort((a, b) => a - b);
      check(missingMonths.length === 0, {
        id: `nk-${aptId}-rent-${year}`, category: "nebenkosten", type: "missing-rent-payments",
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "rent",
        navigateTo: "apartments", priority: 11, missingMonths,
      });

      // Cost allocation — modal when property costs exist, navigate otherwise
      const hasAptCosts = allAptCosts.some(c => String(c["apartment-id"]) === aptId && Number(c.year) === year);
      const aptCostType = hasPropertyCosts ? "missing-apt-allocation" : "missing-apt-costs";
      check(hasAptCosts, {
        id: `nk-${aptId}-aptcosts-${year}`, category: "nebenkosten", type: aptCostType,
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "costs",
        navigateTo: "apartments", priority: 12,
      });
    }
  }

  return { tasks: tasks.sort((a, b) => a.priority - b.priority), totalChecks, passedChecks };
}

// ── Modals ────────────────────────────────────────────────────────────────────

function IbanModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (data: Record<string, any>) => void }) {
  const [iban, setIban]                             = useState("");
  const [bankName, setBankName]                     = useState("");
  const [landlordName, setLandlordName]             = useState("");
  const [landlordStreet, setLandlordStreet]         = useState("");
  const [landlordPostalCity, setLandlordPostalCity] = useState("");
  const valid = iban.trim().length >= 15;
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>IBAN eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName}</p>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1">
          <Label className="text-xs">IBAN *</Label>
          <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="DE89 3704 0044 …" className="font-mono" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bankname</Label>
          <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Deutsche Bank" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vermieter Name</Label>
          <Input value={landlordName} onChange={e => setLandlordName(e.target.value)} placeholder="Max Mustermann" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Straße (Vermieter)</Label>
          <Input value={landlordStreet} onChange={e => setLandlordStreet(e.target.value)} placeholder="Musterstraße 12" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PLZ + Ort (Vermieter)</Label>
          <Input value={landlordPostalCity} onChange={e => setLandlordPostalCity(e.target.value)} placeholder="12345 Berlin" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!valid} onClick={() => { onSave({ iban: iban.replace(/\s/g, ""), bankName, landlordName, landlordStreet, landlordPostalCity }); onClose(); }}>Speichern</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PropertyCostsModal({ task, targetYear, expenseTypes, onClose, onSave }: {
  task: Task;
  targetYear: number;
  expenseTypes: any[];
  onClose: () => void;
  onSave: (costs: Array<{ line: string; name: string; value: number }>) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const filled = expenseTypes.filter(et => {
    const v = inputs[et.key];
    return v && v.trim() !== "" && !isNaN(parseFloat(v.replace(",", "."))) && parseFloat(v.replace(",", ".")) > 0;
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Kosten hinzufügen</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {targetYear}</p>
      </DialogHeader>
      <div className="py-2 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {expenseTypes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Kostenarten konfiguriert.</p>
        )}
        {expenseTypes.map((et: any) => (
          <div key={et.key} className="flex items-center gap-3">
            <span className="text-sm flex-1 truncate">{etName(et)}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-7 w-28 text-sm text-right"
                placeholder="0,00"
                value={inputs[et.key] ?? ""}
                onChange={e => setInputs(prev => ({ ...prev, [et.key]: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground w-3">€</span>
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button
          disabled={filled.length === 0}
          onClick={() => {
            const costs = filled.map(et => ({
              line: et.key,
              name: etName(et),
              value: parseFloat(inputs[et.key].replace(",", ".")),
            }));
            onSave(costs);
            onClose();
          }}
        >
          Speichern ({filled.length} {filled.length === 1 ? "Position" : "Positionen"})
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AptAllocationModal({ task, targetYear, allCosts, properties, apartments, expenseTypes, onClose, onSave }: {
  task: Task;
  targetYear: number;
  allCosts: any[];
  properties: any[];
  apartments: any[];
  expenseTypes: any[];
  onClose: () => void;
  onSave: (items: Array<{ line: string; name: string; value: number; verteiler?: number; anteil?: number; schluessel?: string }>) => void;
}) {
  const propertyCosts = allCosts.filter(c => String(c["property-id"]) === task.propertyId && Number(c.year) === targetYear);
  const property = properties.find(p => String(p.id) === task.propertyId);
  const apt = apartments.find(a => String(a.id) === task.aptId);

  const aptWohnflaeche = apt?.wohnflaeche != null ? parseFloat(String(apt.wohnflaeche)) : null;
  const propWohnflaeche = property?.["living-area-m2"] != null
    ? parseFloat(String(property["living-area-m2"]))
    : apartments
        .filter(a => String(a["property-id"]) === task.propertyId && a.wohnflaeche != null)
        .reduce((s, a) => s + parseFloat(String(a.wohnflaeche)), 0) || null;

  function defaultForLine(cost: any) {
    const et = expenseTypes.find(e => e.key === cost.line);
    const method = et?.["distribution-method"] ?? "living-area";
    if (method === "living-area" && propWohnflaeche && aptWohnflaeche) {
      const share = (cost.value * aptWohnflaeche) / propWohnflaeche;
      return { value: share.toFixed(2), verteiler: propWohnflaeche, anteil: aptWohnflaeche, schluessel: "Wohnfläche" };
    }
    return { value: "", verteiler: null, anteil: null, schluessel: null };
  }

  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(propertyCosts.map(c => [c.line, defaultForLine(c).value]))
  );

  const defaults = useMemo(
    () => Object.fromEntries(propertyCosts.map(c => [c.line, defaultForLine(c)])),
    [propertyCosts, aptWohnflaeche, propWohnflaeche]
  );

  const filled = propertyCosts.filter(c => {
    const v = inputs[c.line];
    return v && v.trim() !== "" && !isNaN(parseFloat(v.replace(",", ".")));
  });

  if (propertyCosts.length === 0) {
    return (
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kostenumlage</DialogTitle>
          <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode}</p>
        </DialogHeader>
        <p className="py-3 text-sm text-muted-foreground">Keine Eigentumskosten für {targetYear} gefunden. Bitte zuerst Kosten beim Objekt hinzufügen.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Kostenumlage eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode} · {targetYear}</p>
      </DialogHeader>
      <div className="py-2 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {propertyCosts.map(c => {
          const et = expenseTypes.find(e => e.key === c.line);
          const name = et ? etName(et) : (c.name || c.line);
          const def = defaults[c.line];
          const total = typeof c.value === "number" ? c.value : parseFloat(c.value);
          return (
            <div key={c.line} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  Gesamt: {total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              {def.schluessel && (
                <p className="text-xs text-muted-foreground">
                  {def.schluessel}: {def.anteil} / {def.verteiler} m²
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-7 text-sm flex-1"
                  placeholder="0,00"
                  value={inputs[c.line] ?? ""}
                  onChange={e => setInputs(prev => ({ ...prev, [c.line]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground shrink-0">€</span>
              </div>
            </div>
          );
        })}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button
          disabled={filled.length === 0}
          onClick={() => {
            const items = filled.map(c => {
              const et = expenseTypes.find(e => e.key === c.line);
              const def = defaults[c.line];
              return {
                line: c.line,
                name: et ? etName(et) : (c.name || c.line),
                value: parseFloat(inputs[c.line].replace(",", ".")),
                ...(def.verteiler != null ? { verteiler: def.verteiler } : {}),
                ...(def.anteil    != null ? { anteil:    def.anteil    } : {}),
                ...(def.schluessel        ? { schluessel: def.schluessel } : {}),
              };
            });
            onSave(items);
            onClose();
          }}
        >
          Speichern ({filled.length} {filled.length === 1 ? "Position" : "Positionen"})
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function WohnflaecheModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (aptId: string, data: Record<string, any>) => void }) {
  const [value, setValue] = useState("");
  const num = parseFloat(value.replace(",", "."));
  const valid = value.trim() !== "" && !isNaN(num) && num > 0;
  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Wohnfläche eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode}</p>
      </DialogHeader>
      <div className="py-2 space-y-1">
        <Label className="text-xs">Wohnfläche *</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min="1" step="0.1" value={value} onChange={e => setValue(e.target.value)} placeholder="z.B. 65,5" className="flex-1" />
          <span className="text-sm text-muted-foreground shrink-0">m²</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!valid} onClick={() => { onSave(task.aptId!, { wohnflaeche: num }); onClose(); }}>Speichern</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TenantModal({ task, onClose, onNavigate, onDeclareVacant }: {
  task: Task; onClose: () => void; onNavigate: () => void; onDeclareVacant: (aptId: string) => void;
}) {
  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Kein Mieter eingetragen</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode}</p>
      </DialogHeader>
      <p className="py-2 text-sm text-muted-foreground">
        Diese Wohnung hat keinen Mieter für diesen Zeitraum. Bitte fügen Sie einen Mieter hinzu oder bestätigen Sie den Leerstand.
      </p>
      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <Button className="w-full" onClick={() => { onNavigate(); onClose(); }}>
          Mieter hinzufügen <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" className="w-full" onClick={() => { onDeclareVacant(task.aptId!); onClose(); }}>
          Wohnung ist leer (Leerstand bestätigen)
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RentPaymentsModal({ task, year, onClose, onSave }: { task: Task; year: number; onClose: () => void; onSave: (month: number, nk: number) => void }) {
  const months = task.missingMonths ?? [];
  const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(months.map(m => [m, ""])));
  const filledCount = Object.values(values).filter(v => v.trim() !== "" && !isNaN(parseFloat(v))).length;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>NK-Zahlungen eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode} · {year}</p>
      </DialogHeader>
      <div className="py-2 space-y-2">
        <p className="text-xs text-muted-foreground">Fehlende Monate — NK-Betrag (€) je Monat eingeben:</p>
        <div className="grid grid-cols-3 gap-2">
          {months.map(m => (
            <div key={m} className="space-y-1">
              <Label className="text-xs font-medium">{MONTH_DE[m - 1]}</Label>
              <Input type="number" min="0" step="0.01" className="h-8 text-sm" placeholder="0,00"
                value={values[m] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, [m]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={filledCount === 0} onClick={() => {
          for (const m of months) { const v = parseFloat(values[m] ?? ""); if (!isNaN(v)) onSave(m, v); }
          onClose();
        }}>
          Speichern {filledCount > 0 ? `(${filledCount} ${filledCount === 1 ? "Monat" : "Monate"})` : ""}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const PROPERTY_FIELD_CONFIG: Record<string, { label: string; fieldKey: string; inputType: "date" | "number" | "select"; unit?: string; options?: { value: string; label: string }[] }> = {
  "missing-acquisition-date": { label: "Anschaffungsdatum", fieldKey: "acquisitionDate", inputType: "date" },
  "missing-land-value":       { label: "Bodenwert (€)",     fieldKey: "landValue",        inputType: "number", unit: "€" },
  "missing-building-value":   { label: "Gebäudewert (€)",   fieldKey: "buildingValue",    inputType: "number", unit: "€" },
  "missing-ownership-share":  { label: "Eigentumsanteil (%)", fieldKey: "ownershipShare", inputType: "number", unit: "%" },
  "missing-year-built":       { label: "Baujahr",           fieldKey: "yearBuilt",        inputType: "number" },
  "missing-usage":            { label: "Nutzungsart",       fieldKey: "usage",            inputType: "select",
    options: [
      { value: "full-rental",    label: "Vollvermietung" },
      { value: "partial-rental", label: "Teilvermietung" },
      { value: "owner-occupied", label: "Eigennutzung" },
      { value: "mixed",          label: "Gemischte Nutzung" },
    ],
  },
};

function PropertyFieldModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (data: Record<string, any>) => void }) {
  const cfg = PROPERTY_FIELD_CONFIG[task.type];
  const [value, setValue] = useState("");
  if (!cfg) return null;

  const isValid = value.trim() !== "" && (cfg.inputType !== "number" || !isNaN(parseFloat(value)));

  const handleSave = () => {
    const parsed = cfg.inputType === "number" ? parseFloat(value) : value;
    onSave({ [cfg.fieldKey]: parsed });
    onClose();
  };

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{cfg.label} eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName}</p>
      </DialogHeader>
      <div className="py-2 space-y-1">
        <Label className="text-xs">{cfg.label} *</Label>
        {cfg.inputType === "select" ? (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger><SelectValue placeholder="Auswählen …" /></SelectTrigger>
            <SelectContent>
              {cfg.options!.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2">
            <Input type={cfg.inputType} value={value} onChange={e => setValue(e.target.value)}
              placeholder={cfg.inputType === "date" ? "JJJJ-MM-TT" : cfg.unit ? `0 ${cfg.unit}` : ""}
              className="flex-1"
            />
            {cfg.unit && <span className="text-sm text-muted-foreground shrink-0">{cfg.unit}</span>}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!isValid} onClick={handleSave}>Speichern</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const VISIBLE_COUNT = 5;

export default function PendingTasksWidget({
  properties = [],
  apartments = [],
  tenants = [],
  allCosts = [],
  allAptCosts = [],
  allRentPayments = [],
  taxConfigs = [],
  expenseTypes = [],
  loans = [],
  year,
  isLoading = false,
  onNavigate,
  onEditProperty,
  onUpdateApartment,
  onAddRentPayment,
  onAddCost,
  onAddAptCost,
}: Props) {
  const { t } = useTranslation("tasks");
  const [showAll, setShowAll]       = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const targetYear = year ?? new Date().getFullYear() - 1;

  const { tasks, totalChecks, passedChecks } = useMemo(
    () => computeTasks({ properties, apartments, tenants, allCosts, allAptCosts, allRentPayments, taxConfigs }, targetYear),
    [properties, apartments, tenants, allCosts, allAptCosts, allRentPayments, taxConfigs, targetYear]
  );

  const progressPct  = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  const visibleTasks = showAll ? tasks : tasks.slice(0, VISIBLE_COUNT);

  const categoryColor: Record<TaskCategory, string> = {
    steuer:      "bg-blue-100 text-blue-700",
    nebenkosten: "bg-amber-100 text-amber-700",
  };

  const handleTaskClick = (task: Task) => {
    if (MODAL_TYPES.has(task.type)) {
      setActiveTask(task);
    } else {
      onNavigate?.(task.navigateTo, { propertyId: task.propertyId, aptId: task.aptId, aptTab: task.aptTab });
    }
  };

  const handleEditPropertySave = (data: Record<string, any>) => {
    if (!activeTask) return;
    onEditProperty?.(activeTask.propertyId, data);
  };

  const handleUpdateApartmentSave = (aptId: string, data: Record<string, any>) => {
    onUpdateApartment?.(aptId, data);
  };

  const handleDeclareVacant = (aptId: string) => {
    onUpdateApartment?.(aptId, { leerstand: true });
  };

  const handleAddRentPaymentSave = (month: number, nk: number) => {
    if (!activeTask?.aptId) return;
    onAddRentPayment?.({ apartmentId: activeTask.aptId, year: targetYear, month, nebenkostenWarm: nk });
  };

  const handlePropertyCostsSave = (costs: Array<{ line: string; name: string; value: number }>) => {
    if (!activeTask) return;
    for (const c of costs) {
      onAddCost?.({ propertyId: activeTask.propertyId, line: c.line, name: c.name, year: targetYear, value: c.value });
    }
  };

  const handleAptAllocationSave = (items: Array<{ line: string; name: string; value: number; verteiler?: number; anteil?: number; schluessel?: string }>) => {
    if (!activeTask?.aptId) return;
    for (const item of items) {
      onAddAptCost?.({ apartmentId: activeTask.aptId, line: item.line, name: item.name, year: targetYear, value: item.value, verteiler: item.verteiler, anteil: item.anteil, schluessel: item.schluessel });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            {t("title")} {targetYear}
          </CardTitle>
          <span className="text-sm font-semibold tabular-nums">{progressPct}%</span>
        </div>
        <div className="mt-2 space-y-1">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {tasks.length === 0 ? t("allDone") : t("progress", { done: passedChecks, total: totalChecks })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && tasks.length === 0 ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700">{t("allDone")}</p>
            <p className="text-xs text-muted-foreground">{t("allDoneDesc", { year: targetYear })}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(task => {
              const hasModal = MODAL_TYPES.has(task.type);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors",
                    hasModal ? "cursor-pointer hover:bg-primary/5 hover:border-primary/30" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", categoryColor[task.category])}>
                      {t(`categories.${task.category}`)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {t(`types.${task.type}`, { property: task.propertyName, apt: task.aptCode ?? "", year: targetYear })}
                      </p>
                      {task.aptCode && (
                        <p className="text-xs text-muted-foreground truncate">{task.propertyName} · {task.aptCode}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("shrink-0 h-7 px-2 gap-1 text-xs", hasModal && "text-primary")}
                    onClick={e => { e.stopPropagation(); handleTaskClick(task); }}
                  >
                    {hasModal ? (
                      <><Pencil className="h-3 w-3" />{t("enter", { defaultValue: "Eingeben" })}</>
                    ) : (
                      <>{t("go")}<ChevronRight className="h-3.5 w-3.5" /></>
                    )}
                  </Button>
                </div>
              );
            })}

            {tasks.length > VISIBLE_COUNT && (
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs text-muted-foreground" onClick={() => setShowAll(v => !v)}>
                {showAll ? t("showLess") : <><ChevronDown className="h-3.5 w-3.5 mr-1" />{t("showAll", { count: tasks.length - VISIBLE_COUNT })}</>}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={activeTask !== null} onOpenChange={open => { if (!open) setActiveTask(null); }}>
        {activeTask?.type === "missing-iban" && (
          <IbanModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleEditPropertySave} />
        )}
        {activeTask?.type === "missing-property-costs" && (
          <PropertyCostsModal
            task={activeTask}
            targetYear={targetYear}
            expenseTypes={expenseTypes}
            onClose={() => setActiveTask(null)}
            onSave={handlePropertyCostsSave}
          />
        )}
        {activeTask?.type === "missing-apt-allocation" && (
          <AptAllocationModal
            task={activeTask}
            targetYear={targetYear}
            allCosts={allCosts}
            properties={properties}
            apartments={apartments}
            expenseTypes={expenseTypes}
            onClose={() => setActiveTask(null)}
            onSave={handleAptAllocationSave}
          />
        )}
        {activeTask?.type === "missing-wohnflaeche" && (
          <WohnflaecheModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleUpdateApartmentSave} />
        )}
        {activeTask?.type === "missing-tenant" && (
          <TenantModal
            task={activeTask}
            onClose={() => setActiveTask(null)}
            onNavigate={() => onNavigate?.(activeTask.navigateTo, { propertyId: activeTask.propertyId, aptId: activeTask.aptId, aptTab: activeTask.aptTab })}
            onDeclareVacant={handleDeclareVacant}
          />
        )}
        {activeTask?.type === "missing-rent-payments" && (
          <RentPaymentsModal task={activeTask} year={targetYear} onClose={() => setActiveTask(null)} onSave={handleAddRentPaymentSave} />
        )}
        {activeTask && PROPERTY_FIELD_CONFIG[activeTask.type] && (
          <PropertyFieldModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleEditPropertySave} />
        )}
      </Dialog>
    </Card>
  );
}
