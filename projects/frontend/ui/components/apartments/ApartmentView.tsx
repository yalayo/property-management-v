import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Trash2, Loader2,
  DoorOpen, DoorClosed, UserPlus, Clock, CheckCircle2,
  Search, Pencil, Check, X, AlertCircle, Copy, Plus, UserCheck, Euro, Landmark,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import ApartmentBillingPanel from "../billing/ApartmentBillingPanel";
import { markCostSyncYear, markCostSyncYearsForDateChange } from "../../lib/aptCostSync";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const SCHLUESSEL_OPTIONS = ["Wohnfläche", "Verbraucht", "Anzahl Personen", "MEA", "Wohneinheiten"];

type Apartment = {
  id: number;
  "property-id"?: number;
  property_id?: number;
  code: string;
  occupied: number | boolean;
  wohnflaeche?: number | string | null;
  "market-rent"?: number | string | null;
  "strom-zaehler-nr"?: string | null;
  "wasser-zaehler-nrn"?: string[] | null;
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
  "residents-count"?: number | string | null;
};

type TenantUpdateData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  residentsCount?: number;
};

type CostLine = { id: string; key: string; name?: string; "name-en"?: string; "name-de"?: string; "distribution-method"?: string };

type TenantMiete = {
  id: string;
  "tenant-id": string;
  year: number;
  kaltmiete?: number;
  "nebenkosten-warm"?: number;
};

type CostEditFields = {
  value: string;
  verteiler: string;
  schluessel: string;
  anteil: string;
  fixedValue: boolean;
};

type PersonsChange = {
  id: string;
  "tenant-id": string;
  "apartment-id": string;
  year: number;
  "from-date": string;
  count: number;
};

type Props = {
  apartment?: Apartment | null;
  apartments?: Apartment[];
  properties?: any[];
  tenants?: Tenant[];
  expenseTypes?: CostLine[];
  aptCosts?: any[];
  aptCostsLoading?: boolean;
  aptCostsSaving?: boolean;
  aptCostSaveError?: boolean;
  onClearAptCostError?: () => void;
  onLoadAptCosts?: (apartmentId: string) => void;
  onAddAptCost?: (data: { apartmentId: string; line: string; name: string; year: number; value: number; verteiler?: number; anteil?: number; schluessel?: string; tenantId?: string }) => void;
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
  onCreateTenant?: (apartmentId: number, data: { firstName: string; lastName?: string; email?: string; phone?: string; startDate: string; endDate?: string; kaltmiete?: number; nebenkostenWarm?: number; residentsCount?: number }) => void;
  createTenantError?: string;
  initialTab?: "tenants" | "rent" | "costs" | "nebenkosten" | "settings";
  currentYear?: number;
  onTabChange?: (tab: "tenants" | "rent" | "costs" | "nebenkosten" | "settings") => void;
  onYearChange?: (year: number) => void;
  tenantMieten?: TenantMiete[];
  mieteSaving?: boolean;
  onUpsertTenantMiete?: (data: { tenantId: string; year: number; kaltmiete: number; nebenkostenWarm: number }) => void;
  onDeleteTenantMiete?: (id: string) => void;
  onUpdateApartment?: (id: string, data: { code?: string; wohnflaeche?: number; marketRent?: number; stromZaehlerNr?: string | null; wasserZaehlerNrn?: string[] }) => void;
  onLoadCosts?: (propertyId: string) => void;
  onEditProperty?: (id: string, data: any) => void;
  propertySaving?: boolean;
  personsChanges?: PersonsChange[];
  onAddPersonsChange?: (data: { tenantId: string; apartmentId: string; year: number; fromDate: string; count: number }) => void;
  onDeletePersonsChange?: (id: string) => void;
  nkSettlements?: any[];
  onDeleteNkSettlement?: (id: string) => void;
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

function dateStrDays(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000) + 1;
}

function previousDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function tenantPersonDaysWithChanges(tenant: Tenant, year: number, changes: PersonsChange[]): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);
  const rawStart  = tenant["start-date"] ? new Date(tenant["start-date"] + "T00:00:00") : yearStart;
  const rawEnd    = tenant["end-date"]   ? new Date(tenant["end-date"]   + "T00:00:00") : yearEnd;
  const effStart  = rawStart > yearStart ? rawStart : yearStart;
  const effEnd    = rawEnd   < yearEnd   ? rawEnd   : yearEnd;
  if (effStart > effEnd) return 0;

  const effStartStr = effStart.toISOString().split("T")[0];
  const effEndStr   = effEnd.toISOString().split("T")[0];
  const baseCount   = tenant["residents-count"] != null && !isNaN(Number(tenant["residents-count"]))
    ? Number(tenant["residents-count"]) : 0;

  const relevant = changes
    .filter(c =>
      String(c["tenant-id"]) === String(tenant.id) &&
      Number(c.year) === year &&
      c["from-date"] > effStartStr &&
      c["from-date"] <= effEndStr
    )
    .sort((a, b) => a["from-date"].localeCompare(b["from-date"]));

  if (relevant.length === 0) return baseCount * dateStrDays(effStartStr, effEndStr);

  let total = 0;
  let cursor = effStartStr;
  let curCount = baseCount;
  for (const ch of relevant) {
    total += curCount * dateStrDays(cursor, previousDateStr(ch["from-date"]));
    cursor   = ch["from-date"];
    curCount = Number(ch.count);
  }
  total += curCount * dateStrDays(cursor, effEndStr);
  return total;
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
  apartments = [],
  properties = [],
  tenants = [],
  expenseTypes = [],
  aptCosts = [],
  aptCostsLoading,
  aptCostsSaving,
  aptCostSaveError,
  onClearAptCostError,
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
  currentYear: persistedYear,
  onTabChange,
  onYearChange,
  tenantMieten = [],
  mieteSaving = false,
  onUpsertTenantMiete,
  onDeleteTenantMiete,
  onUpdateApartment,
  onLoadCosts,
  onEditProperty,
  propertySaving,
  personsChanges = [],
  onAddPersonsChange,
  onDeletePersonsChange,
  nkSettlements = [],
  onDeleteNkSettlement,
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
  const [year, setYearState] = useState(persistedYear ?? defaultYear);
  const setYear = (y: number | ((prev: number) => number)) => {
    setYearState(prev => {
      const next = typeof y === "function" ? y(prev) : y;
      onYearChange?.(next);
      return next;
    });
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aptEdit, setAptEdit] = useState<{ code: string; wohnflaeche: string; marketRent: string; stromZaehlerNr: string; wasserZaehlerNrn: string[] } | null>(null);
  const [activeTab, setActiveTabState] = useState<"tenants" | "rent" | "costs" | "nebenkosten" | "settings">(initialTab ?? "tenants");
  const setActiveTab = (tab: "tenants" | "rent" | "costs" | "nebenkosten" | "settings") => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (initialTab) setActiveTabState(initialTab);
  }, [initialTab]);

  // Sync year when parent changes it (e.g. tree-nav click on a specific year)
  useEffect(() => {
    if (persistedYear != null && persistedYear !== year) {
      setYearState(persistedYear);
      onYearChange?.(persistedYear);
    }
  }, [persistedYear]);

  useEffect(() => {
    if (!aptCostSaveError) return;
    toast({ title: tCommon("saveError", { defaultValue: "Save failed. Please try again." }), variant: "destructive" });
    onClearAptCostError?.();
  }, [aptCostSaveError]);

  // ── Tenants-tab state ────────────────────────────────────────────────────
  const [mgmtTenantTab,    setMgmtTenantTab]    = useState<string | null>(null);
  const [editingTenantId,  setEditingTenantId]  = useState<string | null>(null);
  const [editForm,         setEditForm]         = useState<TenantUpdateData>({});
  const [addChangeForm,    setAddChangeForm]    = useState<{ fromDate: string; count: string } | null>(null);
  const [onboardingMode,   setOnboardingMode]   = useState<"create" | "assign">("create");
  const [tenantSearch,     setTenantSearch]     = useState("");
  const [tenantEmail,      setTenantEmail]      = useState("");
  const [emailError,       setEmailError]       = useState("");
  const [localAssignedTenant, setLocalAssignedTenant] = useState<Tenant | null>(null);
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    startDate: `${new Date().getFullYear()}-01-01`, endDate: "",
    kaltmiete: "", nebenkostenWarm: "", residentsCount: "",
  });

  // ── Rent/Costs-tabs shared tenant selection ─────────────────────────────
  const [dataTenantTab, setDataTenantTab] = useState<string | null>(null);

  // ── Rent-tab state ───────────────────────────────────────────────────────
  const [rentInput, setRentInput] = useState<Record<number, { kaltmiete: string; nebenkostenWarm: string } | null>>({});

  // ── Costs-tab state ──────────────────────────────────────────────────────
  const [costInput,   setCostInput]  = useState<Record<string, CostEditFields | null>>({});
  const [savingKeys,  setSavingKeys] = useState<Set<string>>(new Set());
  const [addLineOpen, setAddLineOpen]= useState(false);

  // ── Miete-edit state ─────────────────────────────────────────────────────
  const [editingMieteTenantId, setEditingMieteTenantId] = useState<string | null>(null);
  const [mieteForm, setMieteForm] = useState<{ kaltmiete: string; nebenkostenWarm: string }>({ kaltmiete: "", nebenkostenWarm: "" });

  // ── Auto-populate cost lines for empty years ──────────────────────────────
  const autoPopulatedKey = useRef("");

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
    setAddForm(f => ({ ...f, startDate: `${year}-01-01`, endDate: "", kaltmiete: "", nebenkostenWarm: "", residentsCount: "" }));
    setEditingMieteTenantId(null);
    setMieteForm({ kaltmiete: "", nebenkostenWarm: "" });
    autoPopulatedKey.current = "";
  }, [year]);

  // Load property-level costs when the nebenkosten tab is opened (data may not yet be loaded)
  useEffect(() => {
    if (activeTab !== "nebenkosten") return;
    if (propertyId) onLoadCosts?.(String(propertyId));
  }, [activeTab, propertyId]);

  // Auto-populate unsaved property cost lines when the costs tab is opened.
  // Only skips lines that are already stored for this year; partially-saved years
  // still get the remaining lines pre-filled. dataTenantTab is in the key so
  // switching tenants re-triggers. Year-change resets autoPopulatedKey so
  // navigating to another year and back re-triggers for the remaining lines.
  useEffect(() => {
    if (activeTab !== "costs") return;
    const aptYear = `${apartment.id}:${year}:${dataTenantTab}`;
    if (autoPopulatedKey.current === aptYear) return;

    if (!propertyId) return;
    const propLineKeys = new Set(
      allCosts
        .filter((c: any) => String(c["property-id"]) === String(propertyId))
        .map((c: any) => c.line as string)
    );
    if (propLineKeys.size === 0) return;

    // Lines already saved for this tenant this year — skip them, show the rest.
    // Uses tenant-scoped keys (tenant-specific entries take precedence over legacy unscoped ones).
    const savedThisYear = new Set(savedCostKeys);

    const toOpen: Record<string, CostEditFields> = {};
    propLineKeys.forEach(lineKey => {
      if (savedThisYear.has(lineKey)) return;
      const expType = expenseTypes.find((l: any) => l.key === lineKey);
      if (!expType) return;
      const inherited  = [...aptCosts]
        .filter((c: any) => c.line === lineKey && Number(c.year) < year)
        .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;
      const schluessel = String(inherited?.schluessel ?? schluesselForMethod(expType["distribution-method"]));
      const auto       = defaultsForSchluessel(schluessel);
      const verteiler  = auto.verteiler || (inherited?.verteiler != null ? String(inherited.verteiler) : "");
      const anteil     = auto.anteil    || (inherited?.anteil    != null ? String(inherited.anteil)    : "");
      const inheritedValue = inherited ? String(inherited.value) : "";
      const calcValue      = inheritedValue ? "" : calculateShare(lineKey, verteiler, anteil);
      toOpen[lineKey] = {
        value:      inheritedValue || calcValue,
        verteiler,
        schluessel,
        anteil,
        fixedValue: false,
      };
    });

    // Mark as populated regardless (all lines either saved or now in toOpen)
    autoPopulatedKey.current = aptYear;
    if (Object.keys(toOpen).length > 0) {
      setCostInput(toOpen);
    }
  }, [activeTab, year, apartment.id, dataTenantTab, aptCosts, allCosts, expenseTypes, propertyId, tenants, apartments]);

  // Safety net: if savingKeys still has entries that are now confirmed in aptCosts, clean them up.
  useEffect(() => {
    if (savingKeys.size === 0) return;
    const yearEntries = aptCosts.filter((c: any) => Number(c.year) === year);
    const nowSaved = [...savingKeys].filter(k => yearEntries.some((c: any) => c.line === k));
    if (nowSaved.length > 0) {
      setCostInput(prev => { const n = { ...prev }; nowSaved.forEach(k => delete n[k]); return n; });
      setSavingKeys(prev => { const n = new Set(prev); nowSaved.forEach(k => n.delete(k)); return n; });
    }
  }, [aptCosts, year, savingKeys]);

  if (!apartment) {
    return (
      <div className="rounded-xl border p-12 text-center text-muted-foreground">
        {t("notFound")}
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  // apartment.occupied can be stale; derive from active tenants as fallback
  const today_occ = new Date().toISOString().slice(0, 10);
  const isOccupied = !!apartment.occupied || tenants.some(tn => {
    if (String(tn["apartment-id"]) !== String(apartment.id)) return false;
    const s = tn["start-date"] ?? ""; const e = tn["end-date"] ?? "";
    return (!s || s <= today_occ) && (!e || e >= today_occ);
  });
  const propertyId  = apartment["property-id"] ?? (apartment as any).property_id;
  const property    = properties.find((p: any) => p.id === propertyId);
  const propertyTotalWohnflaeche = apartments
    .filter((a) => (a["property-id"] ?? (a as any).property_id) === propertyId && a.wohnflaeche != null)
    .reduce((sum, a) => sum + parseFloat(String(a.wohnflaeche)), 0);
  const propertyWohnflaecheStr = propertyTotalWohnflaeche > 0 ? String(propertyTotalWohnflaeche) : "";

  const aptPersonDaysForApt = (aptId: number | string): number =>
    tenants
      .filter((tn: Tenant) => String(tn["apartment-id"]) === String(aptId) && tenantActiveInYear(tn, year))
      .reduce((sum, tn) => sum + tenantPersonDaysWithChanges(tn, year, personsChanges), 0);
  const aptPersonDays    = aptPersonDaysForApt(apartment.id);
  const aptPersonDaysStr = aptPersonDays > 0 ? String(aptPersonDays) : "";
  const propertyPersonDays = apartments
    .filter((a) => (a["property-id"] ?? (a as any).property_id) === propertyId)
    .reduce((sum, a) => sum + aptPersonDaysForApt(a.id), 0);
  const propertyPersonDaysStr = propertyPersonDays > 0 ? String(propertyPersonDays) : "";

  const propertyApartmentCount = apartments
    .filter((a) => (a["property-id"] ?? (a as any).property_id) === propertyId).length;
  const propertyApartmentCountStr = propertyApartmentCount > 0 ? String(propertyApartmentCount) : "";

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
    const candidates = propertyCosts.filter((c: any) => c.line === lineKey);
    if (candidates.length === 0) return null;
    const exact = candidates.find((c: any) => Number(c.year) === year);
    if (exact) return Number(exact.value);
    const past = [...candidates]
      .filter((c: any) => Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0];
    if (past) return Number(past.value);
    const future = [...candidates].sort((a: any, b: any) => Number(a.year) - Number(b.year))[0];
    return future ? Number(future.value) : null;
  };

  const schluesselForMethod = (method?: string): string => {
    if (method === "person") return "Anzahl Personen";
    if (method === "consumed") return "Verbraucht";
    return "Wohnfläche";
  };

  const defaultsForSchluessel = (schl: string): { verteiler: string; anteil: string } => {
    if (schl === "Wohnfläche")      return { verteiler: property?.["living-area-m2"] != null ? String(property["living-area-m2"]) : propertyWohnflaecheStr, anteil: apartment["wohnflaeche"] != null ? String(apartment["wohnflaeche"]) : "" };
    if (schl === "Anzahl Personen") {
      const tenantPersonDays = dataSelectedTenant
        ? tenantPersonDaysWithChanges(dataSelectedTenant, year, personsChanges)
        : aptPersonDays;
      return { verteiler: propertyPersonDaysStr, anteil: tenantPersonDays > 0 ? String(tenantPersonDays) : aptPersonDaysStr };
    }
    if (schl === "Wohneinheiten")   return { verteiler: propertyApartmentCountStr,  anteil: "1" };
    return { verteiler: "", anteil: "" };
  };

  const calculateShare = (lineKey: string, verteilerStr: string, anteilStr: string): string => {
    const propTotal = getPropertyCostTotal(lineKey);
    const v = parseFloat(verteilerStr.replace(",", "."));
    const a = parseFloat(anteilStr.replace(",", "."));
    if (propTotal == null || isNaN(v) || v === 0 || isNaN(a) || a === 0) return "";
    const baseShare = (propTotal / v) * a;
    // For area-based costs (Wohnfläche etc.), prorate by the selected tenant's occupied days.
    // Person-based already encodes days in the anteil (residents × days); consumed is entered directly.
    const method = expenseTypes.find((l: any) => l.key === lineKey)?.["distribution-method"] ?? "living-area";
    if (method !== "person" && method !== "consumed" && dataSelectedTenant) {
      const yearDays = isLeapYear(year) ? 366 : 365;
      const days     = tenantDaysInYear(dataSelectedTenant, year);
      return (baseShare * days / yearDays).toFixed(2);
    }
    return baseShare.toFixed(2);
  };

  // ── Cost line helpers ─────────────────────────────────────────────────────
  const costLines: CostLine[] = expenseTypes;
  const yearCostEntries       = aptCosts.filter((c: any) => Number(c.year) === year);
  const selectedTenantId      = dataSelectedTenant?.id != null ? String(dataSelectedTenant.id) : null;
  // Tenant-specific entries take precedence; unscoped (legacy) entries fill in lines not yet saved per-tenant.
  const tenantCostEntries = selectedTenantId
    ? (() => {
        const tenantSpecific = yearCostEntries.filter((c: any) => String(c["tenant-id"]) === selectedTenantId);
        const tenantLines    = new Set(tenantSpecific.map((c: any) => c.line as string));
        const legacyFallback = yearCostEntries.filter((c: any) => c["tenant-id"] == null && !tenantLines.has(c.line as string));
        return [...tenantSpecific, ...legacyFallback];
      })()
    : yearCostEntries;
  const savedCostKeys         = tenantCostEntries.map((c: any) => c.line as string);
  const costEntryFor    = (lineId: string) => tenantCostEntries.find((c: any) => c.line === lineId) ?? null;
  const inheritedCostFor= (lineId: string) =>
    [...aptCosts].filter((c: any) => c.line === lineId && Number(c.year) < year)
      .sort((a: any, b: any) => Number(b.year) - Number(a.year))[0] ?? null;

  const openCostEdit  = (lineId: string, fields: CostEditFields) =>
    setCostInput(prev => ({ ...prev, [lineId]: fields }));
  const closeCostEdit = (lineId: string) =>
    setCostInput(prev => { const n = { ...prev }; delete n[lineId]; return n; });

  const commitCost = (lineKey: string, valueOverride?: string) => {
    const fields = costInput[lineKey];
    if (!fields) return;
    const effectiveValue = valueOverride ?? fields.value;
    const value = parseFloat(effectiveValue.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    const verteilerVal = fields.fixedValue ? NaN : parseFloat(fields.verteiler.replace(",", "."));
    const anteilVal    = fields.fixedValue ? NaN : parseFloat(fields.anteil.replace(",", "."));
    const payload = {
      value,
      verteiler:  isNaN(verteilerVal) ? undefined : verteilerVal,
      anteil:     isNaN(anteilVal)    ? undefined : anteilVal,
      schluessel: fields.fixedValue ? undefined : (fields.schluessel.trim() || undefined),
    };
    const existing = costEntryFor(lineKey);
    // Only update if the existing entry already belongs to this tenant (not a legacy fallback).
    const isTenantOwned = existing && (selectedTenantId ? String(existing["tenant-id"]) === selectedTenantId : existing["tenant-id"] == null);
    if (existing && isTenantOwned) {
      onUpdateAptCost?.({ id: existing.id, ...payload });
    } else {
      const line = costLines.find(l => l.key === lineKey);
      if (!line) return;
      onAddAptCost?.({
        apartmentId: String(apartment.id),
        line: lineKey,
        name: costLineName(line, i18n.language),
        year,
        ...payload,
        ...(selectedTenantId ? { tenantId: selectedTenantId } : {}),
      });
    }
    closeCostEdit(lineKey);
    toast({ title: tCommon("saved"), duration: 2000 });
  };

  const pendingCostKeys     = [...savingKeys].filter(k => !savedCostKeys.includes(k));
  const editingNewCostKeys  = Object.keys(costInput).filter(k => costInput[k] != null && !savedCostKeys.includes(k) && !savingKeys.has(k));
  const costLineOrder = useMemo(() => new Map(costLines.map((l, i) => [l.key, i])), [costLines]);
  const activeCostLines = [
    ...savedCostKeys.map(k => costLines.find(l => l.key === k)),
    ...pendingCostKeys.map(k => costLines.find(l => l.key === k)),
    ...editingNewCostKeys.map(k => costLines.find(l => l.key === k)),
  ].filter(Boolean)
   .sort((a, b) => (costLineOrder.get(a!.key) ?? 999) - (costLineOrder.get(b!.key) ?? 999)) as CostLine[];
  const isAutoFilled        = savedCostKeys.length === 0 && activeCostLines.length > 0;
  const availableCostLines  = costLines.filter(l => !savedCostKeys.includes(l.key) && costInput[l.key] == null && !savingKeys.has(l.key));
  const prevCostLinesToCopy = availableCostLines.filter(l => inheritedCostFor(l.key));

  const propertyCostKeys = new Set(propertyCosts.map((c: any) => c.line as string));
  const availablePropertyLines = availableCostLines.filter(l => propertyCostKeys.has(l.key));
  const availableOtherLines    = availableCostLines.filter(l => !propertyCostKeys.has(l.key));

  const pendingBetragTotal = editingNewCostKeys.reduce((sum, k) => {
    const f = costInput[k];
    if (!f) return sum;
    const raw = f.fixedValue ? f.value : (f.value || calculateShare(k, f.verteiler, f.anteil));
    const v = parseFloat(raw);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const savedBetragTotal = [...savedCostKeys, ...pendingCostKeys].reduce((sum, k) => {
    const e = costEntryFor(k);
    return e ? sum + Number(e.value) : sum;
  }, 0);

  const handleSelectCostLine = (key: string) => {
    const line = costLines.find(l => l.key === key);
    if (!line) return;
    const inherited     = inheritedCostFor(line.key);
    const schluessel    = String(inherited?.schluessel ?? schluesselForMethod(line["distribution-method"]));
    const auto          = defaultsForSchluessel(schluessel);
    const defaultVert   = auto.verteiler || (inherited?.verteiler != null ? String(inherited.verteiler) : "");
    const defaultAnteil = auto.anteil    || (inherited?.anteil    != null ? String(inherited.anteil)    : "");
    const defaultValue  = inherited ? String(inherited.value) : calculateShare(key, defaultVert, defaultAnteil);
    openCostEdit(line.key, {
      value:      defaultValue,
      verteiler:  defaultVert,
      schluessel,
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
          ...(selectedTenantId ? { tenantId: selectedTenantId } : {}),
        });
      }
    });
  };

  const commitAllPendingCosts = () => {
    const keys = editingNewCostKeys;
    const dispatched: string[] = [];
    keys.forEach(lineKey => {
      const fields = costInput[lineKey];
      if (!fields) return;
      const effectiveValueStr = fields.value || calculateShare(lineKey, fields.verteiler, fields.anteil);
      const value = parseFloat((effectiveValueStr || "").replace(",", "."));
      if (isNaN(value) || value <= 0) return;
      const verteilerVal = fields.fixedValue ? NaN : parseFloat(fields.verteiler.replace(",", "."));
      const anteilVal    = fields.fixedValue ? NaN : parseFloat(fields.anteil.replace(",", "."));
      const payload = {
        value,
        verteiler:  isNaN(verteilerVal) ? undefined : verteilerVal,
        anteil:     isNaN(anteilVal)    ? undefined : anteilVal,
        schluessel: fields.fixedValue ? undefined : (fields.schluessel.trim() || undefined),
      };
      const existing = costEntryFor(lineKey);
      const isTenantOwned = existing && (selectedTenantId ? String(existing["tenant-id"]) === selectedTenantId : existing["tenant-id"] == null);
      if (existing && isTenantOwned) {
        onUpdateAptCost?.({ id: existing.id, ...payload });
      } else {
        const line = costLines.find(l => l.key === lineKey);
        if (!line) return;
        onAddAptCost?.({
          apartmentId: String(apartment.id),
          line: lineKey,
          name: costLineName(line, i18n.language),
          year,
          ...payload,
          ...(selectedTenantId ? { tenantId: selectedTenantId } : {}),
        });
      }
      dispatched.push(lineKey);
    });
    if (dispatched.length > 0) {
      setCostInput(prev => {
        const next = { ...prev };
        dispatched.forEach(k => delete next[k]);
        return next;
      });
      toast({ title: tCommon("saved"), duration: 2000 });
    }
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
      const yearMiete = dataSelectedTenant ? mieteForTenantYear(dataSelectedTenant.id) : undefined;
      const tenantKalt = yearMiete?.kaltmiete != null
        ? Number(yearMiete.kaltmiete)
        : parseFloat(String(dataSelectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
      const tenantNk   = yearMiete?.["nebenkosten-warm"] != null
        ? Number(yearMiete["nebenkosten-warm"])
        : parseFloat(String(dataSelectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
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
    toast({ title: tCommon("saved"), duration: 2000 });
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
    toast({ title: tCommon("deleted"), duration: 2000 });
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
    const kaltVal     = parseFloat(addForm.kaltmiete.replace(",", "."));
    const nkVal       = parseFloat(addForm.nebenkostenWarm.replace(",", "."));
    const residentsVal = parseInt(addForm.residentsCount, 10);
    onCreateTenant?.(apartment.id, {
      firstName:       addForm.firstName.trim(),
      lastName:        addForm.lastName || undefined,
      email:           addForm.email || undefined,
      phone:           addForm.phone || undefined,
      startDate:       addForm.startDate || `${year}-01-01`,
      endDate:         addForm.endDate || undefined,
      kaltmiete:       isNaN(kaltVal) ? undefined : kaltVal,
      nebenkostenWarm: isNaN(nkVal)   ? undefined : nkVal,
      residentsCount:  isNaN(residentsVal) || residentsVal <= 0 ? undefined : residentsVal,
    });
    setAddForm({ firstName: "", lastName: "", email: "", phone: "", startDate: `${year}-01-01`, endDate: "", kaltmiete: "", nebenkostenWarm: "", residentsCount: "" });
    toast({ title: tCommon("saved"), duration: 2000 });
  };

  const handleAssignExisting = (tenant: Tenant) => {
    setLocalAssignedTenant(tenant);
    onAssignExistingTenant?.(apartment.id, tenant.id);
    onAfterAssign?.();
    toast({ title: tCommon("saved"), duration: 2000 });
  };

  const mieteForTenantYear = (tenantId: string): TenantMiete | undefined =>
    tenantMieten.find(m => String(m["tenant-id"]) === String(tenantId) && Number(m.year) === year);

  const openMieteEdit = (tenant: Tenant) => {
    const m = mieteForTenantYear(tenant.id);
    const prevYear = tenantMieten
      .filter(m => String(m["tenant-id"]) === String(tenant.id) && Number(m.year) < year)
      .sort((a, b) => Number(b.year) - Number(a.year))[0];
    setEditingMieteTenantId(tenant.id);
    setMieteForm({
      kaltmiete:      m?.kaltmiete != null ? String(m.kaltmiete)
                    : prevYear?.kaltmiete != null ? String(prevYear.kaltmiete)
                    : tenant.kaltmiete != null ? String(tenant.kaltmiete)
                    : "",
      nebenkostenWarm: m?.["nebenkosten-warm"] != null ? String(m["nebenkosten-warm"])
                     : prevYear?.["nebenkosten-warm"] != null ? String(prevYear["nebenkosten-warm"])
                     : tenant["nebenkosten-warm"] != null ? String(tenant["nebenkosten-warm"])
                     : "",
    });
  };

  const commitMiete = (tenantId: string) => {
    const kalt = parseFloat(mieteForm.kaltmiete.replace(",", "."));
    const nk   = parseFloat(mieteForm.nebenkostenWarm.replace(",", "."));
    if (isNaN(kalt) && isNaN(nk)) return;
    onUpsertTenantMiete?.({
      tenantId,
      year,
      kaltmiete:      isNaN(kalt) ? 0 : kalt,
      nebenkostenWarm: isNaN(nk)  ? 0 : nk,
    });
    setEditingMieteTenantId(null);
    toast({ title: tCommon("saved"), duration: 2000 });
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    const rc = tenant["residents-count"];
    setEditForm({
      firstName:      tenant["first-name"] ?? tenant.name ?? "",
      lastName:       tenant["last-name"] ?? "",
      email:          tenant.email ?? "",
      phone:          tenant.phone ?? "",
      startDate:      tenant["start-date"] ?? "",
      endDate:        tenant["end-date"] ?? "",
      residentsCount: rc != null && !isNaN(Number(rc)) ? Number(rc) : undefined,
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
    const origRc = orig?.["residents-count"];
    const origRcNum = origRc != null && !isNaN(Number(origRc)) ? Number(origRc) : undefined;
    if ((editForm.residentsCount ?? undefined) !== origRcNum)                      changed.residentsCount = editForm.residentsCount;
    if (Object.keys(changed).length > 0) {
      // Date corrections re-target the affected years' cost allocations
      if (changed.startDate !== undefined) markCostSyncYearsForDateChange(orig?.["start-date"], editForm.startDate);
      if (changed.endDate   !== undefined) markCostSyncYearsForDateChange(orig?.["end-date"], editForm.endDate);
      onUpdateTenant?.(tenantId, changed);
      toast({ title: tCommon("saved"), duration: 2000 });
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
                <Select
                  value={fields.schluessel}
                  onValueChange={schl => {
                    const { verteiler, anteil } = defaultsForSchluessel(schl);
                    const calc = calculateShare(line.key, verteiler, anteil);
                    setCostInput(prev => ({
                      ...prev,
                      [line.key]: {
                        ...prev[line.key]!,
                        schluessel: schl,
                        verteiler,
                        anteil,
                        ...(calc && !prev[line.key]!.fixedValue ? { value: calc } : {}),
                      },
                    }));
                  }}
                >
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHLUESSEL_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                schluessel: String(entry.schluessel || "Wohnfläche"),
                anteil:     entry.anteil != null ? String(entry.anteil) : "",
                fixedValue: false,
              })}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={aptCostsSaving} onClick={() => { onDeleteAptCost?.(entry.id); toast({ title: tCommon("deleted"), duration: 2000 }); }}>
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
    const yearMiete  = dataSelectedTenant ? mieteForTenantYear(dataSelectedTenant.id) : undefined;
    const tenantKalt = yearMiete?.kaltmiete != null
      ? Number(yearMiete.kaltmiete)
      : parseFloat(String(dataSelectedTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
    const tenantNk   = yearMiete?.["nebenkosten-warm"] != null
      ? Number(yearMiete["nebenkosten-warm"])
      : parseFloat(String(dataSelectedTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
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

    // Reconciliation: compute expected rent to compare with bank amount
    const reconciled = !!entry?.["source-file"];
    const bankValue  = reconciled ? Number(entry.value) : null;
    const expectedValue = hasTenant ? tenantKalt + tenantNk : null;
    const amountsMatch  = reconciled && expectedValue != null
      ? Math.abs((bankValue ?? 0) - expectedValue) < 0.01
      : true;
    const reconTooltip  = reconciled
      ? amountsMatch
        ? `Kontoauszug: ${entry["source-file"]}`
        : `Kontoauszug: ${entry["source-file"]}\nBankbetrag: € ${formatEur(bankValue ?? 0)}\nErwartet: € ${formatEur(expectedValue ?? 0)}`
      : undefined;

    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0">
        <span className="flex-1 font-medium capitalize">{monthName(month)}</span>
        {entry ? (
          <>
            <span className={`tabular-nums text-right w-28 ${reconciled && !amountsMatch ? "text-red-600 font-semibold" : ""}`}>
              €{formatEur(Number(entry.value))}
            </span>
            {reconciled && (
              <span title={reconTooltip} className={`shrink-0 cursor-help ${amountsMatch ? "text-green-600" : "text-red-500"}`}>
                <Landmark className="h-3.5 w-3.5" />
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              disabled={rentSaving} onClick={() => openRentEdit(month, entry)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={rentSaving} onClick={() => { onDeleteRentPayment?.(entry.id); toast({ title: tCommon("deleted"), duration: 2000 }); }}>
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
                  if (value > 0) { onAddRentPayment?.({ apartmentId: String(apartment.id), year, month, value, kaltmiete: tenantKalt, nebenkostenWarm: tenantNk }); toast({ title: tCommon("saved"), duration: 2000 }); }
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
            {apartment.wohnflaeche != null && (
              <span className="text-sm text-muted-foreground">
                {Number(apartment.wohnflaeche).toLocaleString("de-DE", { maximumFractionDigits: 2 })} m²
              </span>
            )}
            {property && (
              <span className="text-sm text-muted-foreground">
                {property.name}
                {property.address && <> · {property.address}</>}
                {property.city    && <>, {property.city}</>}
              </span>
            )}
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAptEdit({
                    code: apartment.code ?? "",
                    wohnflaeche: apartment.wohnflaeche != null ? String(apartment.wohnflaeche) : "",
                    marketRent: apartment["market-rent"] != null ? String(apartment["market-rent"]) : "",
                    stromZaehlerNr: apartment["strom-zaehler-nr"] ?? "",
                    wasserZaehlerNrn: Array.isArray(apartment["wasser-zaehler-nrn"]) ? apartment["wasser-zaehler-nrn"] : [],
                  });
                  setActiveTab("settings");
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <YearNav />
      </div>
      {YearBanner()}

      {/* ── Tab bar (segmented control) ── */}
      <div className="bg-muted rounded-lg p-1 flex mb-5">
        {(["tenants", "rent", "costs", "nebenkosten", "settings"] as const).map(tab => (
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
                        {tn["start-date"] && (() => {
                          const days = tenantDaysInYear(tn, year);
                          return days > 0 ? <span className="ml-1 tabular-nums">({days} Tage)</span> : null;
                        })()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Summary card for selected tenant */}
              {mgmtTenant && (
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap gap-6">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{tT("fields.name")}</p>
                      <p className="font-semibold text-sm">{tenantDisplayName(mgmtTenant)}</p>
                      {mgmtTenant.email && <p className="text-sm text-muted-foreground">{mgmtTenant.email}</p>}
                      {mgmtTenant.phone && <p className="text-sm text-muted-foreground">{mgmtTenant.phone}</p>}
                    </div>
                    {mgmtTenant["start-date"] && (() => {
                      const days = tenantDaysInYear(mgmtTenant, year);
                      return (
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t("leasePeriod")}</p>
                          <p className="text-sm">{mgmtTenant["start-date"]}</p>
                          <p className="text-sm text-muted-foreground">→ {mgmtTenant["end-date"] || t("openEnded")}</p>
                          {days > 0 && <p className="text-xs text-muted-foreground tabular-nums">({days} Tage in {year})</p>}
                        </div>
                      );
                    })()}
                    {(() => {
                      const rc = mgmtTenant["residents-count"];
                      const count = rc != null && !isNaN(Number(rc)) ? Number(rc) : null;
                      if (count == null || count <= 0) return null;
                      return (
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Personen</p>
                          <p className="text-sm font-semibold tabular-nums">{count}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Per-year Miete — responds to global year nav */}
              {mgmtTenant && (() => {
                const m          = mieteForTenantYear(mgmtTenant.id);
                const isEditing  = editingMieteTenantId === mgmtTenant.id;
                const kalt       = m?.kaltmiete != null       ? Number(m.kaltmiete)
                                 : mgmtTenant.kaltmiete != null ? Number(mgmtTenant.kaltmiete) : null;
                const nk         = m?.["nebenkosten-warm"] != null       ? Number(m["nebenkosten-warm"])
                                 : mgmtTenant["nebenkosten-warm"] != null ? Number(mgmtTenant["nebenkosten-warm"]) : null;
                const total      = (kalt ?? 0) + (nk ?? 0);
                return (
                  <div className={`rounded-xl border overflow-hidden ${m ? "border-primary/30" : ""}`}>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        <Euro className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold truncate">{tenantDisplayName(mgmtTenant)}</span>
                        <span className="text-xs text-muted-foreground shrink-0">· Miete</span>
                        {m ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-primary border-primary/40 shrink-0">
                            {year}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({t("miete.baseRate", { defaultValue: "base rate" })})
                          </span>
                        )}
                      </div>
                      {!isEditing && !isReadOnly && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => openMieteEdit(mgmtTenant)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          {m ? tCommon("edit") : t("miete.setForYear", { year, defaultValue: `Set for ${year}` })}
                        </Button>
                      )}
                    </div>

                    <div className="p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Kaltmiete (€)</Label>
                              <Input type="number" inputMode="decimal" min="0" step="0.01"
                                value={mieteForm.kaltmiete}
                                onChange={e => setMieteForm(f => ({ ...f, kaltmiete: e.target.value }))}
                                disabled={mieteSaving} autoFocus />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Nebenkosten warm (€)</Label>
                              <Input type="number" inputMode="decimal" min="0" step="0.01"
                                value={mieteForm.nebenkostenWarm}
                                onChange={e => setMieteForm(f => ({ ...f, nebenkostenWarm: e.target.value }))}
                                disabled={mieteSaving} />
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" disabled={mieteSaving} onClick={() => commitMiete(mgmtTenant.id)}>
                              {mieteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              {tCommon("save")}
                            </Button>
                            <Button variant="outline" size="sm" disabled={mieteSaving}
                              onClick={() => setEditingMieteTenantId(null)}>
                              <X className="h-3.5 w-3.5 mr-1" />
                              {tCommon("cancel")}
                            </Button>
                            {m && (
                              <Button variant="ghost" size="sm" className="text-destructive ml-auto"
                                disabled={mieteSaving}
                                onClick={() => { onDeleteTenantMiete?.(m.id); setEditingMieteTenantId(null); }}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                {t("miete.resetToBase", { defaultValue: "Reset to base rate" })}
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (kalt != null || nk != null) ? (
                        <div className="flex flex-wrap gap-6 text-sm">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Kaltmiete</p>
                            <p className="tabular-nums font-medium">€ {formatEur(kalt ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Nebenkosten</p>
                            <p className="tabular-nums font-medium">€ {formatEur(nk ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{t("totalPerMonth")}</p>
                            <p className="tabular-nums font-bold">€ {formatEur(total)}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("miete.notSet", { defaultValue: "No rent rate set yet." })}
                          {!isReadOnly && (
                            <button className="ml-2 underline text-foreground" onClick={() => openMieteEdit(mgmtTenant)}>
                              {t("miete.setForYear", { year, defaultValue: `Set for ${year}` })}
                            </button>
                          )}
                        </p>
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
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Personen im Haushalt gesamt</Label>
                            <Input type="number" inputMode="numeric" min="1" step="1"
                              value={editForm.residentsCount ?? ""}
                              onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                setEditForm(f => ({ ...f, residentsCount: isNaN(v) || v <= 0 ? undefined : v }));
                              }}
                              disabled={tenantsSaving}
                              className="sm:max-w-[50%]"
                            />
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

                  {/* Person-count history for the selected year */}
                  {editingTenantId !== mgmtTenant.id && (() => {
                    const tenantChanges = personsChanges
                      .filter(c => String(c["tenant-id"]) === String(mgmtTenant.id) && Number(c.year) === year)
                      .sort((a, b) => a["from-date"].localeCompare(b["from-date"]));
                    const baseCount = mgmtTenant["residents-count"] != null && !isNaN(Number(mgmtTenant["residents-count"]))
                      ? Number(mgmtTenant["residents-count"]) : 0;
                    const totalPersonDays = tenantPersonDaysWithChanges(mgmtTenant, year, personsChanges);
                    return (
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Personenzahl {year}</p>
                          <span className="text-xs text-muted-foreground">{totalPersonDays} Personentage</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm px-1">
                            <span className="text-muted-foreground">Basis (bei Einzug / Jahresbeginn)</span>
                            <span className="font-medium">{baseCount} Personen</span>
                          </div>
                          {tenantChanges.map(ch => (
                            <div key={ch.id} className="flex items-center justify-between text-sm px-1">
                              <span className="text-muted-foreground">ab {ch["from-date"]}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{ch.count} Personen</span>
                                {!isReadOnly && (
                                  <button
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => {
                                      markCostSyncYear(Number(ch.year), "Anzahl Personen");
                                      onDeletePersonsChange?.(ch.id);
                                    }}
                                    disabled={tenantsSaving}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {!isReadOnly && (
                          addChangeForm ? (
                            <div className="flex items-end gap-2">
                              <div className="space-y-1 flex-1">
                                <Label className="text-xs">Datum der Änderung</Label>
                                <Input
                                  type="date"
                                  value={addChangeForm.fromDate}
                                  onChange={e => setAddChangeForm(f => f ? { ...f, fromDate: e.target.value } : f)}
                                  disabled={tenantsSaving}
                                />
                              </div>
                              <div className="space-y-1 w-24">
                                <Label className="text-xs">Personen</Label>
                                <Input
                                  type="number" inputMode="numeric" min="1" step="1"
                                  value={addChangeForm.count}
                                  onChange={e => setAddChangeForm(f => f ? { ...f, count: e.target.value } : f)}
                                  disabled={tenantsSaving}
                                />
                              </div>
                              <Button
                                size="sm"
                                disabled={tenantsSaving || !addChangeForm.fromDate || !addChangeForm.count}
                                onClick={() => {
                                  const count = parseInt(addChangeForm.count, 10);
                                  if (!addChangeForm.fromDate || isNaN(count) || count <= 0) return;
                                  markCostSyncYear(year, "Anzahl Personen");
                                  onAddPersonsChange?.({
                                    tenantId: String(mgmtTenant.id),
                                    apartmentId: String(apartment!.id),
                                    year,
                                    fromDate: addChangeForm.fromDate,
                                    count,
                                  });
                                  setAddChangeForm(null);
                                }}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {tCommon("save")}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setAddChangeForm(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline" size="sm"
                              className="w-full border-dashed"
                              onClick={() => setAddChangeForm({ fromDate: "", count: "" })}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Personenzahl-Änderung hinzufügen
                            </Button>
                          )
                        )}
                      </div>
                    );
                  })()}

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
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Kaltmiete (€)
                      <span className="ml-1 text-muted-foreground font-normal">({tCommon("optional")})</span>
                    </Label>
                    <Input type="number" inputMode="decimal" min="0" step="0.01" value={addForm.kaltmiete} onChange={e => setAddForm(f => ({ ...f, kaltmiete: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Nebenkosten warm (€)
                      <span className="ml-1 text-muted-foreground font-normal">({tCommon("optional")})</span>
                    </Label>
                    <Input type="number" inputMode="decimal" min="0" step="0.01" value={addForm.nebenkostenWarm} onChange={e => setAddForm(f => ({ ...f, nebenkostenWarm: e.target.value }))} disabled={isSaving} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">
                      Personen im Haushalt gesamt
                      <span className="ml-1 text-muted-foreground font-normal">({tCommon("optional")})</span>
                    </Label>
                    <Input type="number" inputMode="numeric" min="1" step="1" value={addForm.residentsCount} onChange={e => setAddForm(f => ({ ...f, residentsCount: e.target.value }))} disabled={isSaving} className="sm:max-w-[50%]" />
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
                          {" "}
                          <span className="tabular-nums">({tenantDaysInYear(tn, year)} Tage)</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{tCosts("rentPayments")}</h3>
                    {dataSelectedTenant && (
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {tenantDaysInYear(dataSelectedTenant, year)} Tage in {year}
                      </p>
                    )}
                  </div>
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
                  <Card className="overflow-hidden">
                    <CardContent className="p-0 max-h-[480px] overflow-y-auto">
                      {visibleMonths.map(m => <React.Fragment key={m}>{RentRow({ month: m })}</React.Fragment>)}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* NK-Nachzahlungen received in this year (settling previous Abrechnungsjahre) */}
              {(() => {
                const aptNkSettlements = nkSettlements
                  .filter((s: any) =>
                    String(s["apartment-id"]) === String(apartment.id) &&
                    typeof s.date === "string" && s.date.startsWith(`${year}-`))
                  .sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
                if (aptNkSettlements.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold">{tCosts("nkSettlements")}</h3>
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        {aptNkSettlements.map((s: any) => {
                          const tn = tenants.find((x: any) => String(x.id) === String(s["tenant-id"]));
                          return (
                            <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 gap-2">
                              <div className="min-w-0">
                                <p className="text-sm">
                                  {tCosts("nkSettlementRow", { year: s.year, date: s.date })}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {tn ? tenantDisplayName(tn) : ""}{s.notes ? ` — ${s.notes}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="tabular-nums text-sm font-medium text-green-600">
                                  € {formatEur(Number(s.amount ?? 0))}
                                </span>
                                {!isReadOnly && onDeleteNkSettlement && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDeleteNkSettlement(String(s.id))}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
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
                          {" "}
                          <span className="tabular-nums">({tenantDaysInYear(tn, year)} Tage)</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{tCosts("aptNebenkosten")}</h3>
                    {dataSelectedTenant && (
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {tenantDaysInYear(dataSelectedTenant, year)} Tage in {year}
                      </p>
                    )}
                    {isAutoFilled && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tCosts("autoFilledHint", { year: year - 1, defaultValue: `Pre-filled from ${year - 1} — adjust Schlüssel or Anteil if needed, then save.` })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingNewCostKeys.length > 0 && (
                      <Button size="sm" className="h-7 px-3 text-xs" disabled={aptCostsSaving} onClick={commitAllPendingCosts}>
                        <Check className="h-3 w-3 mr-1.5" />
                        {tCosts("saveAll", { defaultValue: "Save All" })}
                      </Button>
                    )}
                    {editingNewCostKeys.length === 0 && prevCostLinesToCopy.length > 0 && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={aptCostsSaving} onClick={copyPrevYearCosts}>
                        <Copy className="h-3 w-3 mr-1.5" />
                        {tCosts("copyFromYear", { year: year - 1 })}
                      </Button>
                    )}
                    {availableCostLines.length > 0 && (
                      <Popover open={addLineOpen} onOpenChange={setAddLineOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            {tCosts("addCostLine")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="end">
                          <Command>
                            <CommandInput placeholder={tCosts("searchCostLine")} />
                            <CommandList>
                              <CommandEmpty>{tCosts("noMatchCostLine")}</CommandEmpty>
                              {availablePropertyLines.length > 0 && (
                                <CommandGroup heading={tCosts("propertyKostenarten", { defaultValue: "Property cost types" })}>
                                  {availablePropertyLines.map(line => (
                                    <CommandItem key={line.id} value={costLineName(line, i18n.language)}
                                      onSelect={() => handleSelectCostLine(line.key)}>
                                      {costLineName(line, i18n.language)}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {availableOtherLines.length > 0 && (
                                <CommandGroup heading={availablePropertyLines.length > 0 ? tCosts("otherKostenarten", { defaultValue: "Other" }) : undefined}>
                                  {availableOtherLines.map(line => (
                                    <CommandItem key={line.id} value={costLineName(line, i18n.language)}
                                      onSelect={() => handleSelectCostLine(line.key)}>
                                      {costLineName(line, i18n.language)}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                {aptCostsLoading ? (
                  <p className="text-sm text-muted-foreground">{tCosts("loading")}</p>
                ) : (
                  <div className="space-y-2">
                    {editingNewCostKeys.length > 0 && (
                      <Card>
                          <div className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                            <span className="flex-1">{tCosts("costLine", { defaultValue: "Kostenart" })}</span>
                            <span className="w-24 text-right">{tCosts("gesamtkosten")}</span>
                            <span className="w-10 text-right">{tCosts("verteiler")}</span>
                            <span className="w-24">{tCosts("schluessel")}</span>
                            <span className="w-20 text-right">{tCosts("anteil")}</span>
                            <span className="w-24 text-right">{tCosts("betrag", { defaultValue: "Betrag" })}</span>
                            <span className="w-14" />
                          </div>
                          <CardContent className="p-0 divide-y">
                            {editingNewCostKeys.map(lineKey => {
                              const fields = costInput[lineKey];
                              if (!fields) return null;
                              const line = costLines.find(l => l.key === lineKey);
                              if (!line) return null;
                              const isSavingLine = savingKeys.has(lineKey);
                              const propTotal    = getPropertyCostTotal(lineKey);
                              const name         = costLineName(line, i18n.language);
                              const betragRaw    = fields.fixedValue
                                ? fields.value
                                : (fields.value || calculateShare(lineKey, fields.verteiler, fields.anteil));
                              const betrag       = betragRaw ? parseFloat(betragRaw) : null;
                              const toggleFixed  = (checked: boolean) =>
                                setCostInput(prev => ({
                                  ...prev,
                                  [lineKey]: {
                                    ...prev[lineKey]!,
                                    fixedValue: checked,
                                    ...(!checked ? { value: calculateShare(lineKey, prev[lineKey]!.verteiler, prev[lineKey]!.anteil) || "" } : {}),
                                  },
                                }));
                              return (
                                <div key={lineKey} className={`flex items-center gap-2 px-4 py-2.5 text-sm${isSavingLine ? " opacity-50" : ""}`}>
                                  <span className="flex-1 min-w-0 font-medium truncate">{name}</span>
                                  <span className={`shrink-0 w-24 text-right tabular-nums text-xs ${fields.fixedValue ? "opacity-30 text-muted-foreground" : "text-muted-foreground"}`}>
                                    {!fields.fixedValue && propTotal != null ? `€ ${propTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                                  </span>
                                  <span className={`shrink-0 w-10 text-right tabular-nums text-xs ${fields.fixedValue ? "opacity-30 text-muted-foreground" : "text-muted-foreground"}`}>
                                    {!fields.fixedValue ? (fields.verteiler || "—") : "—"}
                                  </span>
                                  <span className={`shrink-0 w-24 text-sm truncate ${fields.fixedValue ? "opacity-30 text-muted-foreground" : "text-muted-foreground"}`}>
                                    {!fields.fixedValue ? (fields.schluessel || "—") : "—"}
                                  </span>
                                  {fields.fixedValue ? (
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0,00"
                                      value={fields.value}
                                      disabled={isSavingLine}
                                      className="shrink-0 h-7 text-sm text-right w-20"
                                      onChange={e => setCostInput(prev => ({ ...prev, [lineKey]: { ...prev[lineKey]!, value: e.target.value } }))}
                                      onKeyDown={e => { if (e.key === "Enter") commitCost(lineKey); }}
                                    />
                                  ) : (
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={fields.anteil}
                                      disabled={isSavingLine}
                                      className="shrink-0 h-7 text-sm text-right w-20"
                                      onChange={e => {
                                        const val = e.target.value;
                                        const calc = calculateShare(lineKey, fields.verteiler, val);
                                        setCostInput(prev => ({
                                          ...prev,
                                          [lineKey]: { ...prev[lineKey]!, anteil: val, ...(calc ? { value: calc } : {}) },
                                        }));
                                      }}
                                      onKeyDown={e => { if (e.key === "Enter") commitCost(lineKey, betragRaw || undefined); }}
                                    />
                                  )}
                                  <span className="shrink-0 w-24 text-right tabular-nums font-medium">
                                    {betrag != null ? `€ ${betrag.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                                  </span>
                                  <div className="shrink-0 w-14 flex items-center justify-end gap-1">
                                    <Checkbox
                                      id={`fixed-batch-${lineKey}`}
                                      checked={fields.fixedValue}
                                      disabled={isSavingLine}
                                      title={tCosts("fixedValue")}
                                      onCheckedChange={checked => toggleFixed(!!checked)}
                                    />
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                      disabled={isSavingLine || aptCostsSaving || betrag == null}
                                      title={tCosts("save")}
                                      onClick={() => commitCost(lineKey, betragRaw || undefined)}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                          {pendingBetragTotal > 0 && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 border-t bg-muted/20 text-sm font-medium">
                              <span className="flex-1 text-muted-foreground">{tCosts("total", { defaultValue: "Gesamt" })}</span>
                              <span className="w-24 shrink-0" />
                              <span className="w-10 shrink-0" />
                              <span className="w-24 shrink-0" />
                              <span className="w-20 shrink-0" />
                              <span className="w-24 text-right tabular-nums shrink-0">
                                € {pendingBetragTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="w-14 shrink-0" />
                            </div>
                          )}
                        </Card>
                    )}

                    {(savedCostKeys.length > 0 || pendingCostKeys.length > 0) && (
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
                          {[...savedCostKeys, ...pendingCostKeys]
                            .map(k => costLines.find(l => l.key === k))
                            .filter((l): l is CostLine => !!l)
                            .map(line => <React.Fragment key={line.id}>{CostRow({ line })}</React.Fragment>)}
                        </CardContent>
                        {savedBetragTotal > 0 && (
                          <div className="hidden sm:flex items-center gap-2 px-4 py-2 border-t bg-muted/20 text-sm font-medium">
                            <span className="flex-1 text-muted-foreground">{tCosts("total", { defaultValue: "Gesamt" })}</span>
                            <span className="w-24 text-right tabular-nums shrink-0">
                              € {savedBetragTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="w-10 shrink-0" />
                            <span className="w-20 shrink-0" />
                            <span className="w-10 shrink-0" />
                            <span className="w-16 shrink-0" />
                          </div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
      </div>)}

      {/* ── Nebenkosten tab ── */}
      {activeTab === "nebenkosten" && (
        <ApartmentBillingPanel
          year={year}
          property={property}
          apartment={apartment}
          tenants={tenants}
          aptCosts={aptCosts}
          propertyCosts={propertyCosts}
          expenseTypes={expenseTypes}
          rentPayments={rentPayments}
          isLoading={aptCostsLoading || rentLoading}
          propertySaving={propertySaving}
          onEditProperty={onEditProperty}
        />
      )}

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (<div className="space-y-4">

          {/* Apartment info edit card */}
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("apartmentInfo", { defaultValue: "Wohnungsinfo" })}</span>
              {!isReadOnly && !aptEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAptEdit({
                    code: apartment?.code ?? "",
                    wohnflaeche: apartment?.wohnflaeche != null ? String(apartment.wohnflaeche) : "",
                    marketRent: apartment?.["market-rent"] != null ? String(apartment["market-rent"]) : "",
                    stromZaehlerNr: apartment?.["strom-zaehler-nr"] ?? "",
                    wasserZaehlerNrn: Array.isArray(apartment?.["wasser-zaehler-nrn"]) ? apartment!["wasser-zaehler-nrn"]! : [],
                  })}
                  disabled={isSaving}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {tCommon("edit")}
                </Button>
              )}
            </div>

            {aptEdit ? (
              <>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="apt-code-edit">{t("fields.code")}</Label>
                    <Input
                      id="apt-code-edit"
                      value={aptEdit.code}
                      onChange={(e) => setAptEdit((f) => f ? { ...f, code: e.target.value } : f)}
                      disabled={isSaving}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="apt-wohnflaeche-edit">
                      {t("fields.wohnflaeche")}
                      <span className="text-xs text-muted-foreground ml-1">(m²)</span>
                    </Label>
                    <Input
                      id="apt-wohnflaeche-edit"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={aptEdit.wohnflaeche}
                      onChange={(e) => setAptEdit((f) => f ? { ...f, wohnflaeche: e.target.value } : f)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="apt-market-rent-edit">
                      {t("fields.marketRent", { defaultValue: "Ortsübliche Miete" })}
                      <span className="text-xs text-muted-foreground ml-1">(€ / Monat)</span>
                    </Label>
                    <Input
                      id="apt-market-rent-edit"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={aptEdit.marketRent}
                      onChange={(e) => setAptEdit((f) => f ? { ...f, marketRent: e.target.value } : f)}
                      disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("fields.marketRentHint", { defaultValue: "Vergleichsmiete für die 66-%-Prüfung (Anlage V)." })}
                    </p>
                  </div>

                  {/* Stromzählernummer (single) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="apt-strom-edit">
                      {t("fields.stromZaehlerNr", { defaultValue: "Stromzählernummer" })}
                      <span className="text-xs text-muted-foreground ml-1">({t("optional", { defaultValue: "optional" })})</span>
                    </Label>
                    <Input
                      id="apt-strom-edit"
                      value={aptEdit.stromZaehlerNr}
                      onChange={(e) => setAptEdit((f) => f ? { ...f, stromZaehlerNr: e.target.value } : f)}
                      disabled={isSaving}
                      autoComplete="off"
                    />
                  </div>

                  {/* Wasserzählernummern (multiple) */}
                  <div className="space-y-1.5">
                    <Label>
                      {t("fields.wasserZaehlerNrn", { defaultValue: "Wasserzählernummern" })}
                      <span className="text-xs text-muted-foreground ml-1">({t("optional", { defaultValue: "optional" })})</span>
                    </Label>
                    {aptEdit.wasserZaehlerNrn.map((nr, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={nr}
                          onChange={(e) => setAptEdit((f) => {
                            if (!f) return f;
                            const arr = [...f.wasserZaehlerNrn];
                            arr[i] = e.target.value;
                            return { ...f, wasserZaehlerNrn: arr };
                          })}
                          disabled={isSaving}
                          autoComplete="off"
                        />
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setAptEdit((f) => f ? { ...f, wasserZaehlerNrn: f.wasserZaehlerNrn.filter((_, j) => j !== i) } : f)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="outline" size="sm" className="h-8"
                      onClick={() => setAptEdit((f) => f ? { ...f, wasserZaehlerNrn: [...f.wasserZaehlerNrn, ""] } : f)}
                      disabled={isSaving}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t("fields.addWasserZaehler", { defaultValue: "Wasserzähler hinzufügen" })}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isSaving || !aptEdit.code.trim()}
                    onClick={() => {
                      const data: { code?: string; wohnflaeche?: number; marketRent?: number; stromZaehlerNr?: string | null; wasserZaehlerNrn?: string[] } = {};
                      if (aptEdit.code.trim()) data.code = aptEdit.code.trim();
                      const w = parseFloat(aptEdit.wohnflaeche);
                      if (!isNaN(w)) {
                        data.wohnflaeche = w;
                        // Editing while viewing a past year targets that year's allocations
                        if (w !== Number(apartment?.wohnflaeche)) markCostSyncYear(year, "Wohnfläche");
                      }
                      const mr = parseFloat(aptEdit.marketRent);
                      if (!isNaN(mr)) data.marketRent = mr;
                      data.stromZaehlerNr = aptEdit.stromZaehlerNr.trim();
                      data.wasserZaehlerNrn = aptEdit.wasserZaehlerNrn.map((s) => s.trim()).filter(Boolean);
                      onUpdateApartment?.(String(apartment!.id), data);
                      setAptEdit(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {tCommon("save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAptEdit(null)} disabled={isSaving}>
                    <X className="h-4 w-4 mr-1" />
                    {tCommon("cancel")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("fields.code")}</span>
                  <span className="font-medium">{apartment?.code ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("fields.wohnflaeche")}</span>
                  <span className="font-medium">
                    {apartment?.wohnflaeche != null
                      ? `${parseFloat(String(apartment.wohnflaeche)).toLocaleString("de-DE")} m²`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("fields.marketRent", { defaultValue: "Ortsübliche Miete" })}</span>
                  <span className="font-medium">
                    {apartment?.["market-rent"] != null
                      ? `€ ${parseFloat(String(apartment["market-rent"])).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Mon.`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">{t("fields.stromZaehlerNr", { defaultValue: "Stromzählernummer" })}</span>
                  <span className="font-medium text-right">{apartment?.["strom-zaehler-nr"] || "—"}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground shrink-0">{t("fields.wasserZaehlerNrn", { defaultValue: "Wasserzählernummern" })}</span>
                  <span className="font-medium text-right">
                    {Array.isArray(apartment?.["wasser-zaehler-nrn"]) && apartment["wasser-zaehler-nrn"]!.length > 0
                      ? apartment["wasser-zaehler-nrn"]!.join(", ")
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

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
