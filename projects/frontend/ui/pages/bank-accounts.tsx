import React, { useState } from 'react';
import { Plus, Edit, Trash2, Landmark, Loader2 } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

type BankAccount = {
  id?: number | string;
  "db/id"?: number | string;
  "bank-account/iban"?: string;
  "bank-account/owner"?: string;
  "bank-account/bank-name"?: string;
  "bank-account/description"?: string;
};

type Props = {
  bankAccounts?:         BankAccount[];
  bankAccountsLoading?:  boolean;
  bankAccountsSaving?:   boolean;
  onCreateBankAccount?:  (data: { iban: string; owner: string; bankName: string; description: string }) => void;
  onUpdateBankAccount?:  (data: { id: number | string; iban: string; owner: string; bankName: string; description: string }) => void;
  onDeleteBankAccount?:  (id: number | string) => void;
};

function accId(ba: BankAccount): number | string {
  return (ba.id ?? ba["db/id"]) as number | string;
}

const EMPTY_FORM = { iban: "", owner: "", bankName: "", description: "" };

export default function BankAccountsPage({
  bankAccounts       = [],
  bankAccountsLoading = false,
  bankAccountsSaving  = false,
  onCreateBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.iban.trim())  e.iban  = "IBAN ist erforderlich";
    if (!form.owner.trim()) e.owner = "Kontoinhaber ist erforderlich";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    onCreateBankAccount?.({ iban: form.iban.trim(), owner: form.owner.trim(), bankName: form.bankName.trim(), description: form.description.trim() });
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleEdit = (ba: BankAccount) => {
    setEditTarget(ba);
    setForm({
      iban:        ba["bank-account/iban"]        ?? "",
      owner:       ba["bank-account/owner"]       ?? "",
      bankName:    ba["bank-account/bank-name"]   ?? "",
      description: ba["bank-account/description"] ?? "",
    });
    setErrors({});
  };

  const handleUpdate = () => {
    if (!editTarget || !validate()) return;
    onUpdateBankAccount?.({ id: accId(editTarget), iban: form.iban.trim(), owner: form.owner.trim(), bankName: form.bankName.trim(), description: form.description.trim() });
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    onDeleteBankAccount?.(accId(deleteTarget));
    setDeleteTarget(null);
  };

  if (bankAccountsLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Bankkonten</h1>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setErrors({}); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Konto hinzufügen
        </Button>
      </div>

      {bankAccounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-3">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Noch keine Bankkonten gespeichert.</p>
            <Button onClick={() => { setForm(EMPTY_FORM); setErrors({}); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Erstes Konto anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IBAN</TableHead>
                <TableHead>Kontoinhaber</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map((ba, i) => (
                <TableRow key={String(accId(ba) ?? i)}>
                  <TableCell className="font-mono text-sm">{ba["bank-account/iban"] ?? "—"}</TableCell>
                  <TableCell>{ba["bank-account/owner"] ?? "—"}</TableCell>
                  <TableCell>{ba["bank-account/bank-name"] ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{ba["bank-account/description"] ?? ""}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ba)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(ba)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bankkonto hinzufügen</DialogTitle>
            <DialogDescription>Geben Sie die Kontodaten ein.</DialogDescription>
          </DialogHeader>
          <BankAccountForm form={form} errors={errors} setField={setField} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={bankAccountsSaving}>
              {bankAccountsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bankkonto bearbeiten</DialogTitle>
          </DialogHeader>
          <BankAccountForm form={form} errors={errors} setField={setField} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Abbrechen</Button>
            <Button onClick={handleUpdate} disabled={bankAccountsSaving}>
              {bankAccountsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bankkonto löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie das Konto <span className="font-mono font-semibold">{deleteTarget?.["bank-account/iban"]}</span> wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={bankAccountsSaving}>
              {bankAccountsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BankAccountForm({
  form,
  errors,
  setField,
}: {
  form: { iban: string; owner: string; bankName: string; description: string };
  errors: Record<string, string>;
  setField: (k: "iban" | "owner" | "bankName" | "description") => (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-1.5">
        <Label htmlFor="iban">IBAN *</Label>
        <Input id="iban" value={form.iban} onChange={setField("iban")}
          placeholder="DE89 3704 0044 0532 0130 00" className="font-mono" />
        {errors.iban && <p className="text-xs text-destructive">{errors.iban}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="owner">Kontoinhaber *</Label>
        <Input id="owner" value={form.owner} onChange={setField("owner")}
          placeholder="Max Mustermann" />
        {errors.owner && <p className="text-xs text-destructive">{errors.owner}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bankName">Bank</Label>
        <Input id="bankName" value={form.bankName} onChange={setField("bankName")}
          placeholder="Deutsche Bank" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Bezeichnung</Label>
        <Input id="description" value={form.description} onChange={setField("description")}
          placeholder="z.B. Hauptkonto" />
      </div>
    </div>
  );
}
