import React from "react";
import { ArrowLeft, Trash2, Loader2, DoorOpen, DoorClosed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState } from "react";

type Apartment = {
  id: number;
  property_id: number;
  code: string;
  occupied: number | boolean;
};

type Props = {
  apartment?: Apartment | null;
  isSaving?: boolean;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onToggleOccupied?: (id: number, occupied: boolean) => void;
};

export default function ManageApartment({
  apartment,
  isSaving = false,
  onBack,
  onDelete,
  onToggleOccupied,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!apartment) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("notFound")}
        </CardContent>
      </Card>
    );
  }

  const isOccupied = !!apartment.occupied;

  const handleToggle = (checked: boolean) => {
    onToggleOccupied?.(apartment.id, checked);
  };

  const handleDelete = () => {
    onDelete?.(apartment.id);
    setConfirmDelete(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon("back").replace("← ", "")}
          </Button>
          <CardTitle>{t("apartment", { code: apartment.code })}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOccupied ? (
                  <DoorClosed className="h-5 w-5 text-amber-500" />
                ) : (
                  <DoorOpen className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">{t("status")}</span>
              </div>
              <Badge variant={isOccupied ? "secondary" : "outline"} className={isOccupied ? "" : "text-green-600 border-green-300"}>
                {isOccupied ? t("occupied") : t("available")}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="occupied-toggle" className="text-sm text-muted-foreground">
                {t("markOccupied")}
              </Label>
              <Switch
                id="occupied-toggle"
                checked={isOccupied}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t("unitCode")}</p>
            <p className="font-semibold text-lg">{apartment.code}</p>
          </div>

          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">{tCommon("dangerZone")}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteApartment")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm", { code: apartment.code })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t("deleteWarning")}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isSaving}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("deleting")}
                </>
              ) : (
                tCommon("delete")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
