import React from "react";
import { Plus, Settings, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

type Tenant = {
  id: number;
  apartment_id: number;
  name: string;
  email?: string;
  phone?: string;
  start_date?: string;
  end_date?: string;
};

type Props = {
  tenants?: Tenant[];
  isLoading?: boolean;
  isAddTenantDialogOpen?: boolean;
  onOpenAddTenantDialog?: () => void;
  onManageTenant?: (id: number) => void;
  children?: React.ReactNode;
};

export default function TenantsList({
  tenants,
  isLoading = false,
  isAddTenantDialogOpen = false,
  onOpenAddTenantDialog,
  onManageTenant,
  children,
}: Props) {
  const { t } = useTranslation("tenants");

  const safeTenants: Tenant[] = tenants ?? [];
  const active = safeTenants.filter((t) => !t.end_date).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title", { count: safeTenants.length })}</CardTitle>
          {safeTenants.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("activePast", { active, past: safeTenants.length - active })}
            </p>
          )}
        </div>
        <Button size="sm" onClick={onOpenAddTenantDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addTenant")}
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : safeTenants.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {safeTenants.map((tenant) => {
              const isActive = !tenant.end_date;
              return (
                <Card key={tenant.id} className="overflow-hidden">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{tenant.name}</span>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? t("active") : t("past")}
                      </Badge>
                    </div>
                    {tenant.email && (
                      <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>
                    )}
                    {tenant.start_date && (
                      <p className="text-xs text-muted-foreground">
                        {tenant.end_date
                          ? t("fromTo", { from: tenant.start_date, to: tenant.end_date })
                          : t("from", { from: tenant.start_date })}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManageTenant?.(tenant.id)}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      {t("manage")}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("noTenants")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("addFirst")}</p>
            <Button className="mt-4" size="sm" onClick={onOpenAddTenantDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addTenant")}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isAddTenantDialogOpen}>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    </Card>
  );
}
