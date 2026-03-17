import React from "react";
import { AlertCircle, CheckCircle, Loader2, Mail, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useLocation } from "wouter";

export default function TenantPayments(props) {
  const { t } = useTranslation("payments");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [additionalMessage, setAdditionalMessage] = useState("");

  const latePayments = props.latePayments;
  const isLoading = props.isLoading;
  const error = props.error;

  const sendReminderMutation = props.sendReminderMutation;
  const generateReportMutation = props.generateReportMutation;

  const handleSendReminder = (tenant: any) => {
    if (!tenant.email) {
      toast({
        title: t("cannotSend"),
        description: t("noEmail"),
        variant: "destructive",
      });
      return;
    }
    setSelectedTenant(tenant);
  };

  const confirmSendReminder = () => {
    if (selectedTenant) {
      // mutation call handled by parent via prop
    }
  };

  const handleGenerateReport = () => {
    setIsReportDialogOpen(true);
  };

  const confirmGenerateReport = () => {
    // mutation call handled by parent via prop
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
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
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">{t("failedToLoad")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/tenant-onboarding")}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("addNewTenant")}
            </Button>

            {latePayments && latePayments.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateReport}
                disabled={false}
              >
                {false ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {t("generateReport")}
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
                    {t("lateWarning", { count: latePayments.length })}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.tenant")}</TableHead>
                    <TableHead>{t("columns.property")}</TableHead>
                    <TableHead>{t("columns.lastPayment")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead>{t("columns.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latePayments.map((entry: any) => {
                    const tenant = entry.tenant;
                    const lastPayment = entry.lastPayment;
                    const status = !lastPayment ? t("statusNoPayments") : t("statusOutdated");

                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="font-medium">{tenant.firstName} {tenant.lastName}</div>
                          {tenant.email && <div className="text-sm text-gray-500">{tenant.email}</div>}
                        </TableCell>
                        <TableCell>{t("propertyNum", { id: tenant.propertyId })}</TableCell>
                        <TableCell>
                          {lastPayment ? (
                            <>
                              <div>€{lastPayment.amount}</div>
                              <div className="text-sm text-gray-500">
                                {formatDistanceToNow(new Date(lastPayment.date), { addSuffix: true })}
                              </div>
                            </>
                          ) : (
                            <span className="text-amber-600">{t("noPaymentsRecorded")}</span>
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
                            disabled={false}
                          >
                            {selectedTenant?.id === tenant.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            {t("sendReminder")}
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
              <h3 className="text-lg font-semibold">{t("allOnTime")}</h3>
              <p className="text-gray-500 text-center mt-2">{t("allOnTimeDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={(isOpen) => !isOpen && setSelectedTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reminderTitle")}</DialogTitle>
            <DialogDescription>
              {t("reminderDesc", { name: `${selectedTenant?.firstName} ${selectedTenant?.lastName}` })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("additionalMessage")}</label>
              <Textarea
                placeholder={t("additionalMessagePlaceholder")}
                value={additionalMessage}
                onChange={(e) => setAdditionalMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTenant(null)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmSendReminder} disabled={false}>
              {false ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                t("sendReminder")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
            <DialogDescription>{t("reportDesc")}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm">
              {t("reportCount", { count: latePayments?.length })}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmGenerateReport} disabled={false}>
              {false ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("generating")}
                </>
              ) : (
                t("generateReport")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
