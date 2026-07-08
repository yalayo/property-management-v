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
  loans?: any[];
  year?: number;
  isLoading?: boolean;
  onNavigate?: (tab: string, context?: NavContext) => void;
  onEditProperty?: (id: string, data: Record<string, any>) => void;
  onAddRentPayment?: (data: { apartmentId: string; year: number; month: number; nebenkostenWarm: number }) => void;
};

// ── Task types that get an inline modal (vs. navigate-only) ───────────────────

const MODAL_TYPES = new Set([
  "missing-iban",
  "missing-rent-payments",
  "missing-acquisition-date",
  "missing-land-value",
  "missing-building-value",
  "missing-ownership-share",
  "missing-year-built",
  "missing-usage",
]);

// ── Months ────────────────────────────────────────────────────────────────────

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

// ── Task computation ──────────────────────────────────────────────────────────

function computeTasks(
  { properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs }: Required<
    Pick<Props, "properties" | "apartments" | "tenants" | "allAptCosts" | "allRentPayments" | "taxConfigs">
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

    // Steuer
    check(!!property["acquisition-date"], { id: `steuer-${propId}-acquisition-date`, category: "steuer", type: "missing-acquisition-date", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 20 });
    check(property["land-value"] != null,  { id: `steuer-${propId}-land-value`,        category: "steuer", type: "missing-land-value",        propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 21 });
    check(property["building-value"] != null, { id: `steuer-${propId}-building-value`, category: "steuer", type: "missing-building-value",     propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 22 });
    check(property["ownership-share"] != null, { id: `steuer-${propId}-ownership-share`, category: "steuer", type: "missing-ownership-share", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 23 });
    check(property["year-built"] != null,  { id: `steuer-${propId}-year-built`,         category: "steuer", type: "missing-year-built",        propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 24 });
    check(!!property.usage,                { id: `steuer-${propId}-usage`,              category: "steuer", type: "missing-usage",             propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 25 });

    const taxConfig = taxConfigs.find(c => String(c["property-id"]) === propId);
    check(!!(taxConfig && taxConfig["building-value"] != null), { id: `steuer-${propId}-afa-config`, category: "steuer", type: "missing-afa-config", propertyId: propId, propertyName: propName, navigateTo: "tax", priority: 26 });

    // Nebenkosten — property level
    check(!!property.iban, { id: `nk-${propId}-iban`, category: "nebenkosten", type: "missing-iban", propertyId: propId, propertyName: propName, navigateTo: "properties", priority: 10 });

    // Nebenkosten — per occupied apartment
    for (const apt of apartments.filter(a => String(a["property-id"]) === propId)) {
      const aptId   = String(apt.id);
      const aptCode = apt.code || aptId;

      const aptTenants = tenants.filter(t => {
        if (String(t["apartment-id"]) !== aptId) return false;
        const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
        const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
        return (!s || s <= yearEnd) && (!e || e >= yearStart);
      });
      if (!aptTenants.length) continue;

      const activeMonths = new Set<number>();
      for (const t of aptTenants) for (const m of tenantActiveMonths(t, year)) activeMonths.add(m);
      const paidMonths = new Set<number>(
        allRentPayments.filter(p => String(p["apartment-id"]) === aptId && Number(p.year) === year).map(p => Number(p.month))
      );
      const missingMonths = [...activeMonths].filter(m => !paidMonths.has(m)).sort((a, b) => a - b);

      check(missingMonths.length === 0, { id: `nk-${aptId}-rent-${year}`, category: "nebenkosten", type: "missing-rent-payments", propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "rent", navigateTo: "apartments", priority: 11, missingMonths });
      check(allAptCosts.some(c => String(c["apartment-id"]) === aptId && Number(c.year) === year), { id: `nk-${aptId}-aptcosts-${year}`, category: "nebenkosten", type: "missing-apt-costs", propertyId: propId, propertyName: propName, aptCode, aptId, aptTab: "costs", navigateTo: "apartments", priority: 12 });
    }
  }

  return { tasks: tasks.sort((a, b) => a.priority - b.priority), totalChecks, passedChecks };
}

// ── Modals ────────────────────────────────────────────────────────────────────

function IbanModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (data: Record<string, any>) => void }) {
  const [iban, setIban]                         = useState("");
  const [bankName, setBankName]                 = useState("");
  const [landlordName, setLandlordName]         = useState("");
  const [landlordStreet, setLandlordStreet]     = useState("");
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
              <Input
                type="number"
                min="0"
                step="0.01"
                className="h-8 text-sm"
                placeholder="0,00"
                value={values[m] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, [m]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button
          disabled={filledCount === 0}
          onClick={() => {
            for (const m of months) {
              const v = parseFloat(values[m] ?? "");
              if (!isNaN(v)) onSave(m, v);
            }
            onClose();
          }}
        >
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
            <Input
              type={cfg.inputType}
              value={value}
              onChange={e => setValue(e.target.value)}
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
  loans = [],
  year,
  isLoading = false,
  onNavigate,
  onEditProperty,
  onAddRentPayment,
}: Props) {
  const { t } = useTranslation("tasks");
  const [showAll, setShowAll]       = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const targetYear = year ?? new Date().getFullYear() - 1;

  const { tasks, totalChecks, passedChecks } = useMemo(
    () => computeTasks({ properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs }, targetYear),
    [properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs, targetYear]
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

  const handleAddRentPaymentSave = (month: number, nk: number) => {
    if (!activeTask?.aptId) return;
    onAddRentPayment?.({ apartmentId: activeTask.aptId, year: targetYear, month, nebenkostenWarm: nk });
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
