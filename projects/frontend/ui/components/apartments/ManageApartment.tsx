import React, { useState } from "react";
import { ArrowLeft, Trash2, Loader2, DoorOpen, DoorClosed, UserPlus, Clock, CheckCircle2, Search } from "lucide-react";
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
  name: string;
  email?: string;
  phone?: string;
  "start-date"?: string;
  "apartment-id"?: string | number;
};

type Props = {
  apartment?: Apartment | null;
  tenants?: Tenant[];
  isSaving?: boolean;
  isOnboarding?: boolean;
  onboardingStatus?: OnboardingStatus | null;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onToggleOccupied?: (id: number, occupied: boolean) => void;
  onStartOnboarding?: (apartmentId: number, email: string) => void;
  onAssignExistingTenant?: (apartmentId: number, tenantId: string) => void;
  onAfterAssign?: () => void;
};

type OnboardingMode = "invite" | "assign";

export default function ManageApartment({
  apartment,
  tenants = [],
  isSaving = false,
  isOnboarding = false,
  onboardingStatus,
  onBack,
  onDelete,
  onToggleOccupied,
  onStartOnboarding,
  onAssignExistingTenant,
  onAfterAssign,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tenantEmail, setTenantEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>("invite");
  const [tenantSearch, setTenantSearch] = useState("");
  const [localAssignedTenant, setLocalAssignedTenant] = useState<Tenant | null>(null);

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

  const handleOnboarding = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tenantEmail) {
      setEmailError(t("onboarding.emailRequired"));
      return;
    }
    if (!emailRegex.test(tenantEmail)) {
      setEmailError(t("onboarding.emailInvalid"));
      return;
    }
    setEmailError("");
    onStartOnboarding?.(apartment.id, tenantEmail);
    setTenantEmail("");
  };

  const currentTenant =
    tenants.find((t) => String(t["apartment-id"]) === String(apartment?.id)) ??
    localAssignedTenant;

  const handleAssignExisting = (tenant: Tenant) => {
    setLocalAssignedTenant(tenant);
    onAssignExistingTenant?.(apartment!.id, tenant.id);
    onAfterAssign?.();
  };

  const filteredTenants = tenants.filter((t) => {
    if (t["apartment-id"]) return false;
    const q = tenantSearch.toLowerCase();
    return (
      !q ||
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    );
  });

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

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{t("onboarding.title")}</p>
            </div>

            {currentTenant ? (
              <div className="space-y-1.5 text-sm">
                <p className="font-medium">{currentTenant.name}</p>
                {currentTenant.email && (
                  <p className="text-muted-foreground">{currentTenant.email}</p>
                )}
                {currentTenant.phone && (
                  <p className="text-muted-foreground">{currentTenant.phone}</p>
                )}
                {currentTenant["start-date"] && (
                  <p className="text-muted-foreground">
                    {t("onboarding.since", { date: currentTenant["start-date"] })}
                  </p>
                )}
              </div>
            ) : onboardingStatus ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("onboarding.emailLabel")}</span>
                  <span className="text-sm font-medium">{onboardingStatus.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("onboarding.statusLabel")}</span>
                  <div className="flex items-center gap-1.5">
                    {onboardingStatus.status === "pending" ? (
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    <Badge variant="outline" className={onboardingStatus.status === "pending" ? "text-amber-600 border-amber-300" : "text-green-600 border-green-300"}>
                      {t(`onboarding.status.${onboardingStatus.status}`, { defaultValue: onboardingStatus.status })}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Mode switcher */}
                <div className="flex rounded-lg border overflow-hidden text-sm">
                  <button
                    type="button"
                    className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "invite" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setOnboardingMode("invite")}
                  >
                    {t("onboarding.inviteNew")}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 px-3 py-1.5 transition-colors ${onboardingMode === "assign" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setOnboardingMode("assign")}
                  >
                    {t("onboarding.assignExisting")}
                  </button>
                </div>

                {onboardingMode === "invite" ? (
                  <>
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
                        onChange={(e) => {
                          setTenantEmail(e.target.value);
                          setEmailError("");
                        }}
                        disabled={isOnboarding}
                      />
                      {emailError && (
                        <p className="text-xs text-destructive">{emailError}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleOnboarding}
                      disabled={isOnboarding || isSaving}
                    >
                      {isOnboarding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("onboarding.submitting")}
                        </>
                      ) : (
                        t("onboarding.submit")
                      )}
                    </Button>
                  </>
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
                            disabled={isSaving}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => handleAssignExisting(tenant)}
                          >
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              {tenant.email && (
                                <p className="text-xs text-muted-foreground">{tenant.email}</p>
                              )}
                            </div>
                            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}
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
