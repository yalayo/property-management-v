import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export default function TenantPayments() {
  // Fetch late payments
  const { data: latePayments, isLoading, error } = useQuery({
    queryKey: ['/api/late-payments'],
    queryFn: () => fetch('/api/late-payments').then(res => res.json())
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">Failed to load payment status. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {latePayments && latePayments.length > 0 ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                <p className="text-amber-800 text-sm">
                  {latePayments.length} tenant(s) might have late payments. Consider sending reminders.
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latePayments.map((entry: any) => {
                  const tenant = entry.tenant;
                  const lastPayment = entry.lastPayment;
                  const status = !lastPayment ? "No payments" : "Last payment outdated";
                  
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="font-medium">{tenant.firstName} {tenant.lastName}</div>
                        {tenant.email && <div className="text-sm text-gray-500">{tenant.email}</div>}
                      </TableCell>
                      <TableCell>Property #{tenant.propertyId}</TableCell>
                      <TableCell>
                        {lastPayment ? (
                          <>
                            <div>€{lastPayment.amount}</div>
                            <div className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(lastPayment.date), { addSuffix: true })}
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-600">No payments recorded</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-amber-600 mr-1" />
                          <span className="text-amber-600">{status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          Send Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-green-50 rounded-full p-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">All payments are up to date!</h3>
            <p className="text-gray-500 text-center mt-2">
              There are no late payments to report. All your tenants are currently on track.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
