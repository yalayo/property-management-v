import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  apartments?: any[];
  isLoading?: boolean;
  code?: string;
  onChangeAddApartmentDialogClose?: () => void;
  onChangeCode?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeProperty?: (value: string) => void;
  submitApartment?: () => void;
};

export default function AddApartment({
  properties = [],
  apartments = [],
  isLoading = false,
  code = "",
  onChangeAddApartmentDialogClose,
  onChangeCode,
  onChangeProperty,
  submitApartment,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [codeError, setCodeError] = useState<string>("");

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
    setCodeError("");
    onChangeProperty?.(value);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodeError("");
    onChangeCode?.(e);
  };

  const handleSubmit = () => {
    if (selectedPropertyId && code.trim()) {
      const duplicate = apartments.some(
        a => String(a["property-id"]) === selectedPropertyId &&
             a.code?.toLowerCase() === code.trim().toLowerCase()
      );
      if (duplicate) {
        setCodeError(t("validation.codeTaken"));
        return;
      }
    }
    submitApartment?.();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("addApartment")}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="property">{t("fields.property")}</Label>
          <Select onValueChange={handlePropertyChange}>
            <SelectTrigger id="property">
              <SelectValue placeholder={t("fields.selectProperty")} />
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
          <Label htmlFor="code">{t("fields.code")}</Label>
          <Input
            id="code"
            placeholder={t("placeholders.code")}
            value={code}
            onChange={handleCodeChange}
          />
          {codeError ? (
            <p className="text-xs text-destructive">{codeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("fields.codeHint")}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onChangeAddApartmentDialogClose} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !code.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon("saving")}
              </>
            ) : (
              t("addApartment")
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
