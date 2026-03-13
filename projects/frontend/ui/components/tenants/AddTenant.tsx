import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Apartment = {
  id: number;
  code: string;
};

type Props = {
  apartments?: Apartment[];
  isLoading?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  apartmentId?: string;
  onClose?: () => void;
  onChangeName?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeEmail?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangePhone?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeStartDate?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeApartment?: (value: string) => void;
  onSubmit?: () => void;
};

export default function AddTenant({
  apartments = [],
  isLoading = false,
  name = "",
  email = "",
  phone = "",
  startDate = "",
  apartmentId,
  onClose,
  onChangeName,
  onChangeEmail,
  onChangePhone,
  onChangeStartDate,
  onChangeApartment,
  onSubmit,
}: Props) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Tenant</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Full Name</Label>
          <Input
            id="tenant-name"
            placeholder="E.g., Maria Schmidt"
            value={name}
            onChange={onChangeName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenant-email">Email</Label>
          <Input
            id="tenant-email"
            type="email"
            placeholder="tenant@example.com"
            value={email}
            onChange={onChangeEmail}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenant-phone">Phone</Label>
          <Input
            id="tenant-phone"
            type="tel"
            placeholder="+49 123 456789"
            value={phone}
            onChange={onChangePhone}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenant-start">Start Date</Label>
          <Input
            id="tenant-start"
            type="date"
            value={startDate}
            onChange={onChangeStartDate}
          />
        </div>

        {!apartmentId && (
          <div className="space-y-2">
            <Label htmlFor="tenant-apartment">Apartment</Label>
            <Select onValueChange={onChangeApartment}>
              <SelectTrigger id="tenant-apartment">
                <SelectValue placeholder="Select an apartment" />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Add Tenant"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
