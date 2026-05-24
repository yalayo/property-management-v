import React, { useState, useEffect } from "react";
import { Plus, Settings, UserPlus, DoorOpen, DoorClosed, ArrowLeft, Clock, Search } from "lucide-react";
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

type OnboardingRecord = {
  status: string;
  email: string;
};

type Props = {
  apartments?: Apartment[];
  onboardingsByApartment?: Record<number, OnboardingRecord>;
  isLoading?: boolean;
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
};

export default function ApartmentsList({
  apartments,
  onboardingsByApartment = {},
  isLoading = false,
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
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");

  const safeApartments: Apartment[] = apartments ?? [];
  const occupied = safeApartments.filter((a) => a.occupied).length;
  const empty = safeApartments.length - occupied;
  const [page, setPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  useEffect(() => { setPage(1); }, [apartments, filterText]);

  const filteredApartments = filterText
    ? safeApartments.filter((a) => a.code?.toLowerCase().includes(filterText.toLowerCase()))
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
        <Button size="sm" onClick={onChangeAddApartmentDialogOpen}>
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
              const isOccupied = !!apt.occupied;
              const onboarding = onboardingsByApartment[apt.id];
              return (
                <Card key={apt.id} className="overflow-hidden">
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
                          onClick={() => onSelectApartment?.(apt.id)}
                        >
                          {apt.code}
                        </button>
                      </div>
                      <Badge variant={isOccupied ? "secondary" : "outline"} className={isOccupied ? "" : "text-green-600 border-green-300"}>
                        {isOccupied ? t("occupied") : t("available")}
                      </Badge>
                    </div>
                    {onboarding && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {t(`onboarding.status.${onboarding.status}`, { defaultValue: onboarding.status })}
                          {" · "}{onboarding.email}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onManageApartment?.(apt.id)}
                      >
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        {t("manage")}
                      </Button>
                      {!isOccupied && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => onAssignTenant?.(apt.id)}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          {t("assign")}
                        </Button>
                      )}
                    </div>
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
            <Button className="mt-4" size="sm" onClick={onChangeAddApartmentDialogOpen}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addApartment")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add apartment dialog */}
      <Dialog open={isAddApartmentDialogOpen} onOpenChange={(open) => !open && onCloseAddApartmentDialog?.()}>
        <DialogContent className="sm:max-w-md">{children}</DialogContent>
      </Dialog>

      {/* Assign tenant dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => !open && onCloseAssignDialog?.()}>
        <DialogContent>{assignDialogContent}</DialogContent>
      </Dialog>
    </Card>
  );
}
