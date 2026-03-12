import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Property = {
  id: number;
  name: string;
};

type Props = {
  id?: string;
  properties?: Property[];
  isLoading?: boolean;
  code?: string;
  onChangeAddApartmentDialogClose?: () => void;
  onChangeCode?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeProperty?: (value: string) => void;
  submitApartment?: () => void;
};

export default function AddApartment({
  properties = [],
  isLoading = false,
  code = "",
  onChangeAddApartmentDialogClose,
  onChangeCode,
  onChangeProperty,
  submitApartment,
}: Props) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Apartment</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="property">Property</Label>
          <Select onValueChange={onChangeProperty}>
            <SelectTrigger id="property">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Apartment Code</Label>
          <Input
            id="code"
            placeholder="E.g., A1, 2B, Top-Left"
            value={code}
            onChange={onChangeCode}
          />
          <p className="text-xs text-muted-foreground">
            A short identifier for this unit within the property.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onChangeAddApartmentDialogClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={submitApartment} disabled={isLoading || !code.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Add Apartment"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
