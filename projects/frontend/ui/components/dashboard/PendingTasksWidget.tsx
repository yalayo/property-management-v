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
  tenantId?: string;
  tenantName?: string;
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
  trialPaused?: boolean;
  onNavigate?: (tab: string, context?: NavContext) => void;
  onEditProperty?: (id: string, data: Record<string, any>) => void;
  onUpdateApartment?: (aptId: string, data: Record<string, any>) => void;
  onAddRentPayment?: (data: { apartmentId: string; year: number; month: number; kaltmiete: number; nebenkostenWarm: number }) => void;
  onAddRentPayments?: (data: { apartmentId: string; year: number; payments: { month: number; kaltmiete: number; nebenkostenWarm: number }[] }) => void;
  onAddCost?: (data: { propertyId: string; line: string; name: string; year: number; value: number }) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number; verteiler?: number; anteil?: number; schluessel?: string }) => void;
  onUpdateAptCost?: (data: { id: string; verteiler: number }) => void;
  onUpdateTenant?: (tenantId: string, data: Record<string, any>) => void;
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
  "missing-market-rent",
  "missing-tenant-startdate",
  "missing-tenant-miete",
  "missing-tenant-personenzahl",
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

      // Steuer: comparable (ortsübliche) rent for the §21(2) 66% check — only
      // meaningful for rented units, which is why it sits after the tenant gate.
      check(apt["market-rent"] != null && apt["market-rent"] !== "", {
        id: `steuer-${aptId}-market-rent`, category: "steuer", type: "missing-market-rent",
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "info",
        navigateTo: "apartments", priority: 27,
      });

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
      const aptCostType = hasPropertyCosts ? "missing-apt-allocation" : "missing-apt-costs";
      const allCostsCovered = hasPropertyCosts
        ? (() => {
            const propLines = allCosts
              .filter(c => String(c["property-id"]) === propId && Number(c.year) === year)
              .map(c => String(c.line));
            const aptLines = new Set(
              allAptCosts
                .filter(c => String(c["apartment-id"]) === aptId && Number(c.year) === year)
                .map(c => String(c.line))
            );
            return propLines.every(l => aptLines.has(l));
          })()
        : allAptCosts.some(c => String(c["apartment-id"]) === aptId && Number(c.year) === year);
      check(allCostsCovered, {
        id: `nk-${aptId}-aptcosts-${year}`, category: "nebenkosten", type: aptCostType,
        propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "costs",
        navigateTo: "apartments", priority: 12,
      });
    }
  }

  // Per-tenant completeness checks
  for (const tenant of tenants) {
    const tenantId   = String(tenant.id);
    const tenantName = [tenant["first-name"], tenant["last-name"]].filter(Boolean).join(" ") || tenantId;
    const s = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : null;
    const e = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : null;
    if (s && s > yearEnd)   continue;
    if (e && e < yearStart) continue;

    const aptId   = tenant["apartment-id"] != null ? String(tenant["apartment-id"]) : undefined;
    const apt     = aptId ? apartments.find(a => String(a.id) === aptId) : undefined;
    const aptCode = apt?.code ?? aptId ?? "";
    const propId  = apt ? String(apt["property-id"]) : "";
    const propName = properties.find(p => String(p.id) === propId)?.name ?? propId;
    const base    = { category: "nebenkosten" as TaskCategory, propertyId: propId, propertyName: propName, aptCode, aptId, tenantId, tenantName, navigateTo: "apartments" as const };

    check(!!tenant["start-date"], {
      ...base, id: `t-${tenantId}-startdate`, type: "missing-tenant-startdate", aptTab: "tenants", priority: 5,
    });
    check(
      (tenant.kaltmiete != null && tenant.kaltmiete !== "") &&
      (tenant["nebenkosten-warm"] != null && tenant["nebenkosten-warm"] !== ""),
      { ...base, id: `t-${tenantId}-miete`, type: "missing-tenant-miete", aptTab: "tenants", priority: 6 }
    );
    check(tenant["residents-count"] != null && tenant["residents-count"] !== "", {
      ...base, id: `t-${tenantId}-personenzahl`, type: "missing-tenant-personenzahl", aptTab: "tenants", priority: 6,
    });
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

function CostRow({ et, inputs, setInputs }: { et: any; inputs: Record<string, string>; setInputs: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div className="flex items-center gap-3">
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
  );
}

function PropertyCostsModal({ task, targetYear, expenseTypes, allCosts, onClose, onSave }: {
  task: Task;
  targetYear: number;
  expenseTypes: any[];
  allCosts: any[];
  onClose: () => void;
  onSave: (costs: Array<{ line: string; name: string; value: number }>) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [reusedKeys, setReusedKeys] = useState<Set<string>>(new Set());

  const prevYearCosts = useMemo(
    () => allCosts.filter(c => String(c["property-id"]) === task.propertyId && Number(c.year) === targetYear - 1),
    [allCosts, task.propertyId, targetYear]
  );

  const applyPrevYear = () => {
    const next: Record<string, string> = { ...inputs };
    const keys = new Set<string>();
    for (const c of prevYearCosts) {
      const v = typeof c.value === "number" ? c.value : parseFloat(c.value);
      if (!isNaN(v) && v > 0) { next[c.line] = String(v); keys.add(c.line); }
    }
    setInputs(next);
    setReusedKeys(keys);
  };

  const prevYearTypes = reusedKeys.size > 0 ? expenseTypes.filter(et => reusedKeys.has(et.key)) : [];
  const otherTypes    = reusedKeys.size > 0 ? expenseTypes.filter(et => !reusedKeys.has(et.key)) : expenseTypes;

  const filled = expenseTypes.filter(et => {
    const v = inputs[et.key];
    return v && v.trim() !== "" && !isNaN(parseFloat(v.replace(",", "."))) && parseFloat(v.replace(",", ".")) > 0;
  });

  return (
    <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
      <DialogHeader className="shrink-0">
        <DialogTitle>Kosten hinzufügen</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {targetYear}</p>
      </DialogHeader>

      {prevYearCosts.length > 0 && reusedKeys.size === 0 && (
        <div className="shrink-0 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Vorjahr ({targetYear - 1}) übernehmen?</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={applyPrevYear}>
            Übernehmen
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-1 min-h-0">
        {expenseTypes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Keine Kostenarten konfiguriert.</p>
        )}

        {prevYearTypes.length > 0 && (
          <>
            <div className="flex items-center gap-2 py-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vorjahr {targetYear - 1}</span>
              <div className="flex-1 border-t" />
              <Button variant="ghost" size="sm" className="h-5 px-1 text-xs text-muted-foreground" onClick={() => setReusedKeys(new Set())}>
                Zurücksetzen
              </Button>
            </div>
            {prevYearTypes.map(et => <CostRow key={et.key} et={et} inputs={inputs} setInputs={setInputs} />)}

            {otherTypes.length > 0 && (
              <div className="flex items-center gap-2 pt-2 pb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weitere Positionen</span>
                <div className="flex-1 border-t" />
              </div>
            )}
          </>
        )}

        {otherTypes.map(et => <CostRow key={et.key} et={et} inputs={inputs} setInputs={setInputs} />)}
      </div>

      <DialogFooter className="shrink-0 pt-2 border-t">
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

type AllocationLine = {
  line: string;
  name: string;
  total: number;
  verteiler: number | null;
  schluessel: string;
  defaultAnteil: number | null;
  missingReq: string | null;
  manual: boolean;
};

function AptAllocationModal({ task, targetYear, allCosts, allAptCosts, properties, apartments, tenants, expenseTypes, onClose, onSave }: {
  task: Task;
  targetYear: number;
  allCosts: any[];
  allAptCosts: any[];
  properties: any[];
  apartments: any[];
  tenants: any[];
  expenseTypes: any[];
  onClose: () => void;
  onSave: (items: Array<{ line: string; name: string; value: number; verteiler?: number; anteil?: number; schluessel?: string }>) => void;
}) {
  const savedAptLines = new Set(
    allAptCosts
      .filter(c => String(c["apartment-id"]) === task.aptId && Number(c.year) === targetYear)
      .map(c => String(c.line))
  );
  const propertyCosts = allCosts
    .filter(c => String(c["property-id"]) === task.propertyId && Number(c.year) === targetYear)
    .filter(c => !savedAptLines.has(String(c.line)));
  const property  = properties.find(p => String(p.id) === task.propertyId);
  const apt       = apartments.find(a => String(a.id) === task.aptId);
  const propApts  = apartments.filter(a => String(a["property-id"]) === task.propertyId);

  const aptWohnflaeche  = apt?.wohnflaeche != null ? parseFloat(String(apt.wohnflaeche)) : null;
  const propWohnflaeche = property?.["living-area-m2"] != null
    ? parseFloat(String(property["living-area-m2"]))
    : propApts.filter(a => a.wohnflaeche != null).reduce((s, a) => s + parseFloat(String(a.wohnflaeche)), 0) || null;

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear, 11, 31);

  const aptTenants = tenants.filter(t => {
    if (String(t["apartment-id"]) !== task.aptId) return false;
    const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
    const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
    return (!s || s <= yearEnd) && (!e || e >= yearStart);
  });
  const aptResidents = aptTenants.reduce((sum, t) => sum + (t["residents-count"] != null ? parseFloat(String(t["residents-count"])) : 0), 0) || null;

  const propAptIds = new Set(propApts.map(a => String(a.id)));
  const propResidents = tenants.filter(t => {
    if (!propAptIds.has(String(t["apartment-id"]))) return false;
    const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
    const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
    return (!s || s <= yearEnd) && (!e || e >= yearStart);
  }).reduce((sum, t) => sum + (t["residents-count"] != null ? parseFloat(String(t["residents-count"])) : 0), 0) || null;

  const lines: AllocationLine[] = useMemo(() => propertyCosts.map(c => {
    const et     = expenseTypes.find(e => e.key === c.line);
    const method = et?.["distribution-method"] ?? "living-area";
    const total  = typeof c.value === "number" ? c.value : parseFloat(String(c.value));
    const name   = et ? etName(et) : (c.name || c.line);

    switch (method) {
      case "living-area":
        return {
          line: c.line, name, total,
          verteiler: propWohnflaeche, schluessel: "Wohnfläche",
          defaultAnteil: aptWohnflaeche,
          missingReq: !aptWohnflaeche ? "Wohnfläche (m²)" : !propWohnflaeche ? "Gesamt-Wohnfläche" : null,
          manual: false,
        };
      case "person":
        return {
          line: c.line, name, total,
          verteiler: propResidents, schluessel: "Anzahl Personen",
          defaultAnteil: aptResidents,
          missingReq: !aptResidents ? "Anzahl Personen" : !propResidents ? "Gesamt-Personenzahl" : null,
          manual: false,
        };
      case "Wohneinheiten":
        return {
          line: c.line, name, total,
          verteiler: propApts.length, schluessel: "Wohneinheiten",
          defaultAnteil: 1,
          missingReq: null, manual: false,
        };
      default:
        return {
          line: c.line, name, total,
          verteiler: null, schluessel: "Manuell",
          defaultAnteil: null, missingReq: null, manual: true,
        };
    }
  }), [propertyCosts, aptWohnflaeche, propWohnflaeche, aptResidents, propResidents, propApts.length]);

  const [anteilInputs, setAnteilInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map(l => [l.line, l.defaultAnteil != null ? String(l.defaultAnteil) : ""]))
  );

  const getBetrag = (l: AllocationLine): number | null => {
    if (l.missingReq) return null;
    const v = parseFloat(anteilInputs[l.line]);
    if (isNaN(v) || v < 0) return null;
    if (l.manual || !l.verteiler) return v;
    return Math.min(l.total * v / l.verteiler, l.total);
  };

  const fmtEur = (v: number) => "€ " + v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const missingLines  = lines.filter(l => l.missingReq);
  const readyLines    = lines.filter(l => !l.missingReq && getBetrag(l) != null);
  const canSave       = missingLines.length === 0 && readyLines.length > 0;
  const grandTotal    = lines.reduce((s, l) => { const b = getBetrag(l); return s + (b ?? 0); }, 0);

  if (propertyCosts.length === 0) {
    return (
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Kostenumlage</DialogTitle>
          <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode}</p>
        </DialogHeader>
        <p className="py-3 text-sm text-muted-foreground">Keine Eigentumskosten für {targetYear} gefunden. Bitte zuerst Kosten beim Objekt hinzufügen.</p>
        <DialogFooter><Button variant="outline" onClick={onClose}>Schließen</Button></DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
      <DialogHeader className="shrink-0">
        <DialogTitle>Kostenumlage eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode} · {targetYear}</p>
      </DialogHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">Kostenart</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Gesamtkosten</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Verteiler</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Schlüssel</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Anteil</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-3">Betrag</th>
              <th className="w-4 pb-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const betrag  = getBetrag(l);
              const missing = !!l.missingReq;
              return (
                <tr key={l.line} className={cn("border-b last:border-b-0", missing && "opacity-50")}>
                  <td className="py-2.5 pr-3 font-medium">{l.name}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground tabular-nums">
                    {fmtEur(l.total)}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {l.verteiler != null ? l.verteiler : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground text-xs max-w-[90px] truncate">
                    {l.schluessel}
                  </td>
                  <td className="py-2.5 px-2">
                    {missing ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        max={!l.manual && l.verteiler != null ? l.verteiler : undefined}
                        step="0.01"
                        className="h-7 w-20 text-right text-sm ml-auto block"
                        value={anteilInputs[l.line] ?? ""}
                        onChange={e => setAnteilInputs(prev => ({ ...prev, [l.line]: e.target.value }))}
                      />
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-medium tabular-nums">
                    {betrag != null ? fmtEur(betrag) : "—"}
                  </td>
                  <td className="py-2.5 pl-1 text-muted-foreground/40 text-xs">
                    {betrag != null && !missing ? "✓" : ""}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={5} className="pt-3 text-sm font-medium text-muted-foreground">Gesamt</td>
              <td className="pt-3 pl-3 text-right font-semibold tabular-nums">{fmtEur(grandTotal)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {missingLines.length > 0 && (
        <div className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mt-2">
          <p className="font-medium text-xs mb-1">Fehlende Voraussetzungen — bitte zuerst ergänzen:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {missingLines.map(l => (
              <li key={l.line}><span className="font-medium">{l.name}:</span> {l.missingReq} fehlt</li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter className="shrink-0 pt-2 border-t mt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!canSave} onClick={() => {
          const items = readyLines.map(l => ({
            line: l.line,
            name: l.name,
            value: getBetrag(l)!,
            ...(l.verteiler != null && !l.manual ? { verteiler: l.verteiler } : {}),
            ...(!l.manual && anteilInputs[l.line] ? { anteil: parseFloat(anteilInputs[l.line]) } : {}),
            ...(l.schluessel && !l.manual ? { schluessel: l.schluessel } : {}),
          }));
          onSave(items);
          onClose();
        }}>
          Speichern ({readyLines.length} {readyLines.length === 1 ? "Position" : "Positionen"})
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const TENANT_FIELD_CONFIG: Record<string, { label: string; inputType: "date" | "number"; unit?: string; dataKey: string }> = {
  "missing-tenant-startdate":    { label: "Startdatum",           inputType: "date",   dataKey: "startDate" },
  "missing-tenant-personenzahl": { label: "Personen im Haushalt", inputType: "number", dataKey: "residentsCount" },
};

function TenantFieldModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (tenantId: string, data: Record<string, any>) => void }) {
  const cfg = TENANT_FIELD_CONFIG[task.type];
  const [value, setValue] = useState("");
  if (!cfg) return null;

  const isValid = value.trim() !== "" && (cfg.inputType !== "number" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0));

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>{cfg.label} eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {task.tenantName} · {task.propertyName} · {task.aptCode}
        </p>
      </DialogHeader>
      <div className="py-2 space-y-1">
        <Label className="text-xs">{cfg.label} *</Label>
        <div className="flex items-center gap-2">
          <Input
            type={cfg.inputType}
            min={cfg.inputType === "number" ? "0" : undefined}
            step={cfg.inputType === "number" ? (cfg.dataKey === "residentsCount" ? "1" : "0.01") : undefined}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={cfg.inputType === "date" ? "JJJJ-MM-TT" : ""}
            className="flex-1"
          />
          {cfg.unit && <span className="text-sm text-muted-foreground shrink-0">{cfg.unit}</span>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!isValid} onClick={() => {
          const parsed = cfg.inputType === "number" ? parseFloat(value) : value;
          onSave(task.tenantId!, { [cfg.dataKey]: parsed });
          onClose();
        }}>Speichern</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TenantMieteModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (tenantId: string, data: Record<string, any>) => void }) {
  const [kaltmiete, setKaltmiete]         = useState("");
  const [nebenkostenWarm, setNebenkostenWarm] = useState("");
  const kv = parseFloat(kaltmiete.replace(",", "."));
  const nv = parseFloat(nebenkostenWarm.replace(",", "."));
  const valid = !isNaN(kv) && kv >= 0 && !isNaN(nv) && nv >= 0 && (kaltmiete.trim() !== "" || nebenkostenWarm.trim() !== "");

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Mietangaben eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {task.tenantName} · {task.propertyName} · {task.aptCode}
        </p>
      </DialogHeader>
      <div className="py-2 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Kaltmiete *</Label>
          <div className="flex items-center gap-2">
            <Input type="number" min="0" step="0.01" className="flex-1" placeholder="0,00"
              value={kaltmiete} onChange={e => setKaltmiete(e.target.value)} />
            <span className="text-sm text-muted-foreground shrink-0">€</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nebenkosten warm *</Label>
          <div className="flex items-center gap-2">
            <Input type="number" min="0" step="0.01" className="flex-1" placeholder="0,00"
              value={nebenkostenWarm} onChange={e => setNebenkostenWarm(e.target.value)} />
            <span className="text-sm text-muted-foreground shrink-0">€</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!valid} onClick={() => {
          const data: Record<string, any> = {};
          if (kaltmiete.trim() !== "" && !isNaN(kv)) data.kaltmiete = kv;
          if (nebenkostenWarm.trim() !== "" && !isNaN(nv)) data.nebenkostenWarm = nv;
          onSave(task.tenantId!, data);
          onClose();
        }}>Speichern</Button>
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

function MarketRentModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (aptId: string, data: Record<string, any>) => void }) {
  const [value, setValue] = useState("");
  const num = parseFloat(value.replace(",", "."));
  const valid = value.trim() !== "" && !isNaN(num) && num > 0;
  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Ortsübliche Miete eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode}</p>
      </DialogHeader>
      <div className="py-2 space-y-1">
        <Label className="text-xs">Ortsübliche Miete (Kaltmiete) *</Label>
        <div className="flex items-center gap-2">
          <Input type="number" min="1" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="z.B. 850,00" className="flex-1" />
          <span className="text-sm text-muted-foreground shrink-0">€ / Mon.</span>
        </div>
        <p className="text-xs text-muted-foreground">Vergleichsmiete für die 66-%-Prüfung (Anlage V, §21 Abs. 2 EStG).</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={!valid} onClick={() => { onSave(task.aptId!, { marketRent: num }); onClose(); }}>Speichern</Button>
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

const MONTH_FULL = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function RentPaymentsModal({ task, year, tenants, allRentPayments, onClose, onSave, onSaveAll }: {
  task: Task;
  year: number;
  tenants: any[];
  allRentPayments: any[];
  onClose: () => void;
  onSave: (month: number, kalt: number, nk: number) => void;
  onSaveAll?: (payments: { month: number; kalt: number; nk: number }[]) => void;
}) {
  const paidMonths = useMemo(() => new Set(
    allRentPayments
      .filter(p => String(p["apartment-id"]) === task.aptId && Number(p.year) === year)
      .map(p => Number(p.month))
  ), [allRentPayments, task.aptId, year]);

  const months = (task.missingMonths ?? []).filter(m => !paidMonths.has(m));

  const activeTenant = useMemo(() => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year, 11, 31);
    return tenants.find(t => {
      if (String(t["apartment-id"]) !== task.aptId) return false;
      const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
      const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
      return (!s || s <= yearEnd) && (!e || e >= yearStart);
    });
  }, [tenants, task.aptId, year]);

  const tenantKalt = activeTenant?.kaltmiete != null ? parseFloat(String(activeTenant.kaltmiete)) : 0;
  const tenantNk   = activeTenant?.["nebenkosten-warm"] != null ? parseFloat(String(activeTenant["nebenkosten-warm"])) : 0;
  const hasTenantValues = tenantKalt + tenantNk > 0;

  const [inputs, setInputs] = useState<Record<number, { kalt: string; nk: string }>>(() =>
    Object.fromEntries(months.map(m => [m, { kalt: "", nk: "" }]))
  );

  const getKalt  = (m: number) => { const v = parseFloat(inputs[m]?.kalt ?? ""); return isNaN(v) ? 0 : v; };
  const getNk    = (m: number) => { const v = parseFloat(inputs[m]?.nk   ?? ""); return isNaN(v) ? 0 : v; };
  const getTotal = (m: number) => getKalt(m) + getNk(m);

  const filledMonths  = months.filter(m => getTotal(m) > 0);
  const grandTotal    = filledMonths.reduce((s, m) => s + getTotal(m), 0);

  const fillAllFromTenant = () =>
    setInputs(Object.fromEntries(months.map(m => [m, {
      kalt: tenantKalt > 0 ? tenantKalt.toFixed(2) : "",
      nk:   tenantNk   > 0 ? tenantNk.toFixed(2)   : "",
    }])));

  const fmtEur = (v: number) => "€ " + v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <DialogContent className="max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
      <DialogHeader className="shrink-0">
        <DialogTitle>Mietzahlungen eingeben</DialogTitle>
        <p className="text-sm text-muted-foreground">{task.propertyName} · {task.aptCode} · {year}</p>
      </DialogHeader>

      {hasTenantValues && (
        <div className="shrink-0 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Mietvertrag: Kaltmiete {tenantKalt > 0 ? fmtEur(tenantKalt) : "—"} · NK warm {tenantNk > 0 ? fmtEur(tenantNk) : "—"}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={fillAllFromTenant}>
            Alle Monate übernehmen
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">Monat</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Kaltmiete</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">NK warm</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-3">Gesamt</th>
              {hasTenantValues && <th className="w-8 pb-2" />}
              <th className="w-4 pb-2" />
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const total = getTotal(m);
              return (
                <tr key={m} className="border-b last:border-b-0">
                  <td className="py-2.5 pr-3 font-medium">{MONTH_FULL[m - 1]}</td>
                  <td className="py-2.5 px-2">
                    <Input
                      type="number" min="0" step="0.01"
                      className="h-7 w-28 text-right text-sm ml-auto block"
                      placeholder="0,00"
                      value={inputs[m]?.kalt ?? ""}
                      onChange={e => setInputs(prev => ({ ...prev, [m]: { ...prev[m], kalt: e.target.value } }))}
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <Input
                      type="number" min="0" step="0.01"
                      className="h-7 w-28 text-right text-sm ml-auto block"
                      placeholder="0,00"
                      value={inputs[m]?.nk ?? ""}
                      onChange={e => setInputs(prev => ({ ...prev, [m]: { ...prev[m], nk: e.target.value } }))}
                    />
                  </td>
                  <td className="py-2.5 pl-3 text-right font-medium tabular-nums">
                    {total > 0 ? fmtEur(total) : "—"}
                  </td>
                  {hasTenantValues && (
                    <td className="py-2.5 pl-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Aus Mietvertrag übernehmen"
                        disabled={!hasTenantValues}
                        onClick={() => setInputs(prev => ({ ...prev, [m]: {
                          kalt: tenantKalt > 0 ? tenantKalt.toFixed(2) : "",
                          nk:   tenantNk   > 0 ? tenantNk.toFixed(2)   : "",
                        } }))}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                      </Button>
                    </td>
                  )}
                  <td className="py-2.5 pl-1 text-xs text-muted-foreground/40">{total > 0 ? "✓" : ""}</td>
                </tr>
              );
            })}
            {filledMonths.length > 0 && (
              <tr>
                <td colSpan={hasTenantValues ? 3 : 2} className="pt-3 text-sm font-medium text-muted-foreground">Gesamt</td>
                <td className="pt-3 pl-3 text-right font-semibold tabular-nums">{fmtEur(grandTotal)}</td>
                {hasTenantValues && <td />}
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DialogFooter className="shrink-0 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button disabled={filledMonths.length === 0} onClick={() => {
          if (onSaveAll) {
            onSaveAll(filledMonths.map(m => ({ month: m, kalt: getKalt(m), nk: getNk(m) })));
          } else {
            for (const m of filledMonths) onSave(m, getKalt(m), getNk(m));
          }
          onClose();
        }}>
          Speichern ({filledMonths.length} {filledMonths.length === 1 ? "Monat" : "Monate"})
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
  trialPaused = false,
  onNavigate,
  onEditProperty,
  onUpdateApartment,
  onAddRentPayment,
  onAddRentPayments,
  onAddCost,
  onAddAptCost,
  onUpdateAptCost,
  onUpdateTenant,
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

  // While the trial is paused the account is frozen — don't prompt for data entry.
  if (trialPaused) return null;
  if (tasks.length === 0) return null;

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

  const handleAddRentPaymentSave = (month: number, kalt: number, nk: number) => {
    if (!activeTask?.aptId) return;
    onAddRentPayment?.({ apartmentId: activeTask.aptId, year: targetYear, month, kaltmiete: kalt, nebenkostenWarm: nk });
  };

  const handleAddAllRentPaymentsSave = (payments: { month: number; kalt: number; nk: number }[]) => {
    if (!activeTask?.aptId) return;
    onAddRentPayments?.({
      apartmentId: activeTask.aptId,
      year: targetYear,
      payments: payments.map(p => ({ month: p.month, kaltmiete: p.kalt, nebenkostenWarm: p.nk })),
    });
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

    // Propagate the new verteiler to existing entries of all other apartments in the same property
    if (onUpdateAptCost) {
      const otherAptIds = new Set(
        (apartments ?? [])
          .filter(a => String(a["property-id"]) === activeTask.propertyId && String(a.id) !== activeTask.aptId)
          .map(a => String(a.id))
      );
      for (const item of items) {
        if (item.verteiler == null || !item.schluessel || item.schluessel === "Manuell") continue;
        const toUpdate = (allAptCosts ?? []).filter(c =>
          otherAptIds.has(String(c["apartment-id"])) &&
          String(c.line) === item.line &&
          Number(c.year) === targetYear &&
          c["tenant-id"] == null
        );
        for (const entry of toUpdate) {
          onUpdateAptCost({ id: String(entry.id), verteiler: item.verteiler });
        }
      }
    }
  };

  const handleTenantFieldSave = (tenantId: string, data: Record<string, any>) => {
    onUpdateTenant?.(tenantId, data);
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
                        {t(`types.${task.type}`, { property: task.propertyName, apt: task.aptCode ?? "", tenant: task.tenantName ?? "", year: targetYear })}
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
            allCosts={allCosts}
            onClose={() => setActiveTask(null)}
            onSave={handlePropertyCostsSave}
          />
        )}
        {activeTask?.type === "missing-apt-allocation" && (
          <AptAllocationModal
            task={activeTask}
            targetYear={targetYear}
            allCosts={allCosts}
            allAptCosts={allAptCosts}
            properties={properties}
            apartments={apartments}
            tenants={tenants}
            expenseTypes={expenseTypes}
            onClose={() => setActiveTask(null)}
            onSave={handleAptAllocationSave}
          />
        )}
        {activeTask?.type === "missing-wohnflaeche" && (
          <WohnflaecheModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleUpdateApartmentSave} />
        )}
        {activeTask?.type === "missing-market-rent" && (
          <MarketRentModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleUpdateApartmentSave} />
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
          <RentPaymentsModal task={activeTask} year={targetYear} tenants={tenants} allRentPayments={allRentPayments} onClose={() => setActiveTask(null)} onSave={handleAddRentPaymentSave} onSaveAll={handleAddAllRentPaymentsSave} />
        )}
        {activeTask && PROPERTY_FIELD_CONFIG[activeTask.type] && (
          <PropertyFieldModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleEditPropertySave} />
        )}
        {activeTask?.type === "missing-tenant-miete" && (
          <TenantMieteModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleTenantFieldSave} />
        )}
        {activeTask && TENANT_FIELD_CONFIG[activeTask.type] && (
          <TenantFieldModal task={activeTask} onClose={() => setActiveTask(null)} onSave={handleTenantFieldSave} />
        )}
      </Dialog>
    </Card>
  );
}
