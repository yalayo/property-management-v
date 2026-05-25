import React, { useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Trash2, Loader2,
  DoorOpen, DoorClosed, UserPlus, Clock, CheckCircle2,
  Search, Pencil, Check, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type Apartment = {
  id: number;
  property_id: number;
  code: string;
  occupied: number | boolean;
};

type OnboardingStatus = {
  id: number;
  apartment_id: number;
  email: string;
  status: string;
  created_at?: string;
};

type Tenant = {
  id: string;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  email?: string;
  phone?: string;
  "start-date"?: string;
  "end-date"?: string;
  "apartment-id"?: string | number;
};

type TenantUpdateData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
};

type OnboardingMode = "create" | "assign";

type Props = {
  apartment?: Apartment | null;
  tenants?: Tenant[];
  isSaving?: boolean;
  tenantsSaving?: boolean;
  isReadOnly?: boolean;
  isOnboarding?: boolean;
  onboardingStatus?: OnboardingStatus | null;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onToggleOccupied?: (id: number, occupied: boolean) => void;
  onStartOnboarding?: (apartmentId: number, email: string) => void;
  onAssignExistingTenant?: (apartmentId: number, tenantId: string) => void;
  onAfterAssign?: () => void;
  onUpdateTenant?: (tenantId: string, data: TenantUpdateData) => void;
  onCreateTenant?: (apartmentId: number, data: { firstName: string; lastName?: string; email?: string; phone?: string; startDate: string; endDate?: string }) => void;
};

function parseYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.split("-")[0], 10);
  return isNaN(y) ? null : y;
}

function tenantActiveInYear(tenant: Tenant, year: number): boolean {
  const sy = parseYear(tenant["start-date"]);
  const ey = parseYear(tenant["end-date"]);
  if (sy !== null && sy > year) return false;
  if (ey !== null && ey < year) return false;
  return true;
}

function isActiveTenant(tenant: Tenant): boolean {
  const ed = tenant["end-date"];
  return !ed || ed === "";
}

function tenantDisplayName(tenant: Tenant): string {
  if (tenant["first-name"]) {
    return [tenant["first-name"], tenant["last-name"]].filter(Boolean).join(" ");
  }
  return tenant.name ?? "";
}

