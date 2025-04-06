import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Users, FileText, BarChart2, Upload, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PropertyList from "../dashboard/PropertyList";
import TenantPayments from "../dashboard/TenantPayments";
import FileUpload from "../dashboard/FileUpload";
import UserAnalytics from "../dashboard/UserAnalytics";
import DashboardHeader from "../dashboard/DashboardHeader";
import DashboardSummary from "../dashboard/DashboardSummary";
import { useAuth } from "../../hooks/use-auth";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { logoutMutation } = useAuth();
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-600">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="ml-2 text-xl font-semibold text-white">PropManager</span>
              </div>
            </Link>
          </div>
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              <Button
                variant={activeTab === "overview" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("overview")}
              >
                <Home className="mr-3 h-5 w-5" />
                Overview
              </Button>
              <Button
                variant={activeTab === "properties" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("properties")}
              >
                <Home className="mr-3 h-5 w-5" />
                Properties
              </Button>
              <Button
                variant={activeTab === "tenants" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("tenants")}
              >
                <Users className="mr-3 h-5 w-5" />
                Tenants
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("documents")}
              >
                <FileText className="mr-3 h-5 w-5" />
                Documents
              </Button>
              <Button
                variant={activeTab === "analytics" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart2 className="mr-3 h-5 w-5" />
                Analytics
              </Button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Button 
              variant="outline" 
              className="w-full"
              disabled={logoutMutation.isPending}
              onClick={() => {
                logoutMutation.mutate(undefined, {
                  onSuccess: () => {
                    navigate('/login');
                  }
                });
              }}
            >
              {logoutMutation.isPending ? (
                <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <LogOut className="mr-3 h-5 w-5" />
              )}
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <DashboardHeader />

        <main className="flex-1 pb-8">
          <div className="mt-6 px-4 sm:px-6 lg:px-8">
            {/* Main content area */}
            <div className="space-y-6">
              {activeTab === "overview" && (
                <>
                  <DashboardSummary />
                  <TenantPayments />
                </>
              )}

              {activeTab === "properties" && (
                <PropertyList />
              )}

              {activeTab === "tenants" && (
                <TenantPayments />
              )}

              {activeTab === "documents" && (
                <FileUpload />
              )}

              {activeTab === "analytics" && (
                <UserAnalytics />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
