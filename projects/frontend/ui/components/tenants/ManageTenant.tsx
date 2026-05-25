import React, { useState } from "react";
import { ArrowLeft, Trash2, Loader2, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type HouseholdMember = {
  name: string;
  birthday?: string;
};

type Tenant = {
  id: number;
  "apartment-id"?: number;
  "first-name"?: string;
  "last-name"?: string;
  name?: string;
  email?: string;
  phone?: string;
  "start-date"?: string;
  "end-date"?: string;
  birthday?: string;
  "household-members"?: string;
  kaltmiete?: number | string;
  "nebenkosten-warm"?: number | string;
};

type Props = {
  tenant?: Tenant | null;
  isSaving?: boolean;
  isReadOnly?: boolean;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number, data: Record<string, string>) => void;
};

function parseMembers(raw?: string): HouseholdMember[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as HouseholdMember[]; } catch { return []; }
}

export default function ManageTenant({
  tenant,
  isSaving = false,
  isReadOnly = false,
  onBack,
  onDelete,
  onUpdate,
}: Props) {
  const { t } = useTranslation("tenants");
  const { t: tCommon } = useTranslation("common");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [firstName, setFirstName] = useState(tenant?.["first-name"] ?? tenant?.name ?? "");
  const [lastName, setLastName] = useState(tenant?.["last-name"] ?? "");
  const [email, setEmail] = useState(tenant?.email ?? "");
  const [phone, setPhone] = useState(tenant?.phone ?? "");
  const [startDate, setStartDate] = useState(tenant?.["start-date"] ?? "");
  const [endDate, setEndDate] = useState(tenant?.["end-date"] ?? "");
  const [birthday, setBirthday] = useState(tenant?.birthday ?? "");
  const [kaltmiete, setKaltmiete] = useState(tenant?.kaltmiete != null ? String(tenant.kaltmiete) : "");
  const [nebenkostenWarm, setNebenkostenWarm] = useState(tenant?.["nebenkosten-warm"] != null ? String(tenant["nebenkosten-warm"]) : "");
  const [members, setMembers] = useState<HouseholdMember[]>(parseMembers(tenant?.["household-members"]));
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBirthday, setNewMemberBirthday] = useState("");

  if (!tenant) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("notFound")}
        </CardContent>
      </Card>
    );
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || t("notFound");

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setMembers([...members, { name: newMemberName.trim(), birthday: newMemberBirthday || undefined }]);
    setNewMemberName("");
    setNewMemberBirthday("");
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdate?.(tenant.id, {
      firstName,
      lastName,
      email,
      phone,
      startDate,
      endDate,
      birthday,
      householdMembers: JSON.stringify(members),
      kaltmiete,
      nebenkostenWarm,
    });
  };

  const handleDelete = () => {
    onDelete?.(tenant.id);
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
          <CardTitle>{displayName}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic info */}
          <div className="rounded-xl border p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("fields.firstName")}</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("fields.lastName")}</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">{t("fields.birthday")} <span className="text-muted-foreground text-xs">({tCommon("optional")})</span></Label>
              <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("fields.phone")}</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">{t("fields.startDate")}</Label>
                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">{t("fields.endDate")}</Label>
                <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Rent breakdown */}
          {(() => {
            const kalt = parseFloat(kaltmiete.replace(",", ".")) || 0;
            const nk   = parseFloat(nebenkostenWarm.replace(",", ".")) || 0;
            const total = kalt + nk;
            return (
              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-sm font-medium">{t("rent.title")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="kaltmiete">{t("rent.kaltmiete")} (€)</Label>
                    <Input
                      id="kaltmiete"
                      type="text"
                      inputMode="decimal"
                      value={kaltmiete}
                      onChange={e => setKaltmiete(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nebenkostenWarm">{t("rent.nebenkostenWarm")} (€)</Label>
                    <Input
                      id="nebenkostenWarm"
                      type="text"
                      inputMode="decimal"
                      value={nebenkostenWarm}
                      onChange={e => setNebenkostenWarm(e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>
                {total > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t text-sm">
                    <span className="text-muted-foreground">{t("rent.total")}</span>
                    <span className="font-semibold tabular-nums">
                      € {total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Household members */}
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">{t("household.title")}</p>
            <p className="text-xs text-muted-foreground">{t("household.hint")}</p>

            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{m.name}</span>
                      {m.birthday && (
                        <span className="text-xs text-muted-foreground ml-2">{m.birthday}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleRemoveMember(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder={t("household.memberName")}
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMember(); } }}
                className="flex-1"
              />
              <Input
                type="date"
                value={newMemberBirthday}
                onChange={(e) => setNewMemberBirthday(e.target.value)}
                className="w-36"
                title={t("household.memberBirthday")}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddMember} disabled={!newMemberName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || isReadOnly || !firstName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                t("saveChanges")
              )}
            </Button>
          </div>

          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">{tCommon("dangerZone")}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving || isReadOnly}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteTenant")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm", { name: displayName })}</DialogTitle>
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
