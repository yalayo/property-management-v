import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import {
  Home,
  Users,
  CreditCard,
  TrendingUp
} from "lucide-react";

export default function DashboardSummary(props) {
  const { t } = useTranslation("dashboard");

  const properties: any[]      = props.properties      || [];
  const apartments: any[]      = props.apartments       || [];
  const tenants: any[]         = props.tenants          || [];
  const allRentPayments: any[] = props.allRentPayments  || [];

  const isLoading =
    props.propertiesLoading || props.apartmentsLoading || props.tenantsLoading || props.paymentsLoading;

  const propertyCount = properties.length;
  const tenantCount   = tenants.length;

  // Previous month (Kontoauszug coverage)
  const now           = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth     = prevMonthDate.getMonth() + 1;
  const prevYear      = prevMonthDate.getFullYear();
  const prevMonthName = prevMonthDate.toLocaleString("de-DE", { month: "long" });
  const pmStart       = new Date(prevYear, prevMonth - 1, 1);
  const pmEnd         = new Date(prevYear, prevMonth, 0);

  const activeAptCount = apartments.filter((apt: any) =>
    tenants.some((t: any) => {
      if (String(t["apartment-id"]) !== String(apt.id)) return false;
      const s = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
      const e = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
      return (!s || s <= pmEnd) && (!e || e >= pmStart);
    })
  ).length;

  const kontoauszugCount = allRentPayments.filter((p: any) =>
    Number(p.month) === prevMonth && Number(p.year) === prevYear && !!p["source-file"]
  ).length;

  const totalUnits    = apartments.length;
  const occupiedUnits = apartments.filter((a: any) => a.occupied).length;
  const occupancyRate = totalUnits > 0
    ? Math.round((occupiedUnits / totalUnits) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>

      {isLoading ? (
        <div className="space-y-4">
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
        </div>
      ) : (
        <>
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
              <div className="flex items-baseline gap-1.5">
                <div className={`text-2xl font-bold ${kontoauszugCount === activeAptCount && activeAptCount > 0 ? "text-green-600" : ""}`}>
                  {kontoauszugCount}
                </div>
                <span className="text-sm text-muted-foreground">von {activeAptCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                via Kontoauszug · {prevMonthName}
              </p>
            </CardContent>
          </Card>
        </div>

        {properties.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">{t("propertyOccupancy")}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property: any) => {
                const propApts = apartments.filter((a: any) => a["property-id"] === property.id);
                const occupied = propApts.filter((a: any) => a.occupied).length;
                const total    = propApts.length;
                const pct      = total > 0 ? Math.round((occupied / total) * 100) : 0;
                return (
                  <Card key={property.id}>
                    <CardContent className="pt-4">
                      <p className="font-medium truncate">{property.name}</p>
                      <p className="text-sm text-muted-foreground mb-2 truncate">{property.address}</p>
                      {total > 0 ? (
                        <>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{occupied}/{total}</span>
                            <span className={`font-medium ${pct === 100 ? "text-green-600" : pct > 50 ? "text-blue-600" : "text-amber-500"}`}>
                              {pct}%
                            </span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("noApartmentsRecorded")}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
