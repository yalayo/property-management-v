import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TierSelection } from "@/components/payment/TierSelection";
import DashboardLayout from "@/components/layouts/DashboardLayout";

function SubscriptionTiers() {
  const { data: user, isLoading, isError } = useQuery({ 
    queryKey: ["/api/user"] 
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Error Loading User Data</h1>
        <p className="text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Subscription Management</h1>
            <p className="text-muted-foreground">
              Currently on: <span className="font-semibold">{user?.tier || "No tier selected"}</span>
            </p>
          </div>
          
          <TierSelection />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SubscriptionTiers;