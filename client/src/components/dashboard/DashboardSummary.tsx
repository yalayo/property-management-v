import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Home,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
} from "lucide-react";

export default function DashboardSummary() {
  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: () => fetch('/api/properties').then(res => res.json())
  });

  // Fetch tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/tenants'],
    queryFn: () => fetch('/api/tenants').then(res => res.json())
  });

  // Fetch late payments
  const { data: latePayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/late-payments'],
    queryFn: () => fetch('/api/late-payments').then(res => res.json())
  });

  const isLoading = propertiesLoading || tenantsLoading || paymentsLoading;

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });

  // Calculate stats
  const propertyCount = properties?.length || 0;
  const tenantCount = tenants?.length || 0;
  const latePaymentCount = latePayments?.length || 0;
  
  // Calculate occupancy rate (assuming each property has units field)
  let totalUnits = 0;
  let occupiedUnits = 0;
  
  if (properties && tenants) {
    totalUnits = properties.reduce((sum: number, property: any) => sum + (property.units || 1), 0);
    occupiedUnits = tenants.filter((tenant: any) => tenant.active).length;
  }
  
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertyCount}</div>
              <p className="text-xs text-muted-foreground">Total managed properties</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenantCount}</div>
              <p className="text-xs text-muted-foreground">Active tenant contracts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate}%</div>
              <Progress value={occupancyRate} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">{occupiedUnits} of {totalUnits} units occupied</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold">{latePaymentCount}</div>
                {latePaymentCount > 0 ? (
                  <span className="text-red-500 text-sm flex items-center">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Late
                  </span>
                ) : (
                  <span className="text-green-500 text-sm flex items-center">
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    On time
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">For {currentMonth}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
