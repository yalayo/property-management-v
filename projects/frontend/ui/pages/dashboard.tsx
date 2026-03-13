import React from "react";
import { useState, useEffect } from "react";
import { Home, Users, FileText, BarChart2, LogOut, Menu, Building, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import PropertyList from "../components/dashboard/PropertyList";
import TenantPayments from "../components/dashboard/TenantPayments";
import FileUpload from "../components/dashboard/FileUpload";
import UserAnalytics from "../components/dashboard/UserAnalytics";
import DashboardSummary from "../components/dashboard/DashboardSummary";

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",   icon: Home },
  { id: "properties", label: "Properties", icon: Building },
  { id: "apartments", label: "Apartments", icon: Building2 },
  { id: "tenants",    label: "Tenants",    icon: Users },
  { id: "documents",  label: "Documents",  icon: FileText },
  { id: "analytics",  label: "Analytics",  icon: BarChart2 },
];

function SidebarContent({ activeTab, onSelect, onLogout }) {
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
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard(props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (props.onLoadData) props.onLoadData();
  }, []);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const handleViewApartments = (property: any) => {
    setActiveTab("apartments");
    props.onViewApartments?.(property);
  };

  const activeLabel = NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Dashboard";

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
            <SheetTitle>Navigation</SheetTitle>
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
        {/* Top bar — hamburger on mobile, section title always */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <span className="font-semibold text-slate-700">{activeLabel}</span>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <DashboardSummary properties={props.properties} />
              <TenantPayments />
            </div>
          )}

          {activeTab === "properties" && (
            <PropertyList
              properties={props.properties}
              isSaving={props.isSaving}
              onAddProperty={props.onAddProperty}
              onEditProperty={props.onEditProperty}
              onDeleteProperty={props.onDeleteProperty}
              onViewApartments={handleViewApartments}
            />
          )}

          {activeTab === "apartments" && props.apartmentsView}

          {activeTab === "tenants" && props.tenantsView}
          {activeTab === "documents" && <FileUpload />}
          {activeTab === "analytics" && <UserAnalytics />}
        </main>
      </div>
    </div>
  );
}
