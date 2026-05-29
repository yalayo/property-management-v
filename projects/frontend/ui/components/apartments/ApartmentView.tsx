import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Trash2, Loader2,
  DoorOpen, DoorClosed, UserPlus, Clock, CheckCircle2,
  Search, Pencil, Check, X, AlertCircle, Copy, Plus, UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const SCHLUESSEL_OPTIONS = ["Wohnfläche", "Verbraucht", "Anzahl Personen", "MEA"];

type Apartment = {
  id: number;
  "property-id"?: number;
  property_id?: number;
  code: string;
  occupied: number | boolean;
};

type OnboardingStatus = {
  id: number;
  apartment_id: number;
  email: string;
  status: string;
  created_at?: string;
};

type Tenant = {
  id: string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  email?: string;
  phone?: string;
  "apartment-id"?: string | number;
  "start-date"?: string;
  "end-date"?: string;
  kaltmiete?: number | string;
  "nebenkosten-warm"?: number | string;
};

type TenantUpdateData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
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
  apartment?: Apartment | null;
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
  isSaving?: boolean;
  tenantsSaving?: boolean;
  isReadOnly?: boolean;
  isOnboarding?: boolean;
  onboardingStatus?: OnboardingStatus | null;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onToggleOccupied?: (id: number, occupied: boolean) => void;
  onStartOnboarding?: (apartmentId: number, email: string) => void;
  onAssignExistingTenant?: (apartmentId: number, tenantId: string) => void;
  onAfterAssign?: () => void;
  onUpdateTenant?: (tenantId: string, data: TenantUpdateData) => void;
  onCreateTenant?: (apartmentId: number, data: { firstName: string; lastName?: string; email?: string; phone?: string; startDate: string; endDate?: string }) => void;
  createTenantError?: string;
  initialTab?: "tenants" | "rent" | "costs" | "settings";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDateParts(dateStr: string | undefined): { year: number | null; month: number | null } {
  if (!dateStr) return { year: null, month: null };
  const parts = dateStr.split("-");
  return {
    year:  isNaN(parseInt(parts[0], 10)) ? null : parseInt(parts[0], 10),
    month: isNaN(parseInt(parts[1], 10)) ? null : parseInt(parts[1], 10),
  };
}

function parseYear(dateStr: string | undefined): number | null {
  const { year } = parseDateParts(dateStr);
  return year;
}

