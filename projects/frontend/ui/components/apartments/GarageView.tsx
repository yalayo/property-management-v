import React, { useState } from "react";
import {
  ArrowLeft, Warehouse, Trash2, Pencil, Check, X,
  UserPlus, UserMinus, ChevronsUpDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Card, CardContent } from "../ui/card";
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
  address?: string;
  city?: string;
};

type Tenant = {
  id: number | string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  email?: string;
  "start-date"?: string;
  "end-date"?: string;
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

function formatEur(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const [activeTab, setActiveTab] = useState<"tenants" | "rent" | "settings">("tenants");
  const [editRent, setEditRent] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState<{ code: string; flaeche: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  if (!garage) return null;

  const garageId    = String(garage.id);
  const isOccupied  = !!garage.occupied;
  const flaeche     = garage.flaeche != null ? parseFloat(String(garage.flaeche)) : null;
  const monthlyRent = garage["monthly-rent"] != null ? parseFloat(String(garage["monthly-rent"])) : null;
  const assignedTenant = garage["tenant-id"] != null
    ? tenants.find((t) => String(t.id) === String(garage["tenant-id"]))
    : null;
  const property = garage["property-id"] != null
    ? properties.find((p) => String(p.id) === String(garage["property-id"]))
    : null;

  const unassignedTenants = tenants.filter((t) => String(t.id) !== String(garage["tenant-id"]));

  const handleAssignTenant = () => {
    if (!selectedTenantId) return;
    onAssignTenant?.(garageId, selectedTenantId);
    setAssignOpen(false);
    setSelectedTenantId("");
    setTenantPickerOpen(false);
  };

  const saveRent = () => {
    if (editRent == null) return;
    const r = parseFloat(editRent.replace(",", "."));
    if (!isNaN(r)) onUpdate?.(garageId, { monthlyRent: r });
    setEditRent(null);
  };

  const saveSettings = () => {
    if (!editSettings) return;
    const data: { code?: string; flaeche?: number } = {};
    if (editSettings.code.trim()) data.code = editSettings.code.trim();
    const f = parseFloat(editSettings.flaeche);
    if (!isNaN(f)) data.flaeche = f;
    onUpdate?.(garageId, data);
    setEditSettings(null);
  };

  const propertyLine = [property?.name, property?.address, property?.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tCommon("back")}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Warehouse className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="font-bold text-xl">{garage.code}</span>
        <Badge variant={isOccupied ? "default" : "secondary"}>
          {isOccupied ? tCommon("occupied", { defaultValue: "Belegt" }) : tCommon("available", { defaultValue: "Frei" })}
        </Badge>
        {flaeche != null && (
          <span className="text-sm text-muted-foreground">{flaeche.toLocaleString("de-DE")} m²</span>
        )}
        {propertyLine && (
          <span className="text-sm text-muted-foreground">{propertyLine}</span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="tenants" className="flex-1">{"Mieter"}</TabsTrigger>
          <TabsTrigger value="rent" className="flex-1">{"Miete"}</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">{"Einstellungen"}</TabsTrigger>
        </TabsList>

        {/* ── Mieter tab ──────────────────────────────────────── */}
        <TabsContent value="tenants" className="mt-4 space-y-4">
          {assignedTenant ? (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {"Vollständiger Name"}
                    </p>
                    <p className="font-medium">{tenantDisplayName(assignedTenant)}</p>
                    {assignedTenant.email && (
                      <p className="text-xs text-muted-foreground mt-0.5">{assignedTenant.email}</p>
                    )}
                  </div>
                  {(assignedTenant["start-date"] || assignedTenant["end-date"]) && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {"Mietzeit"}
                      </p>
                      <p>{assignedTenant["start-date"] ?? "—"}</p>
                      {!assignedTenant["end-date"] && (
                        <p className="text-muted-foreground">{"→ unbefristet"}</p>
                      )}
                      {assignedTenant["end-date"] && (
                        <p className="text-muted-foreground">{`→ ${assignedTenant["end-date"]}`}</p>
                      )}
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="mt-4 pt-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onUnassignTenant?.(garageId)}
                      disabled={isSaving}
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                      {"Mieter entfernen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{"Kein Mieter zugewiesen"}</p>
              {!isReadOnly && (
                <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} disabled={isSaving}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  {"Mieter zuweisen"}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Miete tab ───────────────────────────────────────── */}
        <TabsContent value="rent" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{"Miete"}</span>
                {!isReadOnly && editRent == null && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => setEditRent(monthlyRent != null ? String(monthlyRent) : "")}
                    disabled={isSaving}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {tCommon("edit")}
                  </Button>
                )}
              </div>

              {editRent != null ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="garage-rent-edit">{"Miete / Monat (€)"}</Label>
                    <Input
                      id="garage-rent-edit"
                      type="text"
                      inputMode="decimal"
                      value={editRent}
                      onChange={(e) => setEditRent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRent(); if (e.key === "Escape") setEditRent(null); }}
                      autoFocus
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveRent} disabled={isSaving || !editRent.trim()}>
                      <Check className="h-4 w-4 mr-1" />
                      {tCommon("save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditRent(null)} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1" />
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{"Monatsmiete"}</span>
                    <span className="font-medium tabular-nums">
                      {monthlyRent != null ? `€ ${formatEur(monthlyRent)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">{"Jahresmiete"}</span>
                    <span className="font-semibold tabular-nums">
                      {monthlyRent != null ? `€ ${formatEur(monthlyRent * 12)}` : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {"Jahresmiete fließt in die Anlage V (Zeile 15) ein."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Einstellungen tab ───────────────────────────────── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* Code + Fläche */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{"Garagen-Info"}</span>
                {!isReadOnly && editSettings == null && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => setEditSettings({ code: garage.code ?? "", flaeche: flaeche != null ? String(flaeche) : "" })}
                    disabled={isSaving}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {tCommon("edit")}
                  </Button>
                )}
              </div>

              {editSettings ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gs-code">{tCommon("code", { defaultValue: "Code" })}</Label>
                    <Input
                      id="gs-code"
                      value={editSettings.code}
                      onChange={(e) => setEditSettings((s) => s ? { ...s, code: e.target.value } : s)}
                      disabled={isSaving}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gs-flaeche">{"Fläche (m²)"}</Label>
                    <Input
                      id="gs-flaeche"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editSettings.flaeche}
                      onChange={(e) => setEditSettings((s) => s ? { ...s, flaeche: e.target.value } : s)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveSettings} disabled={isSaving || !editSettings.code.trim()}>
                      <Check className="h-4 w-4 mr-1" />
                      {tCommon("save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditSettings(null)} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1" />
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{tCommon("code", { defaultValue: "Code" })}</span>
                    <span className="font-medium">{garage.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{"Fläche"}</span>
                    <span className="font-medium">
                      {flaeche != null ? `${flaeche.toLocaleString("de-DE")} m²` : "—"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="garage-occupied-toggle" className="text-sm font-medium cursor-pointer">
                  {"Als belegt markieren"}
                </Label>
                <Switch
                  id="garage-occupied-toggle"
                  checked={isOccupied}
                  onCheckedChange={(val) => onUpdate?.(garageId, { occupied: val })}
                  disabled={isSaving || isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

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
        </TabsContent>
      </Tabs>

      {/* Assign tenant dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => { setAssignOpen(open); if (!open) { setSelectedTenantId(""); setTenantPickerOpen(false); } }}
      >
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
                          <Check className={cn("mr-2 h-4 w-4", selectedTenantId === String(t.id) ? "opacity-100" : "opacity-0")} />
                          {tenantDisplayName(t)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={handleAssignTenant} disabled={!selectedTenantId || isSaving}>{"Zuweisen"}</Button>
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
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={() => { onDelete?.(garageId); setConfirmDelete(false); }}>
              {"Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
