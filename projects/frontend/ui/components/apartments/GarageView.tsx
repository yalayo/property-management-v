import React, { useState } from "react";
import {
  ArrowLeft, Warehouse, Trash2, DoorOpen, DoorClosed, Pencil, Check, X,
  Building2, User, UserPlus, UserMinus, ChevronsUpDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";

type Garage = {
  id: string | number;
  code: string;
  "property-id"?: string | number;
  "tenant-id"?: string | number;
  flaeche?: number | string | null;
  "monthly-rent"?: number | string | null;
  occupied?: boolean | number;
};

type Property = {
  id: number | string;
  name: string;
};

type Tenant = {
  id: number | string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
};

type Props = {
  garage?: Garage | null;
  properties?: Property[];
  tenants?: Tenant[];
  isSaving?: boolean;
  isReadOnly?: boolean;
  onBack?: () => void;
  onUpdate?: (id: string, data: { code?: string; flaeche?: number; monthlyRent?: number; occupied?: boolean }) => void;
  onDelete?: (id: string) => void;
  onAssignTenant?: (garageId: string, tenantId: string) => void;
  onUnassignTenant?: (garageId: string) => void;
};

function tenantDisplayName(t: Tenant): string {
  if (t["first-name"]) return [t["first-name"], t["last-name"]].filter(Boolean).join(" ");
  return t.name ?? String(t.id);
}

export default function GarageView({
  garage,
  properties = [],
  tenants = [],
  isSaving = false,
  isReadOnly = false,
  onBack,
  onUpdate,
  onDelete,
  onAssignTenant,
  onUnassignTenant,
}: Props) {
  const { t: tCommon } = useTranslation("common");

  const [editForm, setEditForm] = useState<{ code: string; flaeche: string; monthlyRent: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  if (!garage) return null;

  const garageId      = String(garage.id);
  const isOccupied    = !!garage.occupied;
  const flaeche       = garage.flaeche != null ? parseFloat(String(garage.flaeche)) : null;
  const monthlyRent   = garage["monthly-rent"] != null ? parseFloat(String(garage["monthly-rent"])) : null;
  const assignedTenant = garage["tenant-id"] != null
    ? tenants.find((t) => String(t.id) === String(garage["tenant-id"]))
    : null;
  const property = garage["property-id"] != null
    ? properties.find((p) => String(p.id) === String(garage["property-id"]))
    : null;

  const handleToggle = (val: boolean) => {
    onUpdate?.(garageId, { occupied: val });
  };

  const startEdit = () => {
    setEditForm({
      code: garage.code ?? "",
      flaeche: flaeche != null ? String(flaeche) : "",
      monthlyRent: monthlyRent != null ? String(monthlyRent) : "",
    });
  };

  const saveEdit = () => {
    if (!editForm) return;
    const data: { code?: string; flaeche?: number; monthlyRent?: number } = {};
    if (editForm.code.trim()) data.code = editForm.code.trim();
    const f = parseFloat(editForm.flaeche);
    if (!isNaN(f)) data.flaeche = f;
    const r = parseFloat(editForm.monthlyRent);
    if (!isNaN(r)) data.monthlyRent = r;
    onUpdate?.(garageId, data);
    setEditForm(null);
  };

  const handleAssignTenant = () => {
    if (!selectedTenantId) return;
    onAssignTenant?.(garageId, selectedTenantId);
    setAssignOpen(false);
    setSelectedTenantId("");
    setTenantPickerOpen(false);
  };

  const unassignedTenants = tenants.filter((t) => String(t.id) !== String(garage["tenant-id"]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
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

      {/* Property card */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{"Objekt"}</span>
        </div>
        <p className="text-sm">
          {property ? (
            <span className="font-medium">{property.name}</span>
          ) : (
            <span className="text-muted-foreground">{"—"}</span>
          )}
        </p>
      </div>

      {/* Info / edit card */}
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{"Garagen-Info"}</span>
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
              <div className="space-y-1.5">
                <Label htmlFor="garage-rent">{"Miete / Monat (€)"}</Label>
                <Input
                  id="garage-rent"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.monthlyRent}
                  onChange={(e) => setEditForm((f) => f ? { ...f, monthlyRent: e.target.value } : f)}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">{"Jahresmiete fließt in die Anlage V (Zeile 15) ein."}</p>
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{"Miete / Monat"}</span>
              <span className="font-medium">
                {monthlyRent != null
                  ? `€ ${monthlyRent.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tenant card */}
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{"Mieter"}</span>
          </div>
          {!isReadOnly && (
            assignedTenant ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onUnassignTenant?.(garageId)}
                disabled={isSaving}
              >
                <UserMinus className="h-3.5 w-3.5 mr-1" />
                {"Mieter entfernen"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} disabled={isSaving}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {"Mieter zuweisen"}
              </Button>
            )
          )}
        </div>

        {assignedTenant ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{"Name"}</span>
            <span className="font-medium">{tenantDisplayName(assignedTenant)}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{"Kein Mieter zugewiesen"}</p>
        )}
      </div>

      {/* Status card */}
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOccupied
              ? <DoorClosed className="h-4 w-4 text-amber-500" />
              : <DoorOpen   className="h-4 w-4 text-green-500" />}
            <span className="font-medium text-sm">{"Status"}</span>
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

      {/* Assign tenant dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) { setSelectedTenantId(""); setTenantPickerOpen(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{"Mieter zuweisen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Popover open={tenantPickerOpen} onOpenChange={setTenantPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className={cn(!selectedTenantId && "text-muted-foreground")}>
                    {selectedTenantId
                      ? tenantDisplayName(tenants.find((t) => String(t.id) === selectedTenantId)!)
                      : "Mieter auswählen"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={"Mieter suchen …"} />
                  <CommandList>
                    <CommandEmpty>{"Kein Mieter gefunden."}</CommandEmpty>
                    <CommandGroup>
                      {unassignedTenants.map((t) => (
                        <CommandItem
                          key={t.id}
                          value={tenantDisplayName(t)}
                          onSelect={() => { setSelectedTenantId(String(t.id)); setTenantPickerOpen(false); }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTenantId === String(t.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tenantDisplayName(t)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleAssignTenant} disabled={!selectedTenantId || isSaving}>
                {"Zuweisen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              onClick={() => { onDelete?.(garageId); setConfirmDelete(false); }}
            >
              {"Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