function tenantActiveInYear(tenant: Tenant, year: number): boolean {
  const sy = parseYear(tenant["start-date"]);
  const ey = parseYear(tenant["end-date"]);
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

function isActiveTenant(tenant: Tenant): boolean {
  const ed = tenant["end-date"];
  return !ed || ed === "";
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

function tenantDateRange(tn: Tenant, openLabel: string): string {
  const sd = tn["start-date"];
  const ed = tn["end-date"];
  if (sd && ed) return `${sd} – ${ed}`;
  if (sd)       return `${sd} – ${openLabel}`;
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ApartmentView({
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
  isSaving = false,
  tenantsSaving = false,
  isReadOnly = false,
  isOnboarding = false,
  onboardingStatus,
  onBack,
  onDelete,
  onToggleOccupied,
  onStartOnboarding,
  onAssignExistingTenant,
  onAfterAssign,
  onUpdateTenant,
  onCreateTenant,
  createTenantError,
  initialTab,
}: Props) {
  const { t }         = useTranslation("apartments");
  const { t: tCosts } = useTranslation("costs");
  const { t: tT }     = useTranslation("tenants");
  const { t: tCommon }= useTranslation("common");
  const { i18n }      = useTranslation();
  const { toast }     = useToast();

  const createTenantErrorMsg = createTenantError === "date-overlap"
    ? tT("validation.dateOverlap")
    : createTenantError
    ? tT("validation.saveFailed")
    : undefined;

  // ── Shared state ────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 1;
  const [year, setYear] = useState(defaultYear);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"tenants" | "rent" | "costs" | "settings">("tenants");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // ── Tenants-tab state ────────────────────────────────────────────────────
  const [mgmtTenantTab,    setMgmtTenantTab]    = useState<string | null>(null);
  const [editingTenantId,  setEditingTenantId]  = useState<string | null>(null);
  const [editForm,         setEditForm]         = useState<TenantUpdateData>({});
  const [onboardingMode,   setOnboardingMode]   = useState<"create" | "assign">("create");
  const [tenantSearch,     setTenantSearch]     = useState("");
  const [tenantEmail,      setTenantEmail]      = useState("");
  const [emailError,       setEmailError]       = useState("");
  const [localAssignedTenant, setLocalAssignedTenant] = useState<Tenant | null>(null);
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    startDate: `${new Date().getFullYear()}-01-01`, endDate: "",
  });

  // ── Rent/Costs-tabs shared tenant selection ─────────────────────────────
  const [dataTenantTab, setDataTenantTab] = useState<string | null>(null);

  // ── Rent-tab state ───────────────────────────────────────────────────────
  const [rentInput, setRentInput] = useState<Record<number, { kaltmiete: string; nebenkostenWarm: string } | null>>({});

  // ── Costs-tab state ──────────────────────────────────────────────────────
  const [costInput,   setCostInput]  = useState<Record<string, CostEditFields | null>>({});
  const [savingKeys,  setSavingKeys] = useState<Set<string>>(new Set());
  const [addLineOpen, setAddLineOpen]= useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (apartment?.id) {
      onLoadAptCosts?.(String(apartment.id));
      onLoadRentPayments?.(String(apartment.id));
    }
  }, [apartment?.id]);

  useEffect(() => {
    setCostInput({});
    setRentInput({});
    setSavingKeys(new Set());
    setDataTenantTab(null);
    setMgmtTenantTab(null);
    setEditingTenantId(null);
    setEditForm({});
    setAddForm(f => ({ ...f, startDate: `${year}-01-01`, endDate: "" }));
  }, [year]);

  // Auto-close pending cost edits once saved
  const prevAptCostsRef = useRef(aptCosts);
  useEffect(() => {
    if (savingKeys.size === 0) return;
    const yearEntries = aptCosts.filter((c: any) => Number(c.year) === year);
    const nowSaved = [...savingKeys].filter(k => yearEntries.some((c: any) => c.line === k));
    if (nowSaved.length > 0) {
      setCostInput(prev => { const n = { ...prev }; nowSaved.forEach(k => delete n[k]); return n; });
      setSavingKeys(prev => { const n = new Set(prev); nowSaved.forEach(k => n.delete(k)); return n; });
    }
    prevAptCostsRef.current = aptCosts;
  }, [aptCosts, year, savingKeys]);

  if (!apartment) {
    return (
      <div className="rounded-xl border p-12 text-center text-muted-foreground">
        {t("notFound")}
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const isOccupied  = !!apartment.occupied;
  const propertyId  = apartment["property-id"] ?? (apartment as any).property_id;
  const property    = properties.find((p: any) => p.id === propertyId);

  const aptTenants   = tenants.filter(tn => String(tn["apartment-id"]) === String(apartment.id));

  // Year-filtered tenants (with optimistic local assignment for mgmt tab)
  const aptTenantsWithLocal =
    localAssignedTenant && !aptTenants.some(tn => tn.id === localAssignedTenant.id)
      ? [...aptTenants, { ...localAssignedTenant, "apartment-id": apartment.id }]
      : aptTenants;
  const yearTenants     = aptTenantsWithLocal.filter(tn => tenantActiveInYear(tn, year));
  const mgmtTenant      = yearTenants.find(tn => tn.id === mgmtTenantTab) ?? yearTenants[0] ?? null;
  const dataSelectedTenant = yearTenants.find(tn => tn.id === dataTenantTab) ?? yearTenants[0] ?? null;
  const visibleMonths: readonly number[] = dataSelectedTenant ? tenantMonthsInYear(dataSelectedTenant, year) : MONTHS;

  // Unassigned tenants for "assign existing"
  const filteredUnassigned = tenants.filter(tn => {
    if (tn["apartment-id"]) return false;
    const q = tenantSearch.toLowerCase();
    return !q || tenantDisplayName(tn).toLowerCase().includes(q) || tn.email?.toLowerCase().includes(q);
  });

  // ── Property cost helpers ─────────────────────────────────────────────────
  const propertyCosts = React.useMemo(() => {
    if (!propertyId) return [];
    return allCosts.filter((c: any) => String(c["property-id"]) === String(propertyId));
  }, [allCosts, propertyId]);

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
    const tDays = dataSelectedTenant ? tenantDaysInYear(dataSelectedTenant, year) : yearDays;
    const value = tDays < yearDays ? fullShare * (tDays / yearDays) : fullShare;
    return value.toFixed(2);
  };

  // ── Cost line helpers ─────────────────────────────────────────────────────
  const costLines: CostLine[] = expenseTypes;
  const yearCostEntries       = aptCosts.filter((c: any) => Number(c.year) === year);
  const savedCostKeys         = yearCostEntries.map((c: any) => c.line as string);
  const costEntryFor    = (lineId: string) => yearCostEntries.find((c: any) => c.line === lineId) ?? null;
  const inheritedCostFor= (lineId: string) =>
    [...aptCosts].filter((c: any) => c.line === lineId && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;

  const openCostEdit  = (lineId: string, fields: CostEditFields) =>
    setCostInput(prev => ({ ...prev, [lineId]: fields }));
  const closeCostEdit = (lineId: string) =>
    setCostInput(prev => { const n = { ...prev }; delete n[lineId]; return n; });

  const commitCost = (lineKey: string) => {
    const fields = costInput[lineKey];
    if (!fields) return;
    const value = parseFloat(fields.value.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const verteilerVal = parseFloat(fields.verteiler.replace(",", "."));
    const anteilVal    = parseFloat(fields.anteil.replace(",", "."));
    const payload = {
      value,
      verteiler:  isNaN(verteilerVal) ? undefined : verteilerVal,
      anteil:     isNaN(anteilVal)    ? undefined : anteilVal,
      schluessel: fields.schluessel.trim() || undefined,
    };
    const existing = costEntryFor(lineKey);
    if (existing) {
      onUpdateAptCost?.({ id: existing.id, ...payload });
      closeCostEdit(lineKey);
    } else {
      const line = costLines.find(l => l.key === lineKey);
      if (!line) return;
      onAddAptCost?.({ apartmentId: String(apartment.id), line: lineKey, name: costLineName(line, i18n.language), year, ...payload });
      setSavingKeys(prev => new Set([...prev, lineKey]));
    }
    toast({ title: tCommon("saved") });
  };

  const pendingCostKeys     = [...savingKeys].filter(k => !savedCostKeys.includes(k));
  const editingNewCostKeys  = Object.keys(costInput).filter(k => costInput[k] != null && !savedCostKeys.includes(k) && !savingKeys.has(k));
  const activeCostLines = [
    ...savedCostKeys.map(k => costLines.find(l => l.key === k)),
    ...pendingCostKeys.map(k => costLines.find(l => l.key === k)),
    ...editingNewCostKeys.map(k => costLines.find(l => l.key === k)),
  ].filter(Boolean) as CostLine[];
  const availableCostLines  = costLines.filter(l => !savedCostKeys.includes(l.key) && costInput[l.key] == null && !savingKeys.has(l.key));
  const prevCostLinesToCopy = availableCostLines.filter(l => inheritedCostFor(l.key));

  const handleSelectCostLine = (key: string) => {
    const line = costLines.find(l => l.key === key);
    if (!line) return;
    const inherited     = inheritedCostFor(line.key);
    const defaultVert   = inherited?.verteiler != null ? String(inherited.verteiler) : "100";
    const defaultAnteil = inherited?.anteil    != null ? String(inherited.anteil)    : "";
    const defaultValue  = inherited ? String(inherited.value) : calculateShare(key, defaultVert, defaultAnteil);
    openCostEdit(line.key, {
      value:      defaultValue,
      verteiler:  defaultVert,
      schluessel: String(inherited?.schluessel ?? "Wohnfläche"),
      anteil:     defaultAnteil,
      fixedValue: false,
    });
    setAddLineOpen(false);
  };

  const copyPrevYearCosts = () => {
    prevCostLinesToCopy.forEach(line => {
      const prev = inheritedCostFor(line.key);
      if (prev) {
        onAddAptCost?.({
          apartmentId: String(apartment.id), line: line.key,
          name: costLineName(line, i18n.language), year,
          value:      Number(prev.value),
          verteiler:  prev.verteiler != null ? Number(prev.verteiler) : undefined,
          anteil:     prev.anteil    != null ? Number(prev.anteil)    : undefined,
          schluessel: prev.schluessel || undefined,
        });
      }
    });
  };

  // ── Rent helpers ───────────────────────────────────────────────────────────
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
      const tenantKalt = parseFloat(String(dataSelectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
      const tenantNk   = parseFloat(String(dataSelectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
      const initialTotal = Number(entry.value);
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
      onAddRentPayment?.({ apartmentId: String(apartment.id), year, month, value, kaltmiete: kalt, nebenkostenWarm: nk });
    }
    closeRentEdit(month);
    toast({ title: tCommon("saved") });
  };

  const prevRentMonthsToCopy = MONTHS.filter(m => {
    const prev = rentPayments.find((r: any) => Number(r.month) === m && Number(r.year) === year - 1);
    return prev && !rentEntryFor(m);
  });

  const copyPrevYearRent = () => {
    prevRentMonthsToCopy.forEach(month => {
      const prev = rentPayments.find((r: any) => Number(r.month) === month && Number(r.year) === year - 1);
      if (prev) onAddRentPayment?.({
        apartmentId: String(apartment.id), year, month, value: Number(prev.value),
        ...(prev.kaltmiete != null && { kaltmiete: Number(prev.kaltmiete) }),
        ...(prev["nebenkosten-warm"] != null && { nebenkostenWarm: Number(prev["nebenkosten-warm"]) }),
      });
    });
  };

  const monthName = (m: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(new Date(2024, m - 1, 1));

  // ── Tenant management handlers ────────────────────────────────────────────
  const changeYear = (delta: number) => setYear(y => y + delta);

  const handleToggle = (checked: boolean) => onToggleOccupied?.(apartment.id, checked);

  const handleDelete = () => {
    onDelete?.(apartment.id);
    setConfirmDelete(false);
    toast({ title: tCommon("deleted") });
  };

  const handleOnboarding = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tenantEmail) { setEmailError(t("onboarding.emailRequired")); return; }
    if (!emailRegex.test(tenantEmail)) { setEmailError(t("onboarding.emailInvalid")); return; }
    setEmailError("");
    onStartOnboarding?.(apartment.id, tenantEmail);
    setTenantEmail("");
  };

  const handleCreateTenant = () => {
    if (!addForm.firstName.trim()) return;
    onCreateTenant?.(apartment.id, {
      firstName: addForm.firstName.trim(),
      lastName:  addForm.lastName || undefined,
      email:     addForm.email || undefined,
      phone:     addForm.phone || undefined,
      startDate: addForm.startDate || `${year}-01-01`,
      endDate:   addForm.endDate || undefined,
    });
    setAddForm({ firstName: "", lastName: "", email: "", phone: "", startDate: `${year}-01-01`, endDate: "" });
    toast({ title: tCommon("saved") });
  };

  const handleAssignExisting = (tenant: Tenant) => {
    setLocalAssignedTenant(tenant);
    onAssignExistingTenant?.(apartment.id, tenant.id);
    onAfterAssign?.();
    toast({ title: tCommon("saved") });
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setEditForm({
      firstName: tenant["first-name"] ?? tenant.name ?? "",
      lastName:  tenant["last-name"] ?? "",
      email:     tenant.email ?? "",
      phone:     tenant.phone ?? "",
      startDate: tenant["start-date"] ?? "",
      endDate:   tenant["end-date"] ?? "",
    });
  };

  const cancelEdit = () => { setEditingTenantId(null); setEditForm({}); };

  const saveEdit = (tenantId: string) => {
    const orig = yearTenants.find(tn => tn.id === tenantId);
    const changed: TenantUpdateData = {};
    if ((editForm.firstName ?? "") !== (orig?.["first-name"] ?? orig?.name ?? "")) changed.firstName = editForm.firstName;
    if ((editForm.lastName  ?? "") !== (orig?.["last-name"]  ?? ""))               changed.lastName  = editForm.lastName;
    if ((editForm.email     ?? "") !== (orig?.email          ?? ""))               changed.email     = editForm.email;
    if ((editForm.phone     ?? "") !== (orig?.phone          ?? ""))               changed.phone     = editForm.phone;
    if ((editForm.startDate ?? "") !== (orig?.["start-date"] ?? ""))               changed.startDate = editForm.startDate;
    if ((editForm.endDate   ?? "") !== (orig?.["end-date"]   ?? ""))               changed.endDate   = editForm.endDate;
    if (Object.keys(changed).length > 0) {
      onUpdateTenant?.(tenantId, changed);
      toast({ title: tCommon("saved") });
    }
    setEditingTenantId(null);
    setEditForm({});
  };

  // ── Inline sub-components ─────────────────────────────────────────────────

  const YearNav = () => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeYear(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className={`min-w-[3rem] text-center text-sm font-semibold tabular-nums px-2 py-0.5 rounded-md border ${
        year !== defaultYear
          ? "border-amber-400 bg-amber-50 text-amber-800"
          : "border-transparent text-foreground"
      }`}>{year}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeYear(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const YearBanner = () => year !== defaultYear ? (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <CalendarClock className="h-4 w-4 shrink-0" />
      <span className="flex-1">{tCosts(year < defaultYear ? "yearBanner.past" : "yearBanner.future", { year })}</span>
      <button
        className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap hover:text-amber-900"
        onClick={() => setYear(defaultYear)}
      >
        {tCosts("yearBanner.returnTo", { year: defaultYear })}
      </button>
    </div>
  ) : null;

  const CostRow = ({ line }: { line: CostLine }) => {
    const entry    = costEntryFor(line.key);
    const fields   = costInput[line.key];
    const isSavingLine = savingKeys.has(line.key);
    const isEditing = fields != null && !isSavingLine;
    const name = costLineName(line, i18n.language);

    if (isSavingLine) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 opacity-60">
          <span className="flex-1 font-medium">{name}</span>
          <span className="text-xs text-muted-foreground italic">{tCosts("save")}…</span>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="px-4 py-3 text-sm border-b last:border-b-0 space-y-3">
          <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">{name}</p>
          {!fields.fixedValue && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{tCosts("verteiler")}</label>
                <Input type="text" inputMode="decimal" value={fields.verteiler}
                  onChange={e => {
                    const val = e.target.value;
                    const calc = calculateShare(line.key, val, fields!.anteil);
                    setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, verteiler: val, ...(calc ? { value: calc } : {}) } }));
                  }}
                  onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                  className="h-7 text-sm text-right" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{tCosts("schluessel")}</label>
                <Input type="text" list={`schluessel-opts-${line.key}`} value={fields.schluessel}
                  onChange={e => setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, schluessel: e.target.value } }))}
                  onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                  className="h-7 text-sm" />
                <datalist id={`schluessel-opts-${line.key}`}>
                  {SCHLUESSEL_OPTIONS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{tCosts("anteil")}</label>
                <Input type="text" inputMode="decimal" value={fields.anteil}
                  onChange={e => {
                    const val = e.target.value;
                    const calc = calculateShare(line.key, fields!.verteiler, val);
                    setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, anteil: val, ...(calc ? { value: calc } : {}) } }));
                  }}
                  onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                  className="h-7 text-sm text-right" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id={`fixed-${line.key}`} checked={fields.fixedValue}
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
              {tCosts("fixedValue")}
            </label>
          </div>
          {fields.fixedValue ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{tCosts("gesamtkosten")} (€)</span>
                <Input type="text" inputMode="decimal" value={fields.value}
                  onChange={e => setCostInput(prev => ({ ...prev, [line.key]: { ...prev[line.key]!, value: e.target.value } }))}
                  onKeyDown={e => { if (e.key === "Enter") commitCost(line.key); if (e.key === "Escape") closeCostEdit(line.key); }}
                  className="h-7 text-sm text-right w-32" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving || !fields.value} onClick={() => commitCost(line.key)}>{tCosts("save")}</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.key)}>{tCosts("cancel")}</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {tCosts("gesamtkosten")}:{" "}
                <span className="font-semibold text-foreground">
                  {fields.value ? `€ ${parseFloat(fields.value).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 px-3" disabled={aptCostsSaving || !fields.value} onClick={() => commitCost(line.key)}>{tCosts("save")}</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => closeCostEdit(line.key)}>{tCosts("cancel")}</Button>
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
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={aptCostsSaving}
              onClick={() => openCostEdit(line.key, {
                value:      String(entry.value),
                verteiler:  entry.verteiler != null ? String(entry.verteiler) : "",
                schluessel: String(entry.schluessel ?? ""),
                anteil:     entry.anteil != null ? String(entry.anteil) : "",
                fixedValue: false,
              })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={aptCostsSaving} onClick={() => { onDeleteAptCost?.(entry.id); toast({ title: tCommon("deleted") }); }}>
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
    const tenantKalt = parseFloat(String(dataSelectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
    const tenantNk   = parseFloat(String(dataSelectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
    const hasTenant  = dataSelectedTenant != null;

    if (isEditing) {
      const kalt  = parseFloat(fields!.kaltmiete.replace(",", ".")) || 0;
      const nk    = parseFloat(fields!.nebenkostenWarm.replace(",", ".")) || 0;
      const total = kalt + nk;
      return (
        <div className="flex items-center gap-2 px-4 py-3 text-sm border-b last:border-b-0">
          <span className="font-medium capitalize shrink-0">{monthName(month)}</span>
          <Input autoFocus type="text" inputMode="decimal" placeholder={tCosts("rent.kaltmiete")}
            value={fields!.kaltmiete}
            onChange={e => setRentInput(prev => ({ ...prev, [month]: { ...prev[month]!, kaltmiete: e.target.value } }))}
            onKeyDown={e => { if (e.key === "Enter") commitRent(month); if (e.key === "Escape") closeRentEdit(month); }}
            className="h-7 text-sm text-right flex-1 min-w-0" />
          <Input type="text" inputMode="decimal" placeholder={tCosts("rent.nebenkostenWarm")}
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
              {tCosts("fillFromTenant")}
            </Button>
          )}
          <Button size="sm" className="h-7 px-3 shrink-0" disabled={rentSaving || total <= 0} onClick={() => commitRent(month)}>{tCosts("save")}</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => closeRentEdit(month)}>{tCosts("cancel")}</Button>
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
                title={tCosts("fillFromTenant")} disabled={rentSaving || tenantKalt + tenantNk <= 0}
                onClick={() => {
                  const value = tenantKalt + tenantNk;
                  if (value > 0) { onAddRentPayment?.({ apartmentId: String(apartment.id), year, month, value, kaltmiete: tenantKalt, nebenkostenWarm: tenantNk }); toast({ title: tCommon("saved") }); }
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon("back").replace("← ", "")}
          </Button>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-xl font-bold">{apartment.code}</h2>
            <Badge
              variant={isOccupied ? "secondary" : "outline"}
              className={isOccupied ? "" : "text-green-600 border-green-300"}
            >
              {isOccupied
                ? <><DoorClosed className="h-3.5 w-3.5 mr-1" />{t("occupied")}</>
                : <><DoorOpen   className="h-3.5 w-3.5 mr-1" />{t("available")}</>}
            </Badge>
            {property && (
              <span className="text-sm text-muted-foreground">
                {property.name}
                {property.address && <> · {property.address}</>}
                {property.city    && <>, {property.city}</>}
              </span>
            )}
          </div>
        </div>
        <YearNav />
      </div>
      {YearBanner()}

      {/* ── Tab bar (segmented control) ── */}
      <div className="bg-muted rounded-lg p-1 flex mb-5">
        {(["tenants", "rent", "costs", "settings"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition-all text-center ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* ── Tenants tab ── */}
      {activeTab === "tenants" && (<div className="space-y-4">

          {yearTenants.length === 0 ? (
            <>
              {!isOccupied && (
                <div className="rounded-xl border border-dashed p-4 flex items-center gap-3 text-sm text-muted-foreground">
                  <DoorOpen className="h-4 w-4 text-green-500 shrink-0" />
                  {t("vacantMessage")}
                </div>
              )}
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                {t("noTenantsInYear", { year })}
              </div>
            </>
          ) : (
            <>
              {/* Inner tenant selector */}
              {yearTenants.length > 1 && (
                <div className="flex border rounded-xl overflow-x-auto bg-muted/30">
                  {yearTenants.map((tn) => (
                    <button
                      key={tn.id}
                      type="button"
                      className={`flex-1 min-w-0 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                        mgmtTenant?.id === tn.id
                          ? "bg-background border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                      onClick={() => { setMgmtTenantTab(tn.id); setEditingTenantId(null); setEditForm({}); }}
                    >
                      <span className="truncate block font-semibold">{tenantDisplayName(tn)}</span>
                      <span className="block text-xs font-normal text-muted-foreground truncate">
                        {tn["start-date"] ?? ""}
                        {" – "}
                        {tn["end-date"] || t("openEnded")}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Summary card for selected tenant */}
              {mgmtTenant && (() => {
                const k  = parseFloat(String(mgmtTenant.kaltmiete ?? 0).replace(",", ".")) || 0;
                const nk = parseFloat(String(mgmtTenant["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
                const total = k + nk;
                return (
                  <div className="rounded-xl border bg-card p-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{tT("fields.name")}</p>
                        <p className="font-semibold text-sm">{tenantDisplayName(mgmtTenant)}</p>
                        {mgmtTenant.email && <p className="text-sm text-muted-foreground">{mgmtTenant.email}</p>}
                        {mgmtTenant.phone && <p className="text-sm text-muted-foreground">{mgmtTenant.phone}</p>}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t("tabs.rent")}</p>
                        {k > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Kaltmiete</span>
                            <span className="tabular-nums">€ {formatEur(k)}</span>
                          </div>
                        )}
                        {nk > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nebenkosten</span>
                            <span className="tabular-nums">€ {formatEur(nk)}</span>
                          </div>
                        )}
                        {total > 0 && (
                          <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
                            <span>{t("totalPerMonth")}</span>
                            <span className="tabular-nums">€ {formatEur(total)}</span>
                          </div>
                        )}
                      </div>
                      {mgmtTenant["start-date"] && (
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t("leasePeriod")}</p>
                          <p className="text-sm">{mgmtTenant["start-date"]}</p>
                          <p className="text-sm text-muted-foreground">
                            → {mgmtTenant["end-date"] || t("openEnded")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Edit form / onboarding */}
              {mgmtTenant && (
                <div className="rounded-xl border overflow-hidden">
                  <div className="p-4 space-y-4">
                    {editingTenantId === mgmtTenant.id ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.firstName")}</Label>
                            <Input value={editForm.firstName ?? ""} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.lastName")}</Label>
                            <Input value={editForm.lastName ?? ""} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.email")}</Label>
                            <Input type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.phone")}</Label>
                            <Input type="tel" value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.startDate")}</Label>
                            <Input type="date" value={editForm.startDate ?? ""} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tT("fields.endDate")}</Label>
                            <Input type="date" value={editForm.endDate ?? ""} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} disabled={tenantsSaving} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(mgmtTenant.id)} disabled={tenantsSaving || isReadOnly}>
                            {tenantsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            {tCommon("save")}
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEdit} disabled={tenantsSaving}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            {tCommon("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => startEdit(mgmtTenant)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        {tCommon("edit")}
                      </Button>
                    )}

                  {/* Onboarding — only for active tenant */}
                  {isActiveTenant(mgmtTenant) && editingTenantId !== mgmtTenant.id && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{t("onboarding.title")}</p>
                      </div>
                      {onboardingStatus ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("onboarding.emailLabel")}</span>
                            <span className="text-sm font-medium">{onboardingStatus.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("onboarding.statusLabel")}</span>
                            <div className="flex items-center gap-1.5">
                              {onboardingStatus.status === "pending"
                                ? <Clock className="h-3.5 w-3.5 text-amber-500" />
                                : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              <Badge
                                variant="outline"
                                className={onboardingStatus.status === "pending"
                                  ? "text-amber-600 border-amber-300"
                                  : "text-green-600 border-green-300"}
                              >
                                {t(`onboarding.status.${onboardingStatus.status}`, { defaultValue: onboardingStatus.status })}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">{t("onboarding.description")}</p>
                          <div className="space-y-1">
                            <Label htmlFor="tenant-email" className="text-sm">{t("onboarding.emailLabel")}</Label>
                            <Input
                              id="tenant-email" type="email"
                              placeholder={t("onboarding.emailPlaceholder")}
                              value={tenantEmail}
                              onChange={e => { setTenantEmail(e.target.value); setEmailError(""); }}
                              disabled={isOnboarding}
                            />
                            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                          </div>
                          <Button size="sm" onClick={handleOnboarding} disabled={isOnboarding || isSaving || isReadOnly}>
                            {isOnboarding
                              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("onboarding.submitting")}</>
                              : t("onboarding.submit")}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
          )}

          {/* Add tenant */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{t("onboarding.addTenant", { defaultValue: "Add Tenant" })}</p>
            </div>
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button type="button"
                className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "create" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                onClick={() => setOnboardingMode("create")}>
                {t("onboarding.createNew", { defaultValue: "Create New" })}
              </button>
              <button type="button"
                className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "assign" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                onClick={() => setOnboardingMode("assign")}>
                {t("onboarding.assignExisting")}
              </button>
            </div>

            {onboardingMode === "create" ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{tT("fields.firstName")}</Label>
                    <Input value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tT("fields.lastName")}</Label>
                    <Input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tT("fields.email")}</Label>
                    <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tT("fields.phone")}</Label>
                    <Input type="tel" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{tT("fields.startDate")}</Label>
                    <Input type="date" value={addForm.startDate} onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {tT("fields.endDate")}
                      <span className="ml-1 text-muted-foreground font-normal">({tCommon("optional")})</span>
                    </Label>
                    <Input type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} disabled={isSaving} />
                  </div>
                </div>
                {createTenantErrorMsg && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{createTenantErrorMsg}</span>
                  </div>
                )}
                <Button size="sm" onClick={handleCreateTenant} disabled={isSaving || isReadOnly || !addForm.firstName.trim()}>
                  {isSaving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tCommon("saving")}</>
                    : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />{t("onboarding.addTenant", { defaultValue: "Add Tenant" })}</>}
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder={t("onboarding.searchTenants")} value={tenantSearch}
                    onChange={e => setTenantSearch(e.target.value)} className="pl-8" />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                  {filteredUnassigned.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("onboarding.noTenantsFound")}</p>
                  ) : (
                    filteredUnassigned.map((tn) => (
                      <button key={tn.id} type="button" disabled={isSaving || isReadOnly}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                        onClick={() => handleAssignExisting(tn)}>
                        <div>
                          <p className="font-medium">{tenantDisplayName(tn)}</p>
                          {tn.email && <p className="text-xs text-muted-foreground">{tn.email}</p>}
                        </div>
                        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
      </div>)}

      {/* ── Rent Payments tab ── */}
      {activeTab === "rent" && (<div className="space-y-4">
          {yearTenants.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              {t("noTenantsInYear", { year })}
            </div>
          ) : (
            <>
              {yearTenants.length > 1 && (
                <div className="flex border rounded-xl overflow-x-auto bg-muted/30">
                  {yearTenants.map((tn) => (
                    <button
                      key={tn.id}
                      type="button"
                      className={`flex-1 min-w-0 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                        dataSelectedTenant?.id === tn.id
                          ? "bg-background border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                      onClick={() => { setDataTenantTab(tn.id); setRentInput({}); }}
                    >
                      <span className="truncate block">{tenantDisplayName(tn)}</span>
                      {tenantDateRange(tn, tCosts("openEnded", { defaultValue: "open" })) && (
                        <span className="block text-xs font-normal text-muted-foreground truncate">
                          {tenantDateRange(tn, tCosts("openEnded", { defaultValue: "open" }))}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{tCosts("rentPayments")}</h3>
                  {prevRentMonthsToCopy.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={rentSaving} onClick={copyPrevYearRent}>
                      <Copy className="h-3 w-3 mr-1.5" />
                      {tCosts("copyFromYear", { year: year - 1 })}
                    </Button>
                  )}
                </div>
                {rentLoading ? (
                  <p className="text-sm text-muted-foreground">{tCosts("loading")}</p>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {visibleMonths.map(m => <React.Fragment key={m}>{RentRow({ month: m })}</React.Fragment>)}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
      </div>)}

      {/* ── Costs tab ── */}
      {activeTab === "costs" && (<div className="space-y-4">
          {yearTenants.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              {t("noTenantsInYear", { year })}
            </div>
          ) : costLines.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              {tCosts("noCostLines", { defaultValue: "No expense types configured." })}
            </div>
          ) : (
            <>
              {yearTenants.length > 1 && (
                <div className="flex border rounded-xl overflow-x-auto bg-muted/30">
                  {yearTenants.map((tn) => (
                    <button
                      key={tn.id}
                      type="button"
                      className={`flex-1 min-w-0 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                        dataSelectedTenant?.id === tn.id
                          ? "bg-background border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                      onClick={() => { setDataTenantTab(tn.id); setCostInput({}); }}
                    >
                      <span className="truncate block">{tenantDisplayName(tn)}</span>
                      {tenantDateRange(tn, tCosts("openEnded", { defaultValue: "open" })) && (
                        <span className="block text-xs font-normal text-muted-foreground truncate">
                          {tenantDateRange(tn, tCosts("openEnded", { defaultValue: "open" }))}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{tCosts("aptNebenkosten")}</h3>
                  {prevCostLinesToCopy.length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={aptCostsSaving} onClick={copyPrevYearCosts}>
                      <Copy className="h-3 w-3 mr-1.5" />
                      {tCosts("copyFromYear", { year: year - 1 })}
                    </Button>
                  )}
                </div>
                {aptCostsLoading ? (
                  <p className="text-sm text-muted-foreground">{tCosts("loading")}</p>
                ) : (
                  <div className="space-y-2">
                    {activeCostLines.length > 0 && (
                      <Card>
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
                          <span className="flex-1" />
                          <span className="w-24 text-right">{tCosts("gesamtkosten")}</span>
                          <span className="w-10 text-right">{tCosts("verteiler")}</span>
                          <span className="w-20">{tCosts("schluessel")}</span>
                          <span className="w-10 text-right">{tCosts("anteil")}</span>
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
                            {tCosts("addCostLine")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={tCosts("searchCostLine")} />
                            <CommandList>
                              <CommandEmpty>{tCosts("noMatchCostLine")}</CommandEmpty>
                              <CommandGroup>
                                {availableCostLines.map(line => (
                                  <CommandItem key={line.id} value={costLineName(line, i18n.language)}
                                    onSelect={() => handleSelectCostLine(line.key)}>
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
            </>
          )}
      </div>)}

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (<div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOccupied
                  ? <DoorClosed className="h-5 w-5 text-amber-500" />
                  : <DoorOpen   className="h-5 w-5 text-green-500" />}
                <span className="font-medium">{t("status")}</span>
              </div>
              <Badge
                variant={isOccupied ? "secondary" : "outline"}
                className={isOccupied ? "" : "text-green-600 border-green-300"}
              >
                {isOccupied ? t("occupied") : t("available")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="occupied-toggle" className="text-sm text-muted-foreground">
                {t("markOccupied")}
              </Label>
              <Switch
                id="occupied-toggle"
                checked={isOccupied}
                onCheckedChange={handleToggle}
                disabled={isSaving || isReadOnly}
              />
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">{tCommon("dangerZone")}</p>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={isSaving || isReadOnly}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteApartment")}
            </Button>
          </div>
      </div>)}

      {/* ── Delete dialog ── */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm", { code: apartment.code })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t("deleteWarning")}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isSaving}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tCommon("deleting")}</>
                : tCommon("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
