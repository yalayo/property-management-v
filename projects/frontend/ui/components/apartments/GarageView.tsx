import React, { useState } from "react";
import { ArrowLeft, Warehouse, Trash2, DoorOpen, DoorClosed, Pencil, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type Garage = {
  id: string;
  code: string;
  "property-id"?: string | number;
  property_id?: string | number;
  flaeche?: number | string | null;
  occupied?: boolean | number;
};

type Props = {
  garage?: Garage | null;
  isSaving?: boolean;
  isReadOnly?: boolean;
  onBack?: () => void;
  onUpdate?: (id: string, data: { code?: string; flaeche?: number; occupied?: boolean }) => void;
  onDelete?: (id: string) => void;
};

export default function GarageView({ garage, isSaving = false, isReadOnly = false, onBack, onUpdate, onDelete }: Props) {
  const { t: tCommon } = useTranslation("common");

  const [editForm, setEditForm] = useState<{ code: string; flaeche: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!garage) return null;

  const isOccupied = !!garage.occupied;
  const flaeche = garage.flaeche != null ? parseFloat(String(garage.flaeche)) : null;

  const handleToggle = (val: boolean) => {
    onUpdate?.(garage.id, { occupied: val });
  };

  const startEdit = () => {
    setEditForm({
      code: garage.code ?? "",
      flaeche: flaeche != null ? String(flaeche) : "",
    });
  };

  const saveEdit = () => {
    if (!editForm) return;
    const data: { code?: string; flaeche?: number } = {};
    if (editForm.code.trim()) data.code = editForm.code.trim();
    const f = parseFloat(editForm.flaeche);
    if (!isNaN(f)) data.flaeche = f;
    onUpdate?.(garage.id, data);
    setEditForm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tCommon("back")}
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Warehouse className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="font-bold text-xl truncate">{garage.code}</span>
          <Badge
            variant={isOccupied ? "secondary" : "outline"}
            className={isOccupied ? "" : "text-green-600 border-green-300"}
          >
            {isOccupied ? tCommon("occupied", { defaultValue: "Belegt" }) : tCommon("available", { defaultValue: "Frei" })}
          </Badge>
        </div>
      </div>

      {/* Info / edit card */}
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">{"Garagen-Info"}</span>
          {!isReadOnly && !editForm && (
            <Button size="sm" variant="outline" onClick={startEdit} disabled={isSaving}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {tCommon("edit")}
            </Button>
          )}
        </div>

        {editForm ? (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="garage-code">{tCommon("code", { defaultValue: "Code" })}</Label>
                <Input
                  id="garage-code"
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => f ? { ...f, code: e.target.value } : f)}
                  disabled={isSaving}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="garage-flaeche">{"Fläche (m²)"}</Label>
                <Input
                  id="garage-flaeche"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.flaeche}
                  onChange={(e) => setEditForm((f) => f ? { ...f, flaeche: e.target.value } : f)}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={isSaving || !editForm.code.trim()}>
                <Check className="h-4 w-4 mr-1" />
                {tCommon("save")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditForm(null)} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                {tCommon("cancel")}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tCommon("code", { defaultValue: "Code" })}</span>
              <span className="font-medium">{garage.code}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{"Fläche"}</span>
              <span className="font-medium">
                {flaeche != null ? `${flaeche.toLocaleString("de-DE")} m²` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status card */}
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOccupied
              ? <DoorClosed className="h-5 w-5 text-amber-500" />
              : <DoorOpen   className="h-5 w-5 text-green-500" />}
            <span className="font-medium">{"Status"}</span>
          </div>
          <Badge
            variant={isOccupied ? "secondary" : "outline"}
            className={isOccupied ? "" : "text-green-600 border-green-300"}
          >
            {isOccupied ? tCommon("occupied", { defaultValue: "Belegt" }) : tCommon("available", { defaultValue: "Frei" })}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="garage-occupied-toggle" className="text-sm text-muted-foreground">
            {"Als belegt markieren"}
          </Label>
          <Switch
            id="garage-occupied-toggle"
            checked={isOccupied}
            onCheckedChange={handleToggle}
            disabled={isSaving || isReadOnly}
          />
        </div>
      </div>

      {/* Danger zone */}
      {!isReadOnly && (
        <div className="rounded-xl border border-destructive/30 p-4">
          <p className="text-sm font-medium text-destructive mb-3">{tCommon("dangerZone")}</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {"Garage löschen"}
          </Button>
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`Garage "${garage.code}" löschen?`}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">
            {"Diese Aktion kann nicht rückgängig gemacht werden."}
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => { onDelete?.(garage.id); setConfirmDelete(false); }}
            >
              {"Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
