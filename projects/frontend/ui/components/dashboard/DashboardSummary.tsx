import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import {
  Home,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp
} from "lucide-react";

export default function DashboardSummary(props) {
  const { t } = useTranslation("dashboard");

  const properties = props.properties;
  const propertiesLoading = props.propertiesLoading;
  const tenants = props.tenants;
  const tenantsLoading = props.tenantsLoading;
  const latePayments = props.latePayments;
  const paymentsLoading = props.paymentsLoading;

  const isLoading = propertiesLoading || tenantsLoading || paymentsLoading;

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("default", { month: "long" });

  const propertyCount = properties?.length || 0;
  const tenantCount = tenants?.length || 0;
  const latePaymentCount = latePayments?.length || 0;

  let totalUnits = 0;
  let occupiedUnits = 0;

  if (properties && tenants) {
    totalUnits = properties.reduce((sum: number, property: any) => sum + (property.units || 1), 0);
    occupiedUnits = tenants.filter((tenant: any) => tenant.active).length;
  }

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>

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
              <CardTitle className="text-sm font-medium">{t("summary.properties")}</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{propertyCount}</div>
              <p className="text-xs text-muted-foreground">{t("summary.propertiesDesc")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("summary.tenants")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenantCount}</div>
              <p className="text-xs text-muted-foreground">{t("summary.tenantsDesc")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("summary.occupancy")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate}%</div>
              <Progress value={occupancyRate} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {t("summary.occupancyDesc", { occupied: occupiedUnits, total: totalUnits })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("summary.payments")}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold">{latePaymentCount}</div>
                {latePaymentCount > 0 ? (
                  <span className="text-red-500 text-sm flex items-center">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    {t("summary.late")}
                  </span>
                ) : (
                  <span className="text-green-500 text-sm flex items-center">
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                    {t("summary.onTime")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("summary.paymentsFor", { month: currentMonth })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
