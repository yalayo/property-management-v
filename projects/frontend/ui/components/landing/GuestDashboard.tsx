import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Building2, Users, Trash2, Tags, FileText, ChevronRight, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ApartmentDetail from "../apartments/ApartmentDetail";
import ExpenseTypes from "../settings/ExpenseTypes";
import NebenkostenAbrechnung from "../billing/NebenkostenAbrechnung";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  units: number;
  iban?: string;
  bankName?: string;
  landlordName?: string;
  landlordStreet?: string;
  landlordPostalCity?: string;
}

export interface GuestApartment {
  id: string;
  propertyId: string;
  code: string;
}

export interface GuestTenant {
  id: string;
  apartmentId: string;
  propertyId: string;
  firstName: string;
  lastName: string;
  startDate: string;
}

export interface GuestExpenseType {
  id: string;
  key: string;
  "name-en": string;
  "name-de": string;
}

export interface GuestCost {
  id: string;
  "property-id": string;
  line: string;
  name: string;
  year: number;
  value: number;
}

export interface GuestAptCost {
  id: string;
  "apartment-id": string;
  line: string;
  name: string;
  year: number;
  value: number;
  verteiler?: number;
  anteil?: number;
  schluessel?: string;
}

export interface GuestRentPayment {
  id: string;
  "apartment-id": string;
  year: number;
  month: number;
  value: number;
}

