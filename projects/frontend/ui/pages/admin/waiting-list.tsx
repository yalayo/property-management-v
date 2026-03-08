import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  BarChart3,
  ChevronLeft,
  Download,
  Home,
  ListIcon,
  LogOut,
  Mail,
  ShieldAlert,
  User,
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { Input } from "../ui/input";

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

export default function WaitingListAdmin() {
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
  
  // Fetch waiting list
  const { data: waitingList, isLoading } = useQuery({
    queryKey: ["/api/admin/waiting-list"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/waiting-list");
      if (!response.ok) {
        throw new Error("Failed to fetch waiting list");
      }
      return response.json();
    },
  });
  
  // Export data as CSV
  const exportToCSV = () => {
    if (!waitingList) return;
    
    const headers = ["ID", "Email", "Full Name", "Joined Date"];
    const csvData = waitingList.map((entry: any) => [
      entry.id,
      entry.email,
      entry.fullName || "N/A",
      new Date(entry.joinedAt).toLocaleString()
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
    link.setAttribute("download", `waiting-list-${new Date().toISOString().split("T")[0]}.csv`);
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
            <h1 className="text-3xl font-bold">Waiting List</h1>
            <p className="text-gray-500 dark:text-gray-400">
              List of people who signed up for early access.
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
        
        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search and Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="Search by email or name..." 
                  className="w-full"
                />
              </div>
              <Button variant="outline">
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Waiting List Table */}
        <Card>
          <CardHeader>
            <CardTitle>Waiting List Entries</CardTitle>
            <CardDescription>
              {waitingList?.length || 0} users on the waiting list
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6">Loading waiting list data...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingList?.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.id}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        {entry.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {entry.fullName || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(entry.joinedAt).toLocaleString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}