import React from "react";
import { Plus, Settings, UserPlus, DoorOpen, DoorClosed, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";

type Apartment = {
  id: number;
  property_id: number;
  code: string;
  occupied: number | boolean;
};

type Props = {
  apartments?: Apartment[];
  isLoading?: boolean;
  isAddApartmentDialogOpen?: boolean;
  onChangeAddApartmentDialogOpen?: () => void;
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
  isLoading = false,
  isAddApartmentDialogOpen = false,
  onChangeAddApartmentDialogOpen,
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
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : safeApartments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {safeApartments.map((apt) => {
              const isOccupied = !!apt.occupied;
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
                        <span className="font-semibold text-lg">{apt.code}</span>
                      </div>
                      <Badge variant={isOccupied ? "secondary" : "outline"} className={isOccupied ? "" : "text-green-600 border-green-300"}>
                        {isOccupied ? t("occupied") : t("available")}
                      </Badge>
                    </div>
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
      <Dialog open={isAddApartmentDialogOpen}>
        <DialogContent>{children}</DialogContent>
      </Dialog>

      {/* Assign tenant dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => !open && onCloseAssignDialog?.()}>
        <DialogContent>{assignDialogContent}</DialogContent>
      </Dialog>
    </Card>
  );
}
