import React from "react";
import { ArrowLeft, Trash2, Loader2, DoorOpen, DoorClosed } from "lucide-react";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!apartment) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Apartment not found.
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
            Back
          </Button>
          <CardTitle>Apartment {apartment.code}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status section */}
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOccupied ? (
                  <DoorClosed className="h-5 w-5 text-amber-500" />
                ) : (
                  <DoorOpen className="h-5 w-5 text-green-500" />
                )}
                <span className="font-medium">Status</span>
              </div>
              <Badge variant={isOccupied ? "secondary" : "outline"} className={isOccupied ? "" : "text-green-600 border-green-300"}>
                {isOccupied ? "Occupied" : "Available"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="occupied-toggle" className="text-sm text-muted-foreground">
                Mark as occupied
              </Label>
              <Switch
                id="occupied-toggle"
                checked={isOccupied}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl border p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Unit code</p>
            <p className="font-semibold text-lg">{apartment.code}</p>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">Danger zone</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Apartment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Apartment {apartment.code}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This action cannot be undone. The apartment and all associated data will be permanently removed.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
