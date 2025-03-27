import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Database,
  Home,
  ListIcon,
  LogOut,
  ShieldAlert,
  UsersIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Admin dashboard layout
function AdminLayout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/logout");
      if (response.ok) {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
        navigate("/admin-login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Portal</h1>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-white dark:bg-gray-800 border-r hidden md:block">
          <nav className="p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/admin/dashboard")}>
              <Home className="h-5 w-5 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/admin/survey-analytics")}>
              <BarChart3 className="h-5 w-5 mr-2" />
              Survey Analytics
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/admin/waiting-list")}>
              <ListIcon className="h-5 w-5 mr-2" />
              Waiting List
            </Button>
          </nav>
        </aside>
        
        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Dashboard overview
export default function AdminDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await apiRequest("GET", "/api/me");
        if (!response.ok) {
          throw new Error("Not authenticated");
        }
        
        const user = await response.json();
        if (!user.isAdmin) {
          throw new Error("Not authorized");
        }
      } catch (error) {
        toast({
          title: "Access denied",
          description: "Please login as an admin to access this page",
          variant: "destructive",
        });
        navigate("/admin-login");
      }
    };
    
    checkAdmin();
  }, [toast, navigate]);
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Fetch survey analytics
  const { data: surveyAnalytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/admin/survey-analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/survey-analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch survey analytics");
      }
      return response.json();
    },
  });
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of your platform metrics and analytics.
        </p>
        
        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Total Users</CardTitle>
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? "Loading..." : dashboardData?.totalUsers || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Registered users on the platform
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Survey Responses</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? "Loading..." : dashboardData?.totalSurveyResponses || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Total survey submissions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Waiting List</CardTitle>
              <ListIcon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading ? "Loading..." : dashboardData?.totalWaitingList || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Potential customers on waiting list
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Content Tabs */}
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="summary">Survey Insights</TabsTrigger>
            <TabsTrigger value="system">System Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold">Key Survey Insights</h2>
            
            {isLoadingAnalytics ? (
              <p>Loading survey data...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {surveyAnalytics?.slice(0, 6).map((stat: any) => (
                  <Card key={stat.questionId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{stat.questionText}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-2xl font-bold">{stat.yesPercentage}%</p>
                          <p className="text-xs text-muted-foreground">Answered Yes</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{stat.totalResponses}</p>
                          <p className="text-xs text-muted-foreground">Total Responses</p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 h-2 w-full bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${stat.yesPercentage}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/admin/survey-analytics")}
              >
                View All Survey Data
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold">System Status</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Database Status</CardTitle>
                <CardDescription>Current status of system databases and services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-green-500" />
                    <span>PostgreSQL Database</span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-green-500" />
                    <span>Session Store</span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                <div className="pt-4 text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}