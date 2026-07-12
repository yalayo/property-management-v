import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Users, Loader2, ShieldCheck, User } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";

const ALL_SECTIONS = [
  "overview", "properties", "apartments", "tenants",
  "bank", "abrechnung", "expenses", "documents", "analytics", "tax",
  "finances", "accounting",
] as const;

type Section = typeof ALL_SECTIONS[number];

type OrgUser = {
  id: string | number;
  "membership-id": string | number;
  email: string;
  name?: string;
  role: string;
  sections?: string;
};

type Props = {
  users?: OrgUser[];
  isLoading?: boolean;
  isSaving?: boolean;
  trialPaused?: boolean;
  currentUserEmail?: string;
  onLoad?: () => void;
  onCreateUser?: (data: { email: string; name: string; password: string; sections: string[] }) => void;
  onUpdateSections?: (membershipId: string | number, sections: string[]) => void;
  onDeleteUser?: (accountId: string | number, membershipId: string | number) => void;
};

function parseSections(raw?: string): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(",").map(s => s.trim()).filter(Boolean));
}

function SectionCheckboxes({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const { t } = useTranslation("team");
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {ALL_SECTIONS.map(sec => (
        <label key={sec} className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={selected.has(sec)}
            onCheckedChange={(checked) => {
              const next = new Set(selected);
              if (checked) next.add(sec); else next.delete(sec);
              onChange(next);
            }}
          />
          <span className="text-sm">{t(`sections.${sec}`)}</span>
        </label>
      ))}
    </div>
  );
}

export default function OrgUserManager({
  users = [],
  isLoading = false,
  isSaving = false,
  trialPaused = false,
  currentUserEmail,
  onLoad,
  onCreateUser,
  onUpdateSections,
  onDeleteUser,
}: Props) {
  const { t } = useTranslation("team");

  const [addOpen, setAddOpen]         = useState(false);
  const [editUser, setEditUser]       = useState<OrgUser | null>(null);
  const [deleteUser, setDeleteUser]   = useState<OrgUser | null>(null);

  // Add form state
  const [addEmail, setAddEmail]       = useState("");
  const [addName, setAddName]         = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addSections, setAddSections] = useState<Set<string>>(new Set(ALL_SECTIONS));
  const [addError, setAddError]       = useState("");

  // Edit sections state
  const [editSections, setEditSections] = useState<Set<string>>(new Set());

  // Track save-in-flight so we can close dialogs and reload when isSaving completes.
  const saveInFlight = useRef(false);

  useEffect(() => { onLoad?.(); }, []);

  // When a save we initiated finishes (isSaving: true → false), close all
  // dialogs and reload the list so the new/updated user appears immediately.
  useEffect(() => {
    if (saveInFlight.current && !isSaving) {
      saveInFlight.current = false;
      setAddOpen(false);
      setEditUser(null);
      setDeleteUser(null);
      onLoad?.();
    }
  }, [isSaving]);

  const handleOpenAdd = () => {
    if (trialPaused) return;
    setAddEmail(""); setAddName(""); setAddPassword("");
    setAddSections(new Set(ALL_SECTIONS)); setAddError("");
    setAddOpen(true);
  };

  const handleCreate = () => {
    if (trialPaused) { setAddError(t("validation.trialPaused")); return; }
    if (!addEmail.trim()) { setAddError(t("validation.emailRequired")); return; }
    if (!addName.trim())  { setAddError(t("validation.nameRequired")); return; }
    if (addPassword.length < 8) { setAddError(t("validation.passwordMin")); return; }
    if (addSections.size === 0) { setAddError(t("validation.sectionsRequired")); return; }
    saveInFlight.current = true;
    onCreateUser?.({ email: addEmail.trim(), name: addName.trim(), password: addPassword, sections: Array.from(addSections) });
  };

  const handleOpenEdit = (u: OrgUser) => {
    setEditSections(parseSections(u.sections));
    setEditUser(u);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    saveInFlight.current = true;
    onUpdateSections?.(editUser["membership-id"], Array.from(editSections));
  };

  const handleConfirmDelete = () => {
    if (!deleteUser) return;
    saveInFlight.current = true;
    onDeleteUser?.(deleteUser.id, deleteUser["membership-id"]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
        <Button size="sm" onClick={handleOpenAdd} disabled={isSaving || trialPaused} title={trialPaused ? t("trialPausedHint") : undefined}>
          <Plus className="h-4 w-4 mr-1" />
          {t("addMember")}
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        {trialPaused && (
          <p className="text-xs text-muted-foreground mb-3">{t("trialPausedHint")}</p>
        )}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("noMembers")}</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const isAdmin   = u.role === "admin";
              const isSelf    = u.email === currentUserEmail;
              const sections  = parseSections(u.sections);
              return (
                <div key={String(u.id)} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {isAdmin
                      ? <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      : <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate leading-tight">
                          {u.name || u.email}
                        </p>
                        {isSelf && <span className="text-xs text-muted-foreground shrink-0">({t("you")})</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                          {t(`roles.${u.role}`)}
                        </Badge>
                        {isAdmin ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">{t("fullAccess")}</Badge>
                        ) : sections.size === 0 ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">{t("noSections")}</Badge>
                        ) : (
                          Array.from(sections).map(sec => (
                            <Badge key={sec} variant="outline" className="text-[10px] px-2 py-0.5">
                              {t(`sections.${sec}`)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!isSelf && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addMember")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("fields.email")}</Label>
              <Input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.name")}</Label>
              <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder={t("fields.namePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.password")}</Label>
              <Input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)} placeholder="••••••••" />
              <p className="text-xs text-muted-foreground">{t("fields.passwordHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.sections")}</Label>
              <SectionCheckboxes selected={addSections} onChange={setAddSections} />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit sections dialog */}
      <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("editSections")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editUser?.name || editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SectionCheckboxes selected={editSections} onChange={setEditSections} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t("cancel")}</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={open => { if (!open) setDeleteUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteMember")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm", { email: deleteUser?.email ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
