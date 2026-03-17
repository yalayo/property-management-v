import React from "react";
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
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("addApartment")}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="property">{t("fields.property")}</Label>
          <Select onValueChange={onChangeProperty}>
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
            onChange={onChangeCode}
          />
          <p className="text-xs text-muted-foreground">{t("fields.codeHint")}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onChangeAddApartmentDialogClose} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submitApartment} disabled={isLoading || !code.trim()}>
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
