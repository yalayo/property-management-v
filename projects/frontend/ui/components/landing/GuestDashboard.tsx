import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Users, Tags, FileText, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PropertyList from "../dashboard/PropertyList";
import PropertyDetail from "../dashboard/PropertyDetail";
import ApartmentsList from "../apartments/ApartmentsList";
import AddApartment from "../apartments/AddApartment";
import ApartmentDetail from "../apartments/ApartmentDetail";
import TenantsList from "../tenants/TenantsList";
import AddTenant from "../tenants/AddTenant";
import ManageTenant from "../tenants/ManageTenant";
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
  endDate?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  householdMembers?: string;
  kaltmiete?: string;
  nebenkostenWarm?: string;
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

function aptToComp(apt: GuestApartment, tenants: GuestTenant[]) {
  const occupied = tenants.some(t => t.apartmentId === apt.id && !t.endDate);
  return { id: apt.id, code: apt.code, "property-id": apt.propertyId, property_id: apt.propertyId, occupied };
}

function tenantToComp(ten: GuestTenant) {
  return {
    id: ten.id,
    "apartment-id": ten.apartmentId,
    "first-name": ten.firstName,
    "last-name": ten.lastName,
    "start-date": ten.startDate,
    "end-date": ten.endDate,
    email: ten.email,
    phone: ten.phone,
    birthday: ten.birthday,
    "household-members": ten.householdMembers,
    kaltmiete: ten.kaltmiete,
    "nebenkosten-warm": ten.nebenkostenWarm,
  };
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

export default function GuestDashboard({ guestUser, onGuestUserChange, onSignUp }: Props) {
  const { t } = useTranslation("landing");

  // Controlled tab state so PropertyList can switch to apartments tab
  const [activeTab, setActiveTab] = useState("properties");

  // Drill-down views
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [abrAptId, setAbrAptId] = useState<string | null>(null);

  // Apartment add form state
  const [showAddApartment, setShowAddApartment] = useState(false);
  const [newAptCode, setNewAptCode] = useState("");
  const [newAptPropertyId, setNewAptPropertyId] = useState("");

  // Tenant add dialog
  const [showAddTenant, setShowAddTenant] = useState(false);

  const guestPropCount   = guestUser.properties.length;
  const guestAptCount    = guestUser.apartments.length;
  const guestTenantCount = guestUser.tenants.length;
  const guestEtCount     = (guestUser.expenseTypes ?? []).length;

  // ── Property handlers ─────────────────────────────────────────────────────
  const handleAddProperty = (data: any) => {
    const newProp: GuestProperty = {
      id:         crypto.randomUUID(),
      name:       data.name,
      address:    data.address,
      city:       data.city,
      postalCode: data.postalCode,
      units:      Number(data.units) || 1,
    };
    onGuestUserChange({ ...guestUser, properties: [...guestUser.properties, newProp] });
  };

  const handleUpdateProperty = (id: string | number, data: any) => {
    onGuestUserChange({
      ...guestUser,
      properties: guestUser.properties.map(p =>
        p.id === String(id)
          ? {
              ...p,
              name:               data.name       ?? p.name,
              address:            data.address     ?? p.address,
              city:               data.city        ?? p.city,
              postalCode:         data.postalCode  ?? p.postalCode,
              units:              data.units != null ? Number(data.units) : p.units,
              iban:               data.iban               ?? p.iban,
              bankName:           data.bankName           ?? p.bankName,
              landlordName:       data.landlordName       ?? p.landlordName,
              landlordStreet:     data.landlordStreet     ?? p.landlordStreet,
              landlordPostalCity: data.landlordPostalCity ?? p.landlordPostalCity,
            }
          : p
      ),
    });
  };

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

  // ── Property cost handlers ────────────────────────────────────────────────
  const handleAddCost = (data: { propertyId: string; line: string; name: string; year: number; value: number }) => {
    const newCost: GuestCost = { id: crypto.randomUUID(), "property-id": data.propertyId, line: data.line, name: data.name, year: data.year, value: data.value };
    onGuestUserChange({ ...guestUser, costs: [...(guestUser.costs ?? []), newCost] });
  };

  const handleUpdateCost = (data: { id: string; value: number }) => {
    onGuestUserChange({
      ...guestUser,
      costs: (guestUser.costs ?? []).map(c => c.id === data.id ? { ...c, value: data.value } : c),
    });
  };

  const handleDeleteCost = (id: string) => {
    onGuestUserChange({ ...guestUser, costs: (guestUser.costs ?? []).filter(c => c.id !== id) });
  };

  // ── Apartment handlers ────────────────────────────────────────────────────
  const closeAddApartment = () => {
    setShowAddApartment(false);
    setNewAptCode("");
    setNewAptPropertyId("");
  };

  const handleAddApartmentSubmit = () => {
    if (!newAptCode.trim() || !newAptPropertyId) return;
    const newApt: GuestApartment = { id: crypto.randomUUID(), propertyId: newAptPropertyId, code: newAptCode.trim() };
    onGuestUserChange({ ...guestUser, apartments: [...guestUser.apartments, newApt] });
    closeAddApartment();
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
  const handleAddTenantSubmit = (data: any) => {
    const apt = data.apartmentId ? guestUser.apartments.find(a => a.id === data.apartmentId) : undefined;
    const newTenant: GuestTenant = {
      id:          crypto.randomUUID(),
      apartmentId: data.apartmentId ?? "",
      propertyId:  apt?.propertyId ?? "",
      firstName:   data.firstName,
      lastName:    data.lastName ?? "",
      startDate:   data.startDate ?? "",
    };
    onGuestUserChange({ ...guestUser, tenants: [...guestUser.tenants, newTenant] });
    setShowAddTenant(false);
  };

  const handleUpdateTenant = (id: string | number, data: Record<string, string>) => {
    onGuestUserChange({
      ...guestUser,
      tenants: guestUser.tenants.map(ten =>
        ten.id === String(id)
          ? {
              ...ten,
              firstName:        data.firstName || ten.firstName,
              lastName:         data.lastName ?? ten.lastName,
              startDate:        data.startDate || ten.startDate,
              endDate:          data.endDate || undefined,
              email:            data.email || undefined,
              phone:            data.phone || undefined,
              birthday:         data.birthday || undefined,
              householdMembers: data.householdMembers || undefined,
              kaltmiete:        data.kaltmiete || undefined,
              nebenkostenWarm:  data.nebenkostenWarm || undefined,
            }
          : ten
      ),
    });
  };

  const handleDeleteTenant = (id: string | number) => {
    onGuestUserChange({ ...guestUser, tenants: guestUser.tenants.filter(ten => ten.id !== String(id)) });
    setSelectedTenantId(null);
  };

  // ── ApartmentDetail callbacks ─────────────────────────────────────────────
  const selectedApt             = selectedAptId ? guestUser.apartments.find(a => a.id === selectedAptId) ?? null : null;
  const aptCostsForSelected     = (guestUser.aptCosts ?? []).filter(c => c["apartment-id"] === selectedAptId);
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

  // ── Derived collections (needed by both drill-downs and tabbed view) ────────
  const allAptsForComp    = guestUser.apartments.map(a => aptToComp(a, guestUser.tenants)) as any[];
  const allTenantsForComp = guestUser.tenants.map(tenantToComp) as any[];

  // ── Drill-down: PropertyDetail ────────────────────────────────────────────
  const selectedProperty = selectedPropertyId ? guestUser.properties.find(p => p.id === selectedPropertyId) ?? null : null;
  const costsForSelectedProperty = (guestUser.costs ?? []).filter(c => c["property-id"] === selectedPropertyId);

  if (selectedProperty) {
    return (
      <PropertyDetail
        property={propToComp(selectedProperty)}
        expenseTypes={guestUser.expenseTypes ?? []}
        costs={costsForSelectedProperty}
        costsLoading={false}
        costsSaving={false}
        onLoadCosts={() => {}}
        onAddCost={handleAddCost}
        onUpdateCost={handleUpdateCost}
        onDeleteCost={handleDeleteCost}
        onBack={() => setSelectedPropertyId(null)}
      />
    );
  }

  // ── Drill-down: ApartmentDetail ───────────────────────────────────────────
  if (selectedApt) {
    return (
      <ApartmentDetail
        apartment={aptToComp(selectedApt, guestUser.tenants)}
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

  // ── Drill-down: ManageTenant ──────────────────────────────────────────────
  const selectedTenant = selectedTenantId ? guestUser.tenants.find(t => t.id === selectedTenantId) ?? null : null;

  if (selectedTenant) {
    return (
      <ManageTenant
        tenant={tenantToComp(selectedTenant) as any}
        isSaving={false}
        onBack={() => setSelectedTenantId(null)}
        onDelete={(id) => handleDeleteTenant(id)}
        onUpdate={(id, data) => handleUpdateTenant(id, data)}
      />
    );
  }

  // ── Tabbed view ───────────────────────────────────────────────────────────

  return (
    <>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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

        {/* Properties tab — real PropertyList component */}
        <TabsContent value="properties">
          <PropertyList
            properties={guestUser.properties.map(propToComp)}
            apartments={allAptsForComp}
            isSaving={false}
            onAddProperty={handleAddProperty}
            onEditProperty={(id, data) => handleUpdateProperty(id, data)}
            onDeleteProperty={(id) => handleDeleteProperty(String(id))}
            onSelectProperty={(p) => setSelectedPropertyId(String(p.id))}
            onViewApartments={() => setActiveTab("apartments")}
          />
        </TabsContent>

        {/* Apartments tab — real ApartmentsList component */}
        <TabsContent value="apartments">
          <ApartmentsList
            apartments={allAptsForComp}
            isAddApartmentDialogOpen={showAddApartment}
            onChangeAddApartmentDialogOpen={() => setShowAddApartment(true)}
            onCloseAddApartmentDialog={closeAddApartment}
            onSelectApartment={(id) => setSelectedAptId(String(id))}
            onManageApartment={(id) => setSelectedAptId(String(id))}
            onAssignTenant={(id) => setSelectedAptId(String(id))}
          >
            <AddApartment
              properties={guestUser.properties.map(p => ({ id: p.id, name: p.name })) as any}
              apartments={allAptsForComp}
              code={newAptCode}
              onChangeCode={(e) => setNewAptCode(e.target.value)}
              onChangeProperty={(v) => setNewAptPropertyId(v)}
              onChangeAddApartmentDialogClose={closeAddApartment}
              submitApartment={handleAddApartmentSubmit}
            />
          </ApartmentsList>
        </TabsContent>

        {/* Tenants tab — real TenantsList component */}
        <TabsContent value="tenants">
          <TenantsList
            tenants={allTenantsForComp}
            isAddTenantDialogOpen={showAddTenant}
            onOpenAddTenantDialog={() => setShowAddTenant(true)}
            onManageTenant={(id) => setSelectedTenantId(String(id))}
          >
            <AddTenant
              apartments={guestUser.apartments.map(a => ({ id: a.id, code: a.code })) as any}
              tenants={allTenantsForComp}
              onClose={() => setShowAddTenant(false)}
              onSubmit={handleAddTenantSubmit}
            />
          </TenantsList>
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
            apartments={guestUser.apartments.map(a => aptToComp(a, guestUser.tenants))}
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
