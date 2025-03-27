import { useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ChevronLeft,
  Download,
  Home,
  ListIcon,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Admin Layout (same as dashboard)
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

export default function SurveyAnalytics() {
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
  
  // Fetch survey analytics
  const { data: surveyAnalytics, isLoading } = useQuery({
    queryKey: ["/api/admin/survey-analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/survey-analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch survey analytics");
      }
      return response.json();
    },
  });
  
  // Fetch survey responses
  const { data: surveyResponses, isLoading: isLoadingResponses } = useQuery({
    queryKey: ["/api/admin/survey-responses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/survey-responses");
      if (!response.ok) {
        throw new Error("Failed to fetch survey responses");
      }
      return response.json();
    },
  });
  
  // Export data as CSV
  const exportToCSV = () => {
    if (!surveyAnalytics) return;
    
    const headers = ["Question ID", "Question", "Yes Count", "No Count", "Total Responses", "Yes Percentage"];
    const csvData = surveyAnalytics.map((stat: any) => [
      stat.questionId,
      stat.questionText,
      stat.yesCount,
      stat.noCount,
      stat.totalResponses,
      `${stat.yesPercentage}%`
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `survey-analytics-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Survey Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Detailed analytics of survey responses and user feedback.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <Button onClick={exportToCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Analytics Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Survey Question Statistics</CardTitle>
            <CardDescription>
              Analysis of yes/no responses for each survey question
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">Loading analytics data...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead className="text-right">Yes Count</TableHead>
                    <TableHead className="text-right">No Count</TableHead>
                    <TableHead className="text-right">Total Responses</TableHead>
                    <TableHead className="text-right">Yes Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveyAnalytics?.map((stat: any) => (
                    <TableRow key={stat.questionId}>
                      <TableCell>{stat.questionText}</TableCell>
                      <TableCell className="text-right">{stat.yesCount}</TableCell>
                      <TableCell className="text-right">{stat.noCount}</TableCell>
                      <TableCell className="text-right">{stat.totalResponses}</TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${stat.yesPercentage}%` }}
                            />
                          </div>
                          <span>{stat.yesPercentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Individual Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Survey Responses</CardTitle>
            <CardDescription>
              All individual survey submissions with user details when available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingResponses ? (
              <div className="text-center py-6">Loading response data...</div>
            ) : (
              <div className="space-y-6">
                {surveyResponses?.map((response: any) => (
                  <Card key={response.id} className="border border-gray-200">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-sm">
                          {response.email ? `User: ${response.email}` : 'Anonymous User'}
                        </CardTitle>
                        <CardDescription>
                          {new Date(response.submittedAt).toLocaleString()}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead className="text-right">Answer</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {response.enrichedResponses?.map((resp: any) => (
                            <TableRow key={resp.questionId}>
                              <TableCell>{resp.questionText}</TableCell>
                              <TableCell className="text-right">
                                <span className={resp.answer ? "text-green-600" : "text-red-600"}>
                                  {resp.answer ? "Yes" : "No"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}