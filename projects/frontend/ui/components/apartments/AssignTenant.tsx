import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = {
  apartmentCode?: string;
  isLoading?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  onClose?: () => void;
  onChangeName?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeEmail?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangePhone?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeStartDate?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
};

export default function AssignTenant({
  apartmentCode,
  isLoading = false,
  name = "",
  email = "",
  phone = "",
  startDate = "",
  onClose,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeStartDate,
  onSubmit,
}: Props) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Assign Tenant{apartmentCode ? ` — Apt ${apartmentCode}` : ""}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="assign-name">Full Name</Label>
          <Input
            id="assign-name"
            placeholder="E.g., Maria Schmidt"
            value={name}
            onChange={onChangeName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-email">Email</Label>
          <Input
            id="assign-email"
            type="email"
            placeholder="tenant@example.com"
            value={email}
            onChange={onChangeEmail}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-phone">Phone</Label>
          <Input
            id="assign-phone"
            type="tel"
            placeholder="+49 123 456789"
            value={phone}
            onChange={onChangePhone}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-start">Start Date</Label>
          <Input
            id="assign-start"
            type="date"
            value={startDate}
            onChange={onChangeStartDate}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Tenant"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
