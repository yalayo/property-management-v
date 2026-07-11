import React from "react";
import { useState, useEffect } from "react";
import { Home, Users, FileText, BarChart2, LogOut, Menu, Building, Building2, Landmark, Receipt, Tags, Download, Lock, ArrowUpRight, Shield, Calculator, UserCog, List, Network, Wallet, BookOpen } from "lucide-react";
import OtherFinancesView from "../components/finances/OtherFinancesView";
import Accounting from "../components/accounting/Accounting";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import PropertyList from "../components/dashboard/PropertyList";
import PropertyDetail from "../components/dashboard/PropertyDetail";
import TenantPayments from "../components/dashboard/TenantPayments";
import FileUpload from "../components/dashboard/FileUpload";
import UserAnalytics from "../components/dashboard/UserAnalytics";
import DashboardSummary from "../components/dashboard/DashboardSummary";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import BankStatement from "../components/bank/BankStatement";
import NebenkostenAbrechnung from "../components/billing/NebenkostenAbrechnung";
import PendingTasksWidget from "../components/dashboard/PendingTasksWidget";
import TrialBanner from "../components/trial/TrialBanner";
import TreeNav from "../components/nav/TreeNav";
import PropertyNebenkostenPanel from "../components/billing/PropertyNebenkostenPanel";

const PENDING_MIGRATION_KEY = "pm-pending-migration";