export default function ManageApartment({
  apartment,
  tenants = [],
  isSaving = false,
  tenantsSaving = false,
  isReadOnly = false,
  isOnboarding = false,
  onboardingStatus,
  onBack,
  onDelete,
  onToggleOccupied,
  onStartOnboarding,
  onAssignExistingTenant,
  onAfterAssign,
  onUpdateTenant,
  onCreateTenant,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tTenants } = useTranslation("tenants");
  const { t: tCommon } = useTranslation("common");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTenantTab, setActiveTenantTab] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TenantUpdateData>({});
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>("create");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [localAssignedTenant, setLocalAssignedTenant] = useState<Tenant | null>(null);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", phone: "", startDate: `${new Date().getFullYear()}-01-01`, endDate: "" });

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

  // Tenants for this apartment, with optimistic local assignment
  const aptTenants = tenants.filter(
    (t) => String(t["apartment-id"]) === String(apartment.id)
  );
  const allAptTenants =
    localAssignedTenant && !aptTenants.some((t) => t.id === localAssignedTenant.id)
      ? [...aptTenants, { ...localAssignedTenant, "apartment-id": apartment.id }]
      : aptTenants;
  const yearTenants = allAptTenants.filter((t) => tenantActiveInYear(t, year));
  const selectedTenant =
    yearTenants.find((t) => t.id === activeTenantTab) ?? yearTenants[0] ?? null;

  // Unassigned tenants for "assign existing"
  const filteredTenants = tenants.filter((t) => {
    if (t["apartment-id"]) return false;
    const q = tenantSearch.toLowerCase();
    return !q || tenantDisplayName(t).toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
  });

  const changeYear = (delta: number) => {
    const newYear = year + delta;
    setYear(newYear);
    setActiveTenantTab(null);
    setEditingTenantId(null);
    setEditForm({});
    setAddForm((f) => ({ ...f, startDate: `${newYear}-01-01`, endDate: "" }));
  };

  const handleTabSelect = (tenantId: string) => {
    setActiveTenantTab(tenantId);
    setEditingTenantId(null);
    setEditForm({});
  };

  const handleToggle = (checked: boolean) => onToggleOccupied?.(apartment.id, checked);
  const handleDelete = () => { onDelete?.(apartment.id); setConfirmDelete(false); };

  const handleOnboarding = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tenantEmail) { setEmailError(t("onboarding.emailRequired")); return; }
    if (!emailRegex.test(tenantEmail)) { setEmailError(t("onboarding.emailInvalid")); return; }
    setEmailError("");
    onStartOnboarding?.(apartment.id, tenantEmail);
    setTenantEmail("");
  };

  const handleCreateTenant = () => {
    if (!apartment || !addForm.firstName.trim()) return;
    onCreateTenant?.(apartment.id, {
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName || undefined,
      email: addForm.email || undefined,
      phone: addForm.phone || undefined,
      startDate: addForm.startDate || `${year}-01-01`,
      endDate: addForm.endDate || undefined,
    });
    setAddForm({ firstName: "", lastName: "", email: "", phone: "", startDate: `${year}-01-01`, endDate: "" });
  };

  const handleAssignExisting = (tenant: Tenant) => {
    setLocalAssignedTenant(tenant);
    onAssignExistingTenant?.(apartment.id, tenant.id);
    onAfterAssign?.();
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setEditForm({
      firstName: tenant["first-name"] ?? tenant.name ?? "",
      lastName: tenant["last-name"] ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      startDate: tenant["start-date"] ?? "",
      endDate: tenant["end-date"] ?? "",
    });
  };

  const cancelEdit = () => { setEditingTenantId(null); setEditForm({}); };

  const saveEdit = (tenantId: string) => {
    onUpdateTenant?.(tenantId, editForm);
    setEditingTenantId(null);
    setEditForm({});
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
          {/* Occupied toggle */}
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOccupied
                  ? <DoorClosed className="h-5 w-5 text-amber-500" />
                  : <DoorOpen className="h-5 w-5 text-green-500" />}
                <span className="font-medium">{t("status")}</span>
              </div>
              <Badge
                variant={isOccupied ? "secondary" : "outline"}
                className={isOccupied ? "" : "text-green-600 border-green-300"}
              >
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
                disabled={isSaving || isReadOnly}
              />
            </div>
          </div>

          {/* Year nav + tenant tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t("tenants", { defaultValue: "Tenants" })}</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeYear(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-sm font-medium tabular-nums">{year}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeYear(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {yearTenants.length === 0 ? (
              <div className="rounded-xl border p-4 text-center text-sm text-muted-foreground">
                {t("noTenantsInYear", { year, defaultValue: `No tenants in ${year}` })}
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                {/* Tab bar — only when multiple tenants */}
                {yearTenants.length > 1 && (
                  <div className="flex border-b overflow-x-auto">
                    {yearTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        type="button"
                        className={`flex-1 min-w-0 px-3 py-2 text-sm font-medium truncate transition-colors ${
                          selectedTenant?.id === tenant.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => handleTabSelect(tenant.id)}
                      >
                        {tenantDisplayName(tenant)}
                      </button>
                    ))}
                  </div>
                )}

                {selectedTenant && (
                  <div className="p-4 space-y-4">
                    {editingTenantId === selectedTenant.id ? (
                      /* Edit form */
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.firstName")}</Label>
                            <Input
                              value={editForm.firstName ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.lastName")}</Label>
                            <Input
                              value={editForm.lastName ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.email")}</Label>
                            <Input
                              type="email"
                              value={editForm.email ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.phone")}</Label>
                            <Input
                              type="tel"
                              value={editForm.phone ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.startDate")}</Label>
                            <Input
                              type="date"
                              value={editForm.startDate ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{tTenants("fields.endDate")}</Label>
                            <Input
                              type="date"
                              value={editForm.endDate ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                              disabled={tenantsSaving}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(selectedTenant.id)} disabled={tenantsSaving || isReadOnly}>
                            {tenantsSaving
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5 mr-1" />}
                            {tCommon("save")}
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelEdit} disabled={tenantsSaving}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            {tCommon("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="space-y-3">
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{tTenants("fields.name")}</span>
                            <span className="font-medium">{tenantDisplayName(selectedTenant)}</span>
                          </div>
                          {selectedTenant.email && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{tTenants("fields.email")}</span>
                              <span>{selectedTenant.email}</span>
                            </div>
                          )}
                          {selectedTenant.phone && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{tTenants("fields.phone")}</span>
                              <span>{selectedTenant.phone}</span>
                            </div>
                          )}
                          {selectedTenant["start-date"] && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{tTenants("fields.startDate")}</span>
                              <span>{selectedTenant["start-date"]}</span>
                            </div>
                          )}
                          {selectedTenant["end-date"] && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{tTenants("fields.endDate")}</span>
                              <span>{selectedTenant["end-date"]}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" disabled={isReadOnly} onClick={() => startEdit(selectedTenant)}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          {tCommon("edit")}
                        </Button>
                      </div>
                    )}

                    {/* Onboarding — only for the active (no end-date) tenant */}
                    {isActiveTenant(selectedTenant) && editingTenantId !== selectedTenant.id && (
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">{t("onboarding.title")}</p>
                        </div>
                        {onboardingStatus ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{t("onboarding.emailLabel")}</span>
                              <span className="text-sm font-medium">{onboardingStatus.email}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{t("onboarding.statusLabel")}</span>
                              <div className="flex items-center gap-1.5">
                                {onboardingStatus.status === "pending"
                                  ? <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                <Badge
                                  variant="outline"
                                  className={onboardingStatus.status === "pending"
                                    ? "text-amber-600 border-amber-300"
                                    : "text-green-600 border-green-300"}
                                >
                                  {t(`onboarding.status.${onboardingStatus.status}`, { defaultValue: onboardingStatus.status })}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">{t("onboarding.description")}</p>
                            <div className="space-y-1">
                              <Label htmlFor="tenant-email" className="text-sm">
                                {t("onboarding.emailLabel")}
                              </Label>
                              <Input
                                id="tenant-email"
                                type="email"
                                placeholder={t("onboarding.emailPlaceholder")}
                                value={tenantEmail}
                                onChange={(e) => { setTenantEmail(e.target.value); setEmailError(""); }}
                                disabled={isOnboarding}
                              />
                              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                            </div>
                            <Button size="sm" onClick={handleOnboarding} disabled={isOnboarding || isSaving || isReadOnly}>
                              {isOnboarding
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("onboarding.submitting")}</>
                                : t("onboarding.submit")}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Add tenant section — always available */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{t("onboarding.addTenant", { defaultValue: "Add Tenant" })}</p>
              </div>
              <div className="flex rounded-lg border overflow-hidden text-sm">
                <button
                  type="button"
                  className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "create" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setOnboardingMode("create")}
                >
                  {t("onboarding.createNew", { defaultValue: "Create New" })}
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "assign" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setOnboardingMode("assign")}
                >
                  {t("onboarding.assignExisting")}
                </button>
              </div>
              {onboardingMode === "create" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{tTenants("fields.firstName")}</Label>
                      <Input
                        placeholder={tTenants("placeholders.firstName", { defaultValue: "First name" })}
                        value={addForm.firstName}
                        onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{tTenants("fields.lastName")}</Label>
                      <Input
                        placeholder={tTenants("placeholders.lastName", { defaultValue: "Last name" })}
                        value={addForm.lastName}
                        onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{tTenants("fields.email")}</Label>
                      <Input
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{tTenants("fields.phone")}</Label>
                      <Input
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{tTenants("fields.startDate")}</Label>
                      <Input
                        type="date"
                        value={addForm.startDate}
                        onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {tTenants("fields.endDate")}
                        <span className="ml-1 text-muted-foreground font-normal">({tCommon("optional")})</span>
                      </Label>
                      <Input
                        type="date"
                        value={addForm.endDate}
                        onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={handleCreateTenant} disabled={isSaving || isReadOnly || !addForm.firstName.trim()}>
                    {isSaving
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tCommon("saving")}</>
                      : <><UserPlus className="h-3.5 w-3.5 mr-1.5" />{t("onboarding.addTenant", { defaultValue: "Add Tenant" })}</>}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t("onboarding.searchTenants")}
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                    {filteredTenants.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        {t("onboarding.noTenantsFound")}
                      </p>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          type="button"
                          disabled={isSaving || isReadOnly}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                          onClick={() => handleAssignExisting(tenant)}
                        >
                          <div>
                            <p className="font-medium">{tenantDisplayName(tenant)}</p>
                            {tenant.email && <p className="text-xs text-muted-foreground">{tenant.email}</p>}
                          </div>
                          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">{tCommon("dangerZone")}</p>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={isSaving || isReadOnly}>
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
              {isSaving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tCommon("deleting")}</>
                : tCommon("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
