import React, { useState } from "react";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type Tenant = {
  id: number;
  apartment_id: number;
  name: string;
  email?: string;
  phone?: string;
  start_date?: string;
  end_date?: string;
};

type Props = {
  tenant?: Tenant | null;
  isSaving?: boolean;
  onBack?: () => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number, data: Partial<Tenant>) => void;
};

export default function ManageTenant({
  tenant,
  isSaving = false,
  onBack,
  onDelete,
  onUpdate,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(tenant?.name ?? "");
  const [email, setEmail] = useState(tenant?.email ?? "");
  const [phone, setPhone] = useState(tenant?.phone ?? "");
  const [startDate, setStartDate] = useState(tenant?.start_date ?? "");
  const [endDate, setEndDate] = useState(tenant?.end_date ?? "");

  if (!tenant) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Tenant not found.
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    onUpdate?.(tenant.id, { name, email, phone, start_date: startDate, end_date: endDate });
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
            Back
          </Button>
          <CardTitle>{tenant.name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Date</Label>
                <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium text-destructive mb-3">Danger zone</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tenant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {tenant.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This action cannot be undone. The tenant record will be permanently removed.
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