function SidebarContent({
  activeTab,
  onSelect,
  onLogout,
  isSuperAdmin = false,
  userRole = null,
  userSections = null,
  navMode = "list",
  onToggleNavMode,
  // tree mode data
  properties = [],
  apartments = [],
  garages = [],
  allAptCosts = [],
  allRentPayments = [],
  selectedApartmentId = null,
  selectedPropertyId = null,
  selectedNebenkostenKey = null,
  selectedGarageId = null,
  onSelectApartmentInTree,
  onSelectGarageInTree,
  onSelectPropertyStammdaten,
  onSelectPropertyNebenkosten,
}) {
  const { t } = useTranslation("nav");

  const allowedSections: Set<string> | null = userSections
    ? new Set(userSections.split(",").map((s: string) => s.trim()).filter(Boolean))
    : null;

  const ALL_NAV_ITEMS = [
    { id: "overview",    label: t("overview"),    icon: Home },
    { id: "properties",  label: t("properties"),  icon: Building },
    { id: "apartments",  label: t("apartments"),  icon: Building2 },
    { id: "tenants",     label: t("tenants"),     icon: Users },
    { id: "bank",        label: t("bank"),        icon: Landmark },
    { id: "abrechnung",  label: t("abrechnung"),  icon: Receipt },
    { id: "expenses",    label: t("expenses"),    icon: Tags },
    { id: "documents",   label: t("documents"),   icon: FileText },
    { id: "analytics",   label: t("analytics"),   icon: BarChart2 },
    { id: "tax",         label: t("tax"),         icon: Calculator },
    { id: "finances",    label: t("finances"),    icon: Wallet },
    { id: "accounting",  label: t("accounting"),  icon: BookOpen },
    ...(userRole === "admin" ? [{ id: "team", label: t("team"), icon: UserCog }] : []),
    ...(isSuperAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
  ];

  const NAV_ITEMS = allowedSections
    ? ALL_NAV_ITEMS.filter(item => allowedSections.has(item.id) || item.id === "team" || item.id === "admin")
    : ALL_NAV_ITEMS;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary">
        <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="ml-2 text-xl font-semibold text-white flex-1">PropManager</span>
        {onToggleNavMode && (
          <button
            title={navMode === "list" ? "Baumansicht" : "Listenansicht"}
            className="ml-1 p-1 rounded hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            onClick={onToggleNavMode}
          >
            {navMode === "list"
              ? <Network className="h-4 w-4" />
              : <List className="h-4 w-4" />}
          </button>
        )}
      </div>

      {navMode === "tree" ? (
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <TreeNav
            properties={properties}
            apartments={apartments}
            garages={garages}
            allAptCosts={allAptCosts}
            allRentPayments={allRentPayments}
            selectedApartmentId={selectedApartmentId}
            selectedPropertyId={selectedPropertyId}
            selectedNebenkostenKey={selectedNebenkostenKey}
            selectedGarageId={selectedGarageId}
            onSelectApartment={(aptId, year) => onSelectApartmentInTree?.(aptId, year)}
            onSelectGarage={onSelectGarageInTree}
            onSelectPropertyStammdaten={onSelectPropertyStammdaten}
            onSelectPropertyNebenkosten={onSelectPropertyNebenkosten}
            onSelectStammdaten={() => onSelect("properties")}
          />
        </nav>
      ) : (
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelect(id)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {label}
            </Button>
          ))}
        </nav>
      )}

      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <Button variant="outline" className="w-full" onClick={onLogout}>
          <LogOut className="mr-3 h-5 w-5" />
          {t("logout")}
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard(props) {
  const { t } = useTranslation("nav");
  const { t: td } = useTranslation("home");
  const [activeTab, setActiveTab] = useState<string>(() => props.activeTab || "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [pendingMigration, setPendingMigration] = useState<any | null>(null);
  const [navContext, setNavContext] = useState<{ propertyId?: string; aptId?: string; nonce: number } | null>(null);
  const [returnToProperty, setReturnToProperty] = useState<any | null>(null);
  const [navMode, setNavMode] = useState<"list" | "tree">(() =>
    (localStorage.getItem("pm-nav-mode") as "list" | "tree") ?? "list"
  );
  const [propertyNebenkostenView, setPropertyNebenkostenView] = useState<{ property: any; year: number } | null>(null);

  const handleToggleNavMode = () => {
    const next = navMode === "list" ? "tree" : "list";
    setNavMode(next);
    localStorage.setItem("pm-nav-mode", next);
  };

  const handleSelectApartmentInTree = (aptId: string, year: number) => {
    setSidebarOpen(false);
    props.onNavigateToApartment?.(aptId, "tenants");
    props.onSetApartmentYear?.(year);
  };

  const handleSelectPropertyStammdaten = (propertyId: string) => {
    const prop = (props.properties ?? []).find((p: any) => String(p.id) === propertyId);
    if (!prop) return;
    setSidebarOpen(false);
    props.onClearSelectedApartment?.();
    setPropertyNebenkostenView(null);
    setSelectedProperty(prop);
    setActiveTab("properties");
    props.onChangeTab?.("properties");
  };

  const handleSelectGarageInTree = (garageId: string) => {
    const garage = (props.garages ?? []).find((g: any) => String(g.id) === garageId);
    const prop = garage
      ? (props.properties ?? []).find((p: any) => String(p.id) === String(garage["property-id"]))
      : null;
    setSidebarOpen(false);
    setPropertyNebenkostenView(null);
    if (prop) {
      setReturnToProperty(prop);
      setSelectedProperty(prop);
    }
    setActiveTab("properties");
    props.onChangeTab?.("properties");
    props.onSelectGarageInline?.(garageId);
  };

  const handleSelectPropertyNebenkosten = (propertyId: string, year: number) => {
    const prop = (props.properties ?? []).find((p: any) => String(p.id) === propertyId);
    if (!prop) return;
    setSidebarOpen(false);
    props.onClearSelectedApartment?.();
    setSelectedProperty(null);
    setPropertyNebenkostenView({ property: prop, year });
    setActiveTab("properties");
    props.onChangeTab?.("properties");
  };

  // When a tenant/garage detail is dismissed (ID goes null) while we have a return target, snap back.
  useEffect(() => {
    if (!returnToProperty) return;
    const tenantGone  = props.selectedTenantId  == null;
    const garageGone  = props.selectedGarageId  == null;
    const aptGone     = props.selectedApartmentId == null;
    if (tenantGone && garageGone && aptGone) {
      setSelectedProperty(returnToProperty);
      setActiveTab("properties");
      props.onChangeTab?.("properties");
      setReturnToProperty(null);
    }
  }, [props.selectedTenantId, props.selectedGarageId, props.selectedApartmentId]);

  useEffect(() => {
    if (props.onLoadData) props.onLoadData();
  }, [props.userKey]);

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_MIGRATION_KEY);
    if (raw) {
      try {
        setPendingMigration(JSON.parse(raw));
      } catch {
        localStorage.removeItem(PENDING_MIGRATION_KEY);
      }
    }
  }, []);

  // Sync activeTab when restored from localStorage on first mount
  useEffect(() => {
    if (props.activeTab && props.activeTab !== activeTab) {
      setActiveTab(props.activeTab);
    }
  }, [props.activeTab]);

  const NAV_LABELS: Record<string, string> = {
    overview:   t("overview"),
    properties: t("properties"),
    apartments: t("apartments"),
    tenants:    t("tenants"),
    bank:       t("bank"),
    abrechnung: t("abrechnung"),
    expenses:   t("expenses"),
    documents:  t("documents"),
    analytics:  t("analytics"),
    tax:        t("tax"),
    finances:   t("finances"),
    accounting: t("accounting"),
    team:       t("team"),
    admin:      "Admin",
  };

  const handleSelect = (id: string, context?: { propertyId?: string; aptId?: string; aptTab?: string; tenantId?: any }) => {
    setActiveTab(id);
    setNavContext(context ? { ...context, nonce: Date.now() } : null);
    props.onChangeTab?.(id);
    setSidebarOpen(false);
    if (id !== "properties") {
      setSelectedProperty(null);
      setPropertyNebenkostenView(null);
      props.onClearSelectedApartment?.();
    } else {
      // Always clear the nebenkosten standalone view when navigating to the properties tab
      setPropertyNebenkostenView(null);
      // Clear selected property when no sub-context (e.g. global Stammdaten click or tab click)
      // Only preserve it when the caller explicitly provides a returnTo context
      if (!context || context.propertyId != null) {
        setSelectedProperty(null);
      }
    }
    if (id === "apartments" && context?.aptId) {
      props.onNavigateToApartment?.(context.aptId, context.aptTab ?? "rent");
    }
    if (id === "tenants" && context?.tenantId != null) {
      props.onNavigateToTenant?.(context.tenantId);
    }
  };

  const handleViewApartments = (property: any) => {
    setActiveTab("apartments");
    props.onViewApartments?.(property);
  };

  const activeLabel = NAV_LABELS[activeTab] ?? "Dashboard";

  const handleMigrationConfirm = () => {
    if (pendingMigration && props.onImportDemoData) {
      props.onImportDemoData(pendingMigration);
    }
    localStorage.removeItem(PENDING_MIGRATION_KEY);
    setPendingMigration(null);
  };

  const handleMigrationSkip = () => {
    localStorage.removeItem(PENDING_MIGRATION_KEY);
    setPendingMigration(null);
  };

  const migrationCount = pendingMigration?.properties?.length ?? 0;
  const migrationPlural = migrationCount === 1 ? "y" : "ies";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Dialog open={!!pendingMigration} onOpenChange={(open) => { if (!open) handleMigrationSkip(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              {td("dashboard.migrate.bannerTitle")}
            </DialogTitle>
            <DialogDescription>
              {td("dashboard.migrate.bannerDesc", {
                count: migrationCount,
                plural: migrationPlural,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleMigrationSkip}>
              {td("dashboard.migrate.skip")}
            </Button>
            <Button onClick={handleMigrationConfirm}>
              {td("dashboard.migrate.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Desktop sidebar — fixed, full height */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200">
        <SidebarContent
          activeTab={activeTab}
          onSelect={handleSelect}
          onLogout={() => props.onLogout()}
          isSuperAdmin={props.isSuperAdmin}
          userRole={props.userRole}
          userSections={props.userSections}
          navMode={navMode}
          onToggleNavMode={handleToggleNavMode}
          properties={props.properties ?? []}
          apartments={props.apartments ?? []}
          allAptCosts={props.allAptCosts ?? []}
          allRentPayments={props.allRentPayments ?? []}
          selectedApartmentId={props.selectedApartmentId}
          selectedPropertyId={selectedProperty ? String(selectedProperty.id) : null}
          selectedNebenkostenKey={propertyNebenkostenView ? `${propertyNebenkostenView.property.id}-${propertyNebenkostenView.year}` : null}
          selectedGarageId={props.selectedGarageId ? String(props.selectedGarageId) : null}
          garages={props.garages ?? []}
          onSelectApartmentInTree={handleSelectApartmentInTree}
          onSelectGarageInTree={handleSelectGarageInTree}
          onSelectPropertyStammdaten={handleSelectPropertyStammdaten}
          onSelectPropertyNebenkosten={handleSelectPropertyNebenkosten}
        />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 [&>button]:text-white [&>button]:top-[22px] [&>button]:right-12">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("navigation")}</SheetTitle>
          </SheetHeader>
          <SidebarContent
            activeTab={activeTab}
            onSelect={handleSelect}
            onLogout={() => props.onLogout()}
            isSuperAdmin={props.isSuperAdmin}
            userRole={props.userRole}
            userSections={props.userSections}
            navMode={navMode}
            onToggleNavMode={handleToggleNavMode}
            properties={props.properties ?? []}
            apartments={props.apartments ?? []}
            allAptCosts={props.allAptCosts ?? []}
            allRentPayments={props.allRentPayments ?? []}
            selectedApartmentId={props.selectedApartmentId}
            selectedPropertyId={selectedProperty ? String(selectedProperty.id) : null}
            selectedNebenkostenKey={propertyNebenkostenView ? `${propertyNebenkostenView.property.id}-${propertyNebenkostenView.year}` : null}
            selectedGarageId={props.selectedGarageId ? String(props.selectedGarageId) : null}
            garages={props.garages ?? []}
            onSelectApartmentInTree={handleSelectApartmentInTree}
            onSelectGarageInTree={handleSelectGarageInTree}
            onSelectPropertyStammdaten={handleSelectPropertyStammdaten}
            onSelectPropertyNebenkosten={handleSelectPropertyNebenkosten}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        {props.isImpersonating && (
          <div className="flex items-center justify-between bg-amber-950 px-4 py-2 text-sm font-semibold text-amber-100 shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Viewing as <strong className="text-white">{props.impersonatedEmail}</strong></span>
            </div>
            <button
              className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-white transition-colors"
              onClick={props.onExitImpersonation}
            >
              Exit Impersonation
            </button>
          </div>
        )}
        {/* Top bar — hamburger on mobile, section title + language switcher */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </Button>
          <span className="font-semibold text-slate-700 flex-1">{activeLabel}</span>
          <LanguageSwitcher />
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {props.isReadOnly && !props.trialInfo && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 flex-1">{t("readOnly.banner")}</p>
              {props.onUpgrade && (
                <button
                  onClick={props.onUpgrade}
                  className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
                >
                  {t("readOnly.upgrade")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {props.trialInfo && (
            <TrialBanner
              trialInfo={props.trialInfo}
              onPause={props.onPauseTrial}
              onResume={props.onResumeTrial}
            />
          )}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <PendingTasksWidget
                properties={props.properties}
                apartments={props.apartments}
                tenants={props.tenants}
                allCosts={props.allCosts}
                allAptCosts={props.allAptCosts}
                allRentPayments={props.allRentPayments}
                taxConfigs={props.taxConfigs}
                loans={props.taxLoans}
                expenseTypes={props.expenseTypes}
                onNavigate={(tab, ctx) => handleSelect(tab, ctx)}
                onEditProperty={props.onEditProperty}
                onAddRentPayment={props.onAddRentPayment}
                onAddRentPayments={props.onAddRentPayments}
                onUpdateApartment={props.onUpdateApartment}
                onAddCost={props.onAddCost}
                onAddAptCost={props.onAddAptCost}
                onUpdateAptCost={props.onUpdateAptCost}
                onUpdateTenant={props.onUpdateTenant}
              />
              <DashboardSummary
                properties={props.properties}
                propertiesLoading={props.propertiesLoading}
                apartments={props.apartments}
                apartmentsLoading={props.apartmentsLoading}
                tenants={props.tenants}
                tenantsLoading={props.tenantsLoading}
                allRentPayments={props.allRentPayments}
                paymentsLoading={props.paymentsLoading}
              />
            </div>
          )}

          {activeTab === "properties" && propertyNebenkostenView && !selectedProperty && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setPropertyNebenkostenView(null)}>
                  {"← Zurück"}
                </Button>
                <h2 className="text-xl font-bold">
                  {propertyNebenkostenView.property.name} — Nebenkosten {propertyNebenkostenView.year}
                </h2>
              </div>
              <PropertyNebenkostenPanel
                key={`${propertyNebenkostenView.property.id}-${propertyNebenkostenView.year}`}
                property={propertyNebenkostenView.property}
                expenseTypes={props.expenseTypes}
                costs={props.costs}
                costsLoading={props.costsLoading}
                costsSaving={props.costsSaving}
                isReadOnly={props.isReadOnly}
                initialYear={propertyNebenkostenView.year}
                lockYear
                onLoadCosts={props.onLoadCosts}
                onAddCost={props.onAddCost}
                onUpdateCost={props.onUpdateCost}
                onDeleteCost={props.onDeleteCost}
              />
            </div>
          )}

          {activeTab === "properties" && !propertyNebenkostenView && (
            selectedProperty && (props.selectedApartmentId != null || props.selectedGarageId != null) ? (
              props.apartmentsView
            ) : selectedProperty ? (
              <PropertyDetail
                property={selectedProperty}
                apartments={props.apartments}
                tenants={props.tenants}
                expenseTypes={props.expenseTypes}
                costs={props.costs}
                costsLoading={props.costsLoading}
                costsSaving={props.costsSaving}
                isReadOnly={props.isReadOnly}
                onLoadCosts={props.onLoadCosts}
                onAddCost={props.onAddCost}
                onUpdateCost={props.onUpdateCost}
                onDeleteCost={props.onDeleteCost}
                onBack={() => { setSelectedProperty(null); props.onClearSelectedApartment?.(); }}
                onViewApartment={(aptId) => { setReturnToProperty(selectedProperty); props.onSelectApartmentInline?.(aptId, "tenants"); }}
                onViewTenant={(tenantId) => { setReturnToProperty(selectedProperty); handleSelect("tenants", { tenantId }); }}
                onAddApartment={(_pid, data) => props.onAddApartment?.(selectedProperty.id, data)}
                onAddTenant={(data) => props.onAddTenant?.(data)}
                aptsSaving={props.aptsSaving}
                tenantsSaving={props.tenantsSaving}
                garages={props.garages ?? []}
                garagesSaving={props.aptsSaving}
                onAddGarage={props.onAddGarage}
                onViewGarage={(garageId) => { setReturnToProperty(selectedProperty); props.onSelectGarageInline?.(garageId); }}
              />
            ) : (
              <PropertyList
                properties={props.properties}
                apartments={props.apartments}
                isSaving={props.isSaving}
                isReadOnly={props.isReadOnly}
                saveError={props.propSaveError}
                justSaved={props.propJustSaved}
                onAddProperty={props.onAddProperty}
                onEditProperty={props.onEditProperty}
                onDeleteProperty={props.onDeleteProperty}
                onViewApartments={handleViewApartments}
                onSelectProperty={(property) => { props.onClearSelectedApartment?.(); setSelectedProperty(property); }}
                navContext={navContext}
              />
            )
          )}

          {activeTab === "apartments" && props.apartmentsView}

          {activeTab === "tenants" && props.tenantsView}
          {activeTab === "bank" && (
            <BankStatement
              apartments={props.apartments}
              tenants={props.tenants}
              properties={props.properties}
              expenseTypes={props.expenseTypes}
              allRentPayments={props.allRentPayments}
              allCosts={props.allCosts}
              bankAccounts={props.bankAccounts}
              isSaving={props.rentSaving}
              isReadOnly={props.isReadOnly}
              onAssignPayment={props.onAssignPayment}
              onRecordExpense={props.onRecordExpense}
              onSaveBankAccount={props.onSaveBankAccount}
              onUpdateBankAccount={props.onUpdateBankAccount}
              onDeleteBankAccount={props.onDeleteBankAccount}
            />
          )}
          {activeTab === "abrechnung" && (
            <NebenkostenAbrechnung
              properties={props.properties}
              apartments={props.apartments}
              tenants={props.tenants}
              costs={props.allCosts}
              aptCosts={props.aptCosts}
              rentPayments={props.rentPayments}
              expenseTypes={props.expenseTypes}
              nebenkostenSettlements={props.nebenkostenSettlements}
              costsLoading={props.costsLoading}
              aptCostsLoading={props.aptCostsLoading}
              rentLoading={props.rentLoading}
              propertySaving={props.isSaving}
              computeReadiness={props.computeReadiness}
              onLoadCosts={props.onLoadCosts}
              onLoadAptCosts={props.onLoadAptCosts}
              onLoadRentPayments={props.onLoadRentPayments}
              onEditProperty={props.onEditProperty}
              onAddNebenkostenSettlement={props.onAddNebenkostenSettlement}
              onDeleteNebenkostenSettlement={props.onDeleteNebenkostenSettlement}
              navContext={navContext}
            />
          )}
          {activeTab === "expenses" && props.expensesView}
          {activeTab === "documents" && <FileUpload />}
          {activeTab === "analytics" && (
            <UserAnalytics
              properties={props.properties}
              apartments={props.apartments}
              tenants={props.tenants}
              allCosts={props.allCosts}
              allAptCosts={props.allAptCosts}
              allRentPayments={props.allRentPayments}
            />
          )}
          {activeTab === "tax" && props.taxView}
          {activeTab === "finances" && (
            <OtherFinancesView
              properties={props.properties}
              taxIncomes={props.taxIncomes}
              taxExpenses={props.taxExpenses}
              isReadOnly={props.isReadOnly}
              isSaving={props.isSaving}
              onAddTaxIncome={props.onAddTaxIncome}
              onDeleteTaxIncome={props.onDeleteTaxIncome}
              onAddTaxExpense={props.onAddTaxExpense}
              onDeleteTaxExpense={props.onDeleteTaxExpense}
            />
          )}
          {activeTab === "accounting" && (
            <Accounting
              properties={props.properties}
              apartments={props.apartments}
              garages={props.garages}
              allCosts={props.allCosts}
              allRentPayments={props.allRentPayments}
              taxConfigs={props.taxConfigs}
              taxLoans={props.taxLoans}
              taxMaintenances={props.taxMaintenances}
              nebenkostenSettlements={props.nebenkostenSettlements}
              taxIncomes={props.taxIncomes}
              taxExpenses={props.taxExpenses}
              journalEntries={props.journalEntries}
              accountingOnboarding={props.accountingOnboarding}
              openingBalances={props.openingBalances}
              accountingOnboardingLoaded={props.accountingOnboardingLoaded}
              isReadOnly={props.isReadOnly}
              isSaving={props.journalSaving}
              onAddJournalEntry={props.onAddJournalEntry}
              onStornoJournalEntry={props.onStornoJournalEntry}
              onCompleteAccountingOnboarding={props.onCompleteAccountingOnboarding}
            />
          )}
          {activeTab === "team" && props.userRole === "admin" && props.teamView}
          {activeTab === "admin" && props.isSuperAdmin && props.adminPanel}
        </main>
      </div>
    </div>
  );
}
