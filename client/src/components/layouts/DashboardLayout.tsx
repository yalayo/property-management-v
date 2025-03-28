import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  BanknoteIcon,
  FileTextIcon, 
  Settings, 
  Users, 
  Building,
  LogOut,
  BarChart4,
  Briefcase,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const sidebarLinks = [
    { icon: <Home size={20} />, label: "Dashboard", href: "/dashboard" },
    { icon: <BanknoteIcon size={20} />, label: "Bank Accounts", href: "/bank-accounts" },
    { icon: <CreditCard size={20} />, label: "Subscription", href: "/subscription-tiers" },
    { icon: <Building size={20} />, label: "Properties", href: "/properties" },
    { icon: <Users size={20} />, label: "Tenants", href: "/tenants" },
    { icon: <FileTextIcon size={20} />, label: "Documents", href: "/documents" },
    { icon: <BarChart4 size={20} />, label: "Reports", href: "/reports" },
    { icon: <Briefcase size={20} />, label: "Maintenance", href: "/maintenance" },
    { icon: <Settings size={20} />, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r shadow-sm">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center h-16 px-6 border-b">
              <h1 className="text-xl font-bold text-primary">PropertyManager</h1>
            </div>
            
            <div className="px-4 py-4">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Welcome,
              </div>
              <div className="text-lg font-semibold truncate">
                {user?.fullName || user?.username}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.tier ? `${user.tier} plan` : "No subscription"}
              </div>
            </div>

            <div className="px-3 py-2">
              <nav className="space-y-1">
                {sidebarLinks.map((link) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <a
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span className={`mr-3 ${isActive ? "text-primary" : ""}`}>
                          {link.icon}
                        </span>
                        {link.label}
                      </a>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 border-b bg-white shadow-sm">
          <h1 className="text-xl font-bold text-primary">PropertyManager</h1>
          <div>
            {/* Mobile menu button would go here */}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;