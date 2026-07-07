import React, { useState, useEffect } from "react";
import { Plus, UserPlus, DoorOpen, DoorClosed, ArrowLeft, Clock, Search, Warehouse } from "lucide-react";
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

type Apartment = {
  id: number;
  property_id: number;
  code: string;
  occupied: number | boolean;
};

type Garage = {
  id: string;
  property_id?: string | number;
  code: string;
  flaeche?: number | string | null;
  occupied?: boolean | number;
};

type OnboardingRecord = {
  status: string;
  email: string;
};

type TenantSummary = {
  id: string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  "apartment-id"?: string | number;
  "start-date"?: string;
  "end-date"?: string;
  kaltmiete?: number | string;
  "nebenkosten-warm"?: number | string;
};

type Props = {
  apartments?: Apartment[];
  tenants?: TenantSummary[];
  onboardingsByApartment?: Record<number, OnboardingRecord>;
  isLoading?: boolean;
  isReadOnly?: boolean;
  isAddApartmentDialogOpen?: boolean;
  onChangeAddApartmentDialogOpen?: () => void;
  onCloseAddApartmentDialog?: () => void;
  onSelectApartment?: (id: number) => void;
  onManageApartment?: (id: number) => void;
  onAssignTenant?: (id: number) => void;
  onCloseAssignDialog?: () => void;
  isAssignDialogOpen?: boolean;
  onGoBack?: () => void;
  children?: React.ReactNode;
  assignDialogContent?: React.ReactNode;
  garages?: Garage[];
  onSelectGarage?: (id: string) => void;
  isAddGarageDialogOpen?: boolean;
  onChangeAddGarageDialogOpen?: () => void;
  onCloseAddGarageDialog?: () => void;
  addGarageDialogContent?: React.ReactNode;
};

function tenantName(t: TenantSummary): string {
  const first = t["first-name"] ?? t.name ?? "";
  const last  = t["last-name"] ?? "";
  return [first, last].filter(Boolean).join(" ");
}

