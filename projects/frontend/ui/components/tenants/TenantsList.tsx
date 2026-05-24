import React, { useState, useEffect } from "react";
import { Plus, Settings, User, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";

const PAGE_SIZE = 9;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

type Tenant = {
  id: number;
  "apartment-id"?: number;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  email?: string;
  phone?: string;
  "start-date"?: string;
  "end-date"?: string;
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
  const { t: tCommon } = useTranslation("common");

  const safeTenants: Tenant[] = tenants ?? [];
  const active = safeTenants.filter((t) => !t["end-date"]).length;

  function tenantDisplayName(t: Tenant): string {
    const full = [t["first-name"], t["last-name"]].filter(Boolean).join(" ").trim();
    return full || t.name || "";
  }
  const [page, setPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  useEffect(() => { setPage(1); }, [tenants, filterText]);

  const filteredTenants = filterText
    ? safeTenants.filter((t) => {
        const q = filterText.toLowerCase();
        return (
          tenantDisplayName(t).toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q)
        );
      })
    : safeTenants;

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const pagedTenants = filteredTenants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={tCommon("search")}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : safeTenants.length > 0 ? (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedTenants.map((tenant) => {
              const isActive = !tenant["end-date"];
              return (
                <Card key={tenant.id} className="overflow-hidden">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{tenantDisplayName(tenant)}</span>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? t("active") : t("past")}
                      </Badge>
                    </div>
                    {tenant.email && (
                      <p className="text-sm text-muted-foreground truncate">{tenant.email}</p>
                    )}
                    {tenant["start-date"] && (
                      <p className="text-xs text-muted-foreground">
                        {tenant["end-date"]
                          ? t("fromTo", { from: tenant["start-date"], to: tenant["end-date"] })
                          : t("from", { from: tenant["start-date"] })}
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
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`el-${i}`}><PaginationEllipsis /></PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p as number); }}>{p}</PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} aria-disabled={page === totalPages} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          </>
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
