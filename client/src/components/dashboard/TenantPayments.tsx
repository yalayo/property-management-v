import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Loader2, Mail, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function TenantPayments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [additionalMessage, setAdditionalMessage] = useState("");
  
  // Fetch late payments
  const { data: latePayments, isLoading, error } = useQuery({
    queryKey: ['/api/late-payments'],
    queryFn: () => fetch('/api/late-payments').then(res => res.json())
  });
  
  // Mutation for sending individual reminders
  const sendReminderMutation = useMutation({
    mutationFn: async ({ tenantId, message }: { tenantId: number, message?: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/tenants/${tenantId}/send-payment-reminder`,
        { message }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Sent",
        description: "Payment reminder has been sent successfully.",
        variant: "default",
      });
      
      // Close dialog if open
      setSelectedTenant(null);
      setAdditionalMessage("");
      
      // If in development mode and we have a preview URL, open it in a new tab
      if (data.previewUrl) {
        window.open(data.previewUrl, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Reminder",
        description: error.message || "There was an error sending the reminder.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for generating monthly report
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/generate-late-payment-report`,
        {}
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: `Monthly late payment report has been generated and sent. ${data.reportCount} late payments included.`,
        variant: "default",
      });
      
      setIsReportDialogOpen(false);
      
      // If in development mode and we have a preview URL, open it in a new tab
      if (data.previewUrl) {
        window.open(data.previewUrl, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Report",
        description: error.message || "There was an error generating the report.",
        variant: "destructive",
      });
    }
  });
  
  const handleSendReminder = (tenant: any) => {
    if (!tenant.email) {
      toast({
        title: "Cannot Send Reminder",
        description: "This tenant doesn't have an email address.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedTenant(tenant);
  };
  
  const confirmSendReminder = () => {
    if (selectedTenant) {
      sendReminderMutation.mutate({ 
        tenantId: selectedTenant.id,
        message: additionalMessage 
      });
    }
  };
  
  const handleGenerateReport = () => {
    setIsReportDialogOpen(true);
  };
  
  const confirmGenerateReport = () => {
    generateReportMutation.mutate();
  };

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tenant Payment Status</CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={() => navigate('/tenant-onboarding')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New Tenant
            </Button>
            
            {latePayments && latePayments.length > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleGenerateReport}
                disabled={generateReportMutation.isPending}
              >
                {generateReportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Generate Monthly Report
              </Button>
            )}
          </div>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSendReminder(tenant)}
                            disabled={sendReminderMutation.isPending && selectedTenant?.id === tenant.id}
                          >
                            {sendReminderMutation.isPending && selectedTenant?.id === tenant.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
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
      
      {/* Reminder Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={(isOpen) => !isOpen && setSelectedTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder email to {selectedTenant?.firstName} {selectedTenant?.lastName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Message (Optional)</label>
              <Textarea
                placeholder="Add any additional information or context for this reminder..."
                value={additionalMessage}
                onChange={(e) => setAdditionalMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTenant(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSendReminder}
              disabled={sendReminderMutation.isPending}
            >
              {sendReminderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send Reminder</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Late Payment Report</DialogTitle>
            <DialogDescription>
              Generate and send a monthly report of all tenants with late or missing payments to your email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm">
              This report will include details about all {latePayments?.length} tenants who have late or missing payments.
              The report will be sent to your registered email address.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmGenerateReport}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Report</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