export default function ApartmentsList({
  apartments,
  tenants = [],
  onboardingsByApartment = {},
  isLoading = false,
  isReadOnly = false,
  isAddApartmentDialogOpen = false,
  onChangeAddApartmentDialogOpen,
  onCloseAddApartmentDialog,
  onSelectApartment,
  onManageApartment,
  onAssignTenant,
  onCloseAssignDialog,
  isAssignDialogOpen = false,
  onGoBack,
  children,
  assignDialogContent,
  garages = [],
  onSelectGarage,
  isAddGarageDialogOpen = false,
  onChangeAddGarageDialogOpen,
  onCloseAddGarageDialog,
  addGarageDialogContent,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");

  const safeApartments: Apartment[] = apartments ?? [];
  const occupied = safeApartments.filter((a) => a.occupied).length;
  const empty = safeApartments.length - occupied;
  const [page, setPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Normalize an apartment-id value that may arrive as a plain number OR as an
  // entity-ref object { id, ... } depending on how DataScript serialised the ref.
  const resolveAptId = (raw: any): number | null => {
    if (raw == null) return null;
    if (typeof raw === "object") return Number(raw.id ?? raw["db/id"] ?? NaN);
    return Number(raw);
  };

  const currentTenantByApt: Record<number, TenantSummary> = {};
  for (const tn of tenants) {
    const aptId = resolveAptId(tn["apartment-id"]);
    if (aptId == null || isNaN(aptId)) continue;
    const end   = tn["end-date"]   ?? "";
    const start = tn["start-date"] ?? "";
    if ((!end || end >= today) && (!start || start <= today)) {
      currentTenantByApt[aptId] = tn;
    }
  }

  useEffect(() => { setPage(1); }, [apartments, filterText]);

  const lowerFilter = filterText.toLowerCase();
  const filteredApartments = filterText
    ? safeApartments.filter((a) => {
        if (a.code?.toLowerCase().includes(lowerFilter)) return true;
        const aptEntityId = a.id ?? (a as any)['db/id'];
        const tenant = currentTenantByApt[aptEntityId];
        return tenant ? tenantName(tenant).toLowerCase().includes(lowerFilter) : false;
      })
    : safeApartments;

  const totalPages = Math.max(1, Math.ceil(filteredApartments.length / PAGE_SIZE));
  const pagedApartments = filteredApartments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {onGoBack && (
            <Button variant="ghost" size="sm" onClick={onGoBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tCommon("back").replace("← ", "")}
            </Button>
          )}
          <div>
            <CardTitle>{t("title", { count: safeApartments.length })}</CardTitle>
            {safeApartments.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("occupiedCount", { occupied, empty })}
              </p>
            )}
          </div>
        </div>
        <Button size="sm" disabled={isReadOnly} onClick={onChangeAddApartmentDialogOpen}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addApartment")}
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
        ) : safeApartments.length > 0 ? (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedApartments.map((apt) => {
              const isOccupied  = !!apt.occupied;
              const aptEntityId = apt.id ?? apt["db/id"];
              const onboarding  = onboardingsByApartment[aptEntityId];
              const curTenant   = currentTenantByApt[aptEntityId] ?? null;
              const kalt        = parseFloat(String(curTenant?.kaltmiete ?? 0).replace(",", ".")) || 0;
              const nk          = parseFloat(String(curTenant?.["nebenkosten-warm"] ?? 0).replace(",", ".")) || 0;
              const monthlyRent = kalt + nk;
              return (
                <Card key={aptEntityId} className="overflow-hidden">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOccupied ? (
                          <DoorClosed className="h-5 w-5 text-amber-500" />
                        ) : (
                          <DoorOpen className="h-5 w-5 text-green-500" />
                        )}
                        <button
                          type="button"
                          className="font-semibold text-lg hover:underline hover:text-primary transition-colors text-left"
                          onClick={() => onSelectApartment?.(aptEntityId)}
                        >
                          {apt.code}
                        </button>
                      </div>
                      <Badge variant={isOccupied ? "secondary" : "outline"} className={isOccupied ? "" : "text-green-600 border-green-300"}>
                        {isOccupied ? t("occupied") : t("available")}
                      </Badge>
                    </div>

                    {curTenant && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold truncate">{tenantName(curTenant)}</p>
                        {(kalt > 0 || nk > 0) && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {kalt > 0 && (
                              <div className="flex justify-between tabular-nums">
                                <span>Kaltmiete</span>
                                <span>€ {kalt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {nk > 0 && (
                              <div className="flex justify-between tabular-nums">
                                <span>Nebenkosten</span>
                                <span>€ {nk.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {monthlyRent > 0 && (
                              <div className="flex justify-between tabular-nums font-medium text-foreground border-t pt-0.5 mt-0.5">
                                <span>Gesamt / Mo.</span>
                                <span>€ {monthlyRent.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {curTenant["start-date"] && (() => {
                          const s = new Date(curTenant["start-date"] + "T00:00:00");
                          const e = curTenant["end-date"] ? new Date(curTenant["end-date"] + "T00:00:00") : new Date();
                          const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
                          return (
                            <p className="text-xs text-muted-foreground">
                              {curTenant["start-date"]} → {curTenant["end-date"] || t("openEnded", { defaultValue: "unbefristet" })}
                              <span className="ml-1 tabular-nums">({days} Tage)</span>
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    {onboarding && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {t(`onboarding.status.${onboarding.status}`, { defaultValue: onboarding.status })}
                          {" · "}{onboarding.email}
                        </span>
                      </div>
                    )}
                    {!isOccupied && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isReadOnly}
                        onClick={() => onAssignTenant?.(aptEntityId)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        {t("assign")}
                      </Button>
                    )}
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
            <DoorOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("noApartments")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("addFirst")}</p>
            <Button className="mt-4" size="sm" disabled={isReadOnly} onClick={onChangeAddApartmentDialogOpen}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addApartment")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Garages section */}
      <div className="px-6 pb-6 border-t">
        <div className="flex items-center justify-between mt-6 mb-4">
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{"Garagen"}</h3>
            <Badge variant="outline" className="text-xs">{garages.length}</Badge>
          </div>
          <Button size="sm" variant="outline" disabled={isReadOnly} onClick={onChangeAddGarageDialogOpen}>
            <Plus className="h-4 w-4 mr-2" />
            {"Garage hinzufügen"}
          </Button>
        </div>

        {garages.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {garages.map((g) => {
              const gOccupied = !!g.occupied;
              const gFlaeche  = g.flaeche != null ? parseFloat(String(g.flaeche)) : null;
              return (
                <Card key={g.id} className="overflow-hidden">
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          type="button"
                          className="font-semibold text-base hover:underline hover:text-primary transition-colors text-left"
                          onClick={() => onSelectGarage?.(g.id)}
                        >
                          {g.code}
                        </button>
                      </div>
                      <Badge
                        variant={gOccupied ? "secondary" : "outline"}
                        className={gOccupied ? "" : "text-green-600 border-green-300"}
                      >
                        {gOccupied ? t("occupied") : t("available")}
                      </Badge>
                    </div>
                    {gFlaeche != null && (
                      <p className="text-xs text-muted-foreground">
                        {gFlaeche.toLocaleString("de-DE")} m²
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 border rounded-xl border-dashed text-center">
            <Warehouse className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{"Noch keine Garagen vorhanden"}</p>
            <Button className="mt-3" size="sm" variant="outline" disabled={isReadOnly} onClick={onChangeAddGarageDialogOpen}>
              <Plus className="h-4 w-4 mr-2" />
              {"Garage hinzufügen"}
            </Button>
          </div>
        )}
      </div>

      {/* Add apartment dialog */}
      <Dialog open={isAddApartmentDialogOpen} onOpenChange={(open) => !open && onCloseAddApartmentDialog?.()}>
        <DialogContent className="sm:max-w-md">{children}</DialogContent>
      </Dialog>

      {/* Add garage dialog */}
      <Dialog open={isAddGarageDialogOpen} onOpenChange={(open) => !open && onCloseAddGarageDialog?.()}>
        <DialogContent className="sm:max-w-md">{addGarageDialogContent}</DialogContent>
      </Dialog>

      {/* Assign tenant dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => !open && onCloseAssignDialog?.()}>
        <DialogContent>{assignDialogContent}</DialogContent>
      </Dialog>
    </Card>
  );
}
