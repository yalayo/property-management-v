import React from "react";
import { useState, useEffect } from "react";
import { Home, Users, FileText, BarChart2, LogOut, Menu, Building, Building2, Landmark, Receipt, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import PropertyList from "../components/dashboard/PropertyList";
import PropertyDetail from "../components/dashboard/PropertyDetail";
import TenantPayments from "../components/dashboard/TenantPayments";
import FileUpload from "../components/dashboard/FileUpload";
import UserAnalytics from "../components/dashboard/UserAnalytics";
import DashboardSummary from "../components/dashboard/DashboardSummary";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import BankStatement from "../components/bank/BankStatement";
import NebenkostenAbrechnung from "../components/billing/NebenkostenAbrechnung";

function SidebarContent({ activeTab, onSelect, onLogout }) {
  const { t } = useTranslation("nav");

  const NAV_ITEMS = [
    { id: "overview",    label: t("overview"),    icon: Home },
    { id: "properties",  label: t("properties"),  icon: Building },
    { id: "apartments",  label: t("apartments"),  icon: Building2 },
    { id: "tenants",     label: t("tenants"),     icon: Users },
    { id: "bank",        label: t("bank"),        icon: Landmark },
    { id: "abrechnung",  label: t("abrechnung"),  icon: Receipt },
    { id: "expenses",    label: t("expenses"),    icon: Tags },
    { id: "documents",   label: t("documents"),   icon: FileText },
    { id: "analytics",   label: t("analytics"),   icon: BarChart2 },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary">
        <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="ml-2 text-xl font-semibold text-white">PropManager</span>
      </div>

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
  const [activeTab, setActiveTab] = useState<string>(() => props.activeTab || "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

  useEffect(() => {
    if (props.onLoadData) props.onLoadData();
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
  };

  const handleSelect = (id: string) => {
    setActiveTab(id);
    props.onChangeTab?.(id);
    setSidebarOpen(false);
    if (id !== "properties") setSelectedProperty(null);
  };

  const handleViewApartments = (property: any) => {
    setActiveTab("apartments");
    props.onViewApartments?.(property);
  };

  const activeLabel = NAV_LABELS[activeTab] ?? "Dashboard";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar — fixed, full height */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200">
        <SidebarContent
          activeTab={activeTab}
          onSelect={handleSelect}
          onLogout={() => props.onLogout()}
        />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("navigation")}</SheetTitle>
          </SheetHeader>
          <SidebarContent
            activeTab={activeTab}
            onSelect={handleSelect}
            onLogout={() => props.onLogout()}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
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
          {activeTab === "overview" && (
            <div className="space-y-6">
              <DashboardSummary
                properties={props.properties}
                propertiesLoading={props.propertiesLoading}
                apartments={props.apartments}
                apartmentsLoading={props.apartmentsLoading}
                tenants={props.tenants}
                tenantsLoading={props.tenantsLoading}
                latePayments={props.latePayments}
                paymentsLoading={props.paymentsLoading}
              />
              <TenantPayments />
            </div>
          )}

          {activeTab === "properties" && (
            selectedProperty ? (
              <PropertyDetail
                property={selectedProperty}
                expenseTypes={props.expenseTypes}
                costs={props.costs}
                costsLoading={props.costsLoading}
                costsSaving={props.costsSaving}
                onLoadCosts={props.onLoadCosts}
                onAddCost={props.onAddCost}
                onUpdateCost={props.onUpdateCost}
                onDeleteCost={props.onDeleteCost}
                onBack={() => setSelectedProperty(null)}
              />
            ) : (
              <PropertyList
                properties={props.properties}
                apartments={props.apartments}
                isSaving={props.isSaving}
                onAddProperty={props.onAddProperty}
                onEditProperty={props.onEditProperty}
                onDeleteProperty={props.onDeleteProperty}
                onViewApartments={handleViewApartments}
                onSelectProperty={setSelectedProperty}
              />
            )
          )}

          {activeTab === "apartments" && props.apartmentsView}

          {activeTab === "tenants" && props.tenantsView}
          {activeTab === "bank" && (
            <BankStatement
              apartments={props.apartments}
              isSaving={props.rentSaving}
              onAssignPayment={props.onAssignPayment}
            />
          )}
          {activeTab === "abrechnung" && (
            <NebenkostenAbrechnung
              properties={props.properties}
              apartments={props.apartments}
              tenants={props.tenants}
              costs={props.costs}
              aptCosts={props.aptCosts}
              rentPayments={props.rentPayments}
              costsLoading={props.costsLoading}
              aptCostsLoading={props.aptCostsLoading}
              rentLoading={props.rentLoading}
              propertySaving={props.isSaving}
              computeReadiness={props.computeReadiness}
              onLoadCosts={props.onLoadCosts}
              onLoadAptCosts={props.onLoadAptCosts}
              onLoadRentPayments={props.onLoadRentPayments}
              onEditProperty={props.onEditProperty}
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
        </main>
      </div>
    </div>
  );
}