export interface GuestUser {
  name: string;
  email: string;
  properties: GuestProperty[];
  apartments: GuestApartment[];
  tenants: GuestTenant[];
  expenseTypes?: GuestExpenseType[];
  costs?: GuestCost[];
  aptCosts?: GuestAptCost[];
  rentPayments?: GuestRentPayment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function aptToComp(apt: GuestApartment) {
  return { id: apt.id, code: apt.code, "property-id": apt.propertyId, property_id: apt.propertyId, occupied: false };
}

function tenantToComp(ten: GuestTenant) {
  return { id: ten.id, "apartment-id": ten.apartmentId, "first-name": ten.firstName, "last-name": ten.lastName, "start-date": ten.startDate };
}

function propToComp(p: GuestProperty) {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    "postal-code": p.postalCode,
    units: p.units,
    iban: p.iban,
    "bank-name": p.bankName,
    "landlord-name": p.landlordName,
    "landlord-street": p.landlordStreet,
    "landlord-postal-city": p.landlordPostalCity,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  guestUser: GuestUser;
  onGuestUserChange: (updated: GuestUser) => void;
  onSignUp?: () => void;
  onOpenAddPropertyDialog?: () => void;
}

export default function GuestDashboard({ guestUser, onGuestUserChange, onSignUp, onOpenAddPropertyDialog }: Props) {
  const { t } = useTranslation("landing");

  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [abrAptId, setAbrAptId] = useState<string | null>(null);

  const [showAddApartment, setShowAddApartment] = useState(false);
  const [aptForm, setAptForm] = useState({ propertyId: "", code: "" });
  const [aptError, setAptError] = useState("");

  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({ apartmentId: "", firstName: "", lastName: "", startDate: "" });
  const [tenantError, setTenantError] = useState("");

  const guestPropCount   = guestUser.properties.length;
  const guestAptCount    = guestUser.apartments.length;
  const guestTenantCount = guestUser.tenants.length;
  const guestEtCount     = (guestUser.expenseTypes ?? []).length;

  const propName = (id: string) => guestUser.properties.find(p => p.id === id)?.name ?? id;
  const aptLabel = (id: string) => {
    const a = guestUser.apartments.find(a => a.id === id);
    if (!a) return id;
    return `${a.code} — ${propName(a.propertyId)}`;
  };

  // ── Property handlers ─────────────────────────────────────────────────────
  const handleDeleteProperty = (id: string) => {
    const affectedAptIds = guestUser.apartments.filter(a => a.propertyId === id).map(a => a.id);
    onGuestUserChange({
      ...guestUser,
      properties:   guestUser.properties.filter(p => p.id !== id),
      apartments:   guestUser.apartments.filter(a => a.propertyId !== id),
      tenants:      guestUser.tenants.filter(ten => ten.propertyId !== id),
      costs:        (guestUser.costs ?? []).filter(c => c["property-id"] !== id),
      aptCosts:     (guestUser.aptCosts ?? []).filter(c => !affectedAptIds.includes(c["apartment-id"])),
      rentPayments: (guestUser.rentPayments ?? []).filter(r => !affectedAptIds.includes(r["apartment-id"])),
    });
  };

  // ── Apartment handlers ────────────────────────────────────────────────────
  const handleAddApartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptForm.code.trim())  { setAptError(t("addApartment.codeRequired"));   return; }
    if (!aptForm.propertyId)   { setAptError(t("addApartment.selectProperty")); return; }
    const newApt: GuestApartment = { id: crypto.randomUUID(), propertyId: aptForm.propertyId, code: aptForm.code.trim() };
    onGuestUserChange({ ...guestUser, apartments: [...guestUser.apartments, newApt] });
    setAptForm({ propertyId: "", code: "" });
    setAptError("");
    setShowAddApartment(false);
  };

  const handleDeleteApartment = (id: string) => {
    onGuestUserChange({
      ...guestUser,
      apartments:   guestUser.apartments.filter(a => a.id !== id),
      tenants:      guestUser.tenants.filter(ten => ten.apartmentId !== id),
      aptCosts:     (guestUser.aptCosts ?? []).filter(c => c["apartment-id"] !== id),
      rentPayments: (guestUser.rentPayments ?? []).filter(r => r["apartment-id"] !== id),
    });
    if (selectedAptId === id) setSelectedAptId(null);
  };

  // ── Tenant handlers ───────────────────────────────────────────────────────
  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.firstName.trim()) { setTenantError(t("addTenant.firstNameRequired")); return; }
    if (!tenantForm.apartmentId)      { setTenantError(t("addTenant.selectApartment"));   return; }
    const apt = guestUser.apartments.find(a => a.id === tenantForm.apartmentId);
    const newTenant: GuestTenant = {
      id:          crypto.randomUUID(),
      apartmentId: tenantForm.apartmentId,
      propertyId:  apt?.propertyId ?? "",
      firstName:   tenantForm.firstName.trim(),
      lastName:    tenantForm.lastName.trim(),
      startDate:   tenantForm.startDate,
    };
    onGuestUserChange({ ...guestUser, tenants: [...guestUser.tenants, newTenant] });
    setTenantForm({ apartmentId: "", firstName: "", lastName: "", startDate: "" });
    setTenantError("");
    setShowAddTenant(false);
  };

  const handleDeleteTenant = (id: string) => {
    onGuestUserChange({ ...guestUser, tenants: guestUser.tenants.filter(ten => ten.id !== id) });
  };

  // ── ApartmentDetail callbacks ─────────────────────────────────────────────
  const selectedApt            = selectedAptId ? guestUser.apartments.find(a => a.id === selectedAptId) ?? null : null;
  const aptCostsForSelected    = (guestUser.aptCosts ?? []).filter(c => c["apartment-id"] === selectedAptId);
  const rentPaymentsForSelected = (guestUser.rentPayments ?? []).filter(r => r["apartment-id"] === selectedAptId);

  const handleAddAptCost = (data: any) => {
    const apt = guestUser.apartments.find(a => a.id === data.apartmentId);
    const propertyId = apt?.propertyId;
    const newAptCost: GuestAptCost = {
      id: crypto.randomUUID(),
      "apartment-id": data.apartmentId,
      line: data.line,
      name: data.name,
      year: data.year,
      value: data.value,
      verteiler: data.verteiler,
      anteil:    data.anteil,
      schluessel: data.schluessel,
    };
    // Ensure a property-level cost stub exists so Abrechnung can detect this line as active
    const existingPropCost = propertyId && (guestUser.costs ?? []).find(
      c => c["property-id"] === propertyId && c.line === data.line && c.year === data.year
    );
    const updatedCosts = existingPropCost
      ? (guestUser.costs ?? [])
      : [
          ...(guestUser.costs ?? []),
          ...(propertyId ? [{ id: crypto.randomUUID(), "property-id": propertyId, line: data.line, name: data.name, year: data.year, value: 0 } as GuestCost] : []),
        ];
    onGuestUserChange({ ...guestUser, aptCosts: [...(guestUser.aptCosts ?? []), newAptCost], costs: updatedCosts });
  };

  const handleUpdateAptCost = (data: any) => {
    onGuestUserChange({
      ...guestUser,
      aptCosts: (guestUser.aptCosts ?? []).map(c =>
        c.id === data.id ? { ...c, value: data.value, verteiler: data.verteiler, anteil: data.anteil, schluessel: data.schluessel } : c
      ),
    });
  };

  const handleDeleteAptCost = (id: string) => {
    onGuestUserChange({ ...guestUser, aptCosts: (guestUser.aptCosts ?? []).filter(c => c.id !== id) });
  };

  const handleAddRentPayment = (data: any) => {
    const newPayment: GuestRentPayment = {
      id: crypto.randomUUID(),
      "apartment-id": data.apartmentId,
      year: data.year,
      month: data.month,
      value: data.value,
    };
    onGuestUserChange({ ...guestUser, rentPayments: [...(guestUser.rentPayments ?? []), newPayment] });
  };

  const handleUpdateRentPayment = (data: any) => {
    onGuestUserChange({
      ...guestUser,
      rentPayments: (guestUser.rentPayments ?? []).map(r => r.id === data.id ? { ...r, value: data.value } : r),
    });
  };

  const handleDeleteRentPayment = (id: string) => {
    onGuestUserChange({ ...guestUser, rentPayments: (guestUser.rentPayments ?? []).filter(r => r.id !== id) });
  };

  // ── Expense type callbacks ────────────────────────────────────────────────
  const handleAddExpenseType = (data: { key: string; nameEn: string; nameDe: string }) => {
    const newEt: GuestExpenseType = { id: crypto.randomUUID(), key: data.key, "name-en": data.nameEn, "name-de": data.nameDe };
    onGuestUserChange({ ...guestUser, expenseTypes: [...(guestUser.expenseTypes ?? []), newEt] });
  };

  const handleUpdateExpenseType = (id: string, nameEn: string, nameDe: string) => {
    onGuestUserChange({
      ...guestUser,
      expenseTypes: (guestUser.expenseTypes ?? []).map(et =>
        et.id === id ? { ...et, "name-en": nameEn, "name-de": nameDe } : et
      ),
    });
  };

  const handleDeleteExpenseType = (id: string) => {
    onGuestUserChange({ ...guestUser, expenseTypes: (guestUser.expenseTypes ?? []).filter(et => et.id !== id) });
  };

  // ── NebenkostenAbrechnung: property edit ──────────────────────────────────
  const handleAbrEditProperty = (id: string, data: any) => {
    onGuestUserChange({
      ...guestUser,
      properties: guestUser.properties.map(p =>
        p.id === id
          ? { ...p, iban: data.iban, bankName: data.bankName, landlordName: data.landlordName, landlordStreet: data.landlordStreet, landlordPostalCity: data.landlordPostalCity }
          : p
      ),
    });
  };

  // ── ApartmentDetail drill-down view ──────────────────────────────────────
  if (selectedApt) {
    return (
      <ApartmentDetail
        apartment={aptToComp(selectedApt)}
        properties={guestUser.properties.map(propToComp)}
        tenants={guestUser.tenants.filter(ten => ten.apartmentId === selectedAptId).map(tenantToComp)}
        expenseTypes={guestUser.expenseTypes ?? []}
        aptCosts={aptCostsForSelected}
        aptCostsSaving={false}
        onLoadAptCosts={() => {}}
        onAddAptCost={handleAddAptCost}
        onUpdateAptCost={handleUpdateAptCost}
        onDeleteAptCost={handleDeleteAptCost}
        allCosts={guestUser.costs ?? []}
        rentPayments={rentPaymentsForSelected}
        rentSaving={false}
        onLoadRentPayments={() => {}}
        onAddRentPayment={handleAddRentPayment}
        onUpdateRentPayment={handleUpdateRentPayment}
        onDeleteRentPayment={handleDeleteRentPayment}
        onBack={() => setSelectedAptId(null)}
      />
    );
  }

  // ── Tabbed view ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Add apartment modal */}
      <Dialog open={showAddApartment} onOpenChange={setShowAddApartment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addApartment.modalTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddApartmentSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("addApartment.propertyLabel")}</Label>
              <Select
                value={aptForm.propertyId}
                onValueChange={(v) => { setAptForm(f => ({ ...f, propertyId: v })); setAptError(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("addApartment.selectProperty")} />
                </SelectTrigger>
                <SelectContent>
                  {guestUser.properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-code">{t("addApartment.codeLabel")}</Label>
              <Input
                id="apt-code"
                placeholder={t("addApartment.codePlaceholder")}
                value={aptForm.code}
                onChange={(e) => { setAptForm(f => ({ ...f, code: e.target.value })); setAptError(""); }}
              />
            </div>
            {aptError && <p className="text-sm text-destructive">{aptError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("addApartment.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add tenant modal */}
      <Dialog open={showAddTenant} onOpenChange={setShowAddTenant}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addTenant.modalTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTenantSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t("addTenant.apartmentLabel")}</Label>
              <Select
                value={tenantForm.apartmentId}
                onValueChange={(v) => { setTenantForm(f => ({ ...f, apartmentId: v })); setTenantError(""); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("addTenant.selectApartment")} />
                </SelectTrigger>
                <SelectContent>
                  {guestUser.apartments.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {propName(a.propertyId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-first">{t("addTenant.firstNameLabel")}</Label>
                <Input
                  id="tenant-first"
                  placeholder={t("addTenant.firstNamePlaceholder")}
                  value={tenantForm.firstName}
                  onChange={(e) => { setTenantForm(f => ({ ...f, firstName: e.target.value })); setTenantError(""); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-last">{t("addTenant.lastNameLabel")}</Label>
                <Input
                  id="tenant-last"
                  placeholder={t("addTenant.lastNamePlaceholder")}
                  value={tenantForm.lastName}
                  onChange={(e) => setTenantForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-start">{t("addTenant.startDateLabel")}</Label>
              <Input
                id="tenant-start"
                type="date"
                value={tenantForm.startDate}
                onChange={(e) => setTenantForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            {tenantError && <p className="text-sm text-destructive">{tenantError}</p>}
            <DialogFooter>
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("addTenant.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("demo.sectionTitle")}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t("demo.sectionSubtitle")}</p>
        </div>
        {onSignUp && (
          <Button size="sm" onClick={onSignUp} className="flex-shrink-0">
            <UserPlus className="mr-1.5 h-4 w-4" />
            {t("demo.createAccountCta")}
          </Button>
        )}
      </div>

      <Tabs defaultValue="properties">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="properties">
            <Building2 className="mr-1.5 h-4 w-4" />
            {t("demo.tabProperties", { count: guestPropCount })}
          </TabsTrigger>
          <TabsTrigger value="apartments" disabled={guestPropCount === 0}>
            <Building2 className="mr-1.5 h-4 w-4" />
            {t("demo.tabApartments", { count: guestAptCount })}
          </TabsTrigger>
          <TabsTrigger value="tenants" disabled={guestAptCount === 0}>
            <Users className="mr-1.5 h-4 w-4" />
            {t("demo.tabTenants", { count: guestTenantCount })}
          </TabsTrigger>
          <TabsTrigger value="expense-types">
            <Tags className="mr-1.5 h-4 w-4" />
            {t("demo.tabExpenseTypes", { count: guestEtCount })}
          </TabsTrigger>
          <TabsTrigger value="abrechnung" disabled={guestPropCount === 0}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t("demo.tabAbrechnung")}
          </TabsTrigger>
        </TabsList>

        {/* Properties tab */}
        <TabsContent value="properties">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={onOpenAddPropertyDialog}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("addProperty.submit")}
            </Button>
          </div>
          {guestPropCount === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("hero.stats.addFirstProperty")}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestUser.properties.map(p => {
                const aptCount = guestUser.apartments.filter(a => a.propertyId === p.id).length;
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 truncate">{p.address}, {p.city}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {p.units} unit{p.units !== 1 ? "s" : ""} · {aptCount} apt{aptCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProperty(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                      title={t("demo.deleteConfirm")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Apartments tab */}
        <TabsContent value="apartments">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={() => setShowAddApartment(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("demo.addApartment")}
            </Button>
          </div>
          {guestAptCount === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("demo.noApartments")}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestUser.apartments.map(a => {
                const tenantCount = guestUser.tenants.filter(ten => ten.apartmentId === a.id).length;
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{a.code}</p>
                      <p className="text-xs text-slate-500 truncate">{propName(a.propertyId)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tenantCount} tenant{tenantCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setSelectedAptId(a.id)}
                        className="text-slate-400 hover:text-primary p-1 transition-colors"
                        title={t("demo.manageApartment")}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApartment(a.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                        title={t("demo.deleteConfirm")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tenants tab */}
        <TabsContent value="tenants">
          <div className="flex justify-end mb-3">
            <Button size="sm" variant="outline" onClick={() => setShowAddTenant(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("demo.addTenant")}
            </Button>
          </div>
          {guestTenantCount === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("demo.noTenants")}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guestUser.tenants.map(ten => (
                <div key={ten.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{ten.firstName} {ten.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{aptLabel(ten.apartmentId)}</p>
                    {ten.startDate && (
                      <p className="text-xs text-slate-400 mt-0.5">from {ten.startDate}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTenant(ten.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
                    title={t("demo.deleteConfirm")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expense Types tab */}
        <TabsContent value="expense-types">
          <ExpenseTypes
            expenseTypes={guestUser.expenseTypes ?? []}
            onAdd={handleAddExpenseType}
            onUpdate={handleUpdateExpenseType}
            onDelete={handleDeleteExpenseType}
          />
        </TabsContent>

        {/* Abrechnung tab */}
        <TabsContent value="abrechnung">
          <NebenkostenAbrechnung
            properties={guestUser.properties.map(propToComp)}
            apartments={guestUser.apartments.map(aptToComp)}
            tenants={guestUser.tenants.map(tenantToComp)}
            costs={guestUser.costs ?? []}
            aptCosts={(guestUser.aptCosts ?? []).filter(c => !abrAptId || c["apartment-id"] === abrAptId)}
            rentPayments={(guestUser.rentPayments ?? []).filter(r => !abrAptId || r["apartment-id"] === abrAptId)}
            expenseTypes={guestUser.expenseTypes ?? []}
            onLoadCosts={() => setAbrAptId(null)}
            onLoadAptCosts={(aptId) => setAbrAptId(aptId)}
            onLoadRentPayments={(aptId) => setAbrAptId(aptId)}
            onEditProperty={handleAbrEditProperty}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
