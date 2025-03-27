import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SurveyAnalytics from "@/components/dashboard/SurveyAnalytics";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SurveyResults() {
  // Fetch waiting list data
  const { data: waitingList, isLoading: waitingListLoading } = useQuery({
    queryKey: ['/api/admin/waiting-list'],
    queryFn: () => fetch('/api/admin/waiting-list').then(res => res.json())
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex">
              <Link href="/">
                <div className="flex-shrink-0 flex items-center cursor-pointer">
                  <svg className="h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span className="ml-2 text-xl font-semibold text-gray-800">PropManager</span>
                </div>
              </Link>
            </div>
            
            <div>
              <Link href="/dashboard">
                <Button variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Survey Results & Waiting List</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and analyze survey responses and manage your waiting list
            </p>
          </div>

          <Tabs defaultValue="analytics">
            <TabsList className="mb-4">
              <TabsTrigger value="analytics">Survey Analytics</TabsTrigger>
              <TabsTrigger value="waiting-list">Waiting List</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <SurveyAnalytics />
            </TabsContent>

            <TabsContent value="waiting-list">
              <Card>
                <CardHeader>
                  <CardTitle>Waiting List</CardTitle>
                  <CardDescription>
                    People who have signed up for early access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {waitingListLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
                    </div>
                  ) : waitingList && waitingList.length > 0 ? (
                    <DataTable
                      data={waitingList}
                      columns={[
                        {
                          accessorKey: 'email',
                          header: 'Email',
                        },
                        {
                          accessorKey: 'fullName',
                          header: 'Full Name',
                          cell: (item: any) => item.fullName || "-"
                        },
                        {
                          accessorKey: 'joinedAt',
                          header: 'Joined On',
                          cell: (item: any) => formatDate(item.joinedAt)
                        },
                      ]}
                      searchable={true}
                      sortable={true}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No users in the waiting list yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
