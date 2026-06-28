import React, { useState } from "react";
import { Loader2, ChevronsUpDown, Check, Building2, Hash, Ruler, Zap, Droplet, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";

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
  wohnflaeche?: string;
  stromZaehlerNr?: string;
  wasserZaehlerNrn?: string[];
  onChangeAddApartmentDialogClose?: () => void;
  onChangeCode?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeProperty?: (value: string) => void;
  onChangeWohnflaeche?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeStromZaehlerNr?: (value: string) => void;
  onChangeWasserZaehlerNrn?: (value: string[]) => void;
  submitApartment?: () => void;
};

export default function AddApartment({
  properties = [],
  apartments = [],
  isLoading = false,
  code = "",
  wohnflaeche = "",
  stromZaehlerNr = "",
  wasserZaehlerNrn = [],
  onChangeAddApartmentDialogClose,
  onChangeCode,
  onChangeProperty,
  onChangeWohnflaeche,
  onChangeStromZaehlerNr,
  onChangeWasserZaehlerNrn,
  submitApartment,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tCommon } = useTranslation("common");

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [codeError, setCodeError] = useState<string>("");

  const selectedProperty = properties.find((p) => String(p.id) === selectedPropertyId);

  const handlePropertySelect = (id: string) => {
    setSelectedPropertyId(id);
    setCodeError("");
    setPropertyOpen(false);
    onChangeProperty?.(id);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodeError("");
    onChangeCode?.(e);
  };

  const handleSubmit = () => {
    if (selectedPropertyId && code.trim()) {
      const duplicate = apartments.some(
        (a) =>
          String(a["property-id"]) === selectedPropertyId &&
          a.code?.toLowerCase() === code.trim().toLowerCase()
      );
      if (duplicate) {
        setCodeError(t("validation.codeTaken"));
        return;
      }
    }
    submitApartment?.();
  };

  const canSubmit = !!selectedPropertyId && !!code.trim() && !isLoading;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">{t("addApartment")}</DialogTitle>
        <DialogDescription>{t("addApartmentHint")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Property picker */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {t("fields.property")}
          </Label>
          <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={propertyOpen}
                className="w-full justify-between font-normal"
                disabled={isLoading}
              >
                <span className={cn(!selectedProperty && "text-muted-foreground")}>
                  {selectedProperty ? selectedProperty.name : t("fields.selectProperty")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("fields.searchProperty")} />
                <CommandList>
                  <CommandEmpty>{t("fields.noPropertyFound")}</CommandEmpty>
                  <CommandGroup>
                    {properties.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => handlePropertySelect(String(p.id))}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPropertyId === String(p.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Code input */}
        <div className="space-y-2">
          <Label htmlFor="apt-code" className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {t("fields.code")}
          </Label>
          <Input
            id="apt-code"
            placeholder={t("placeholders.code")}
            value={code}
            onChange={handleCodeChange}
            disabled={isLoading}
            autoComplete="off"
          />
          {codeError ? (
            <p className="text-xs text-destructive">{codeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("fields.codeHint")}</p>
          )}
        </div>

        {/* Wohnfläche input */}
        <div className="space-y-2">
          <Label htmlFor="apt-wohnflaeche" className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            {t("fields.wohnflaeche")}
            <span className="text-muted-foreground font-normal text-xs">({t("optional", { defaultValue: "optional" })})</span>
          </Label>
          <Input
            id="apt-wohnflaeche"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={t("placeholders.wohnflaeche", { defaultValue: "e.g. 65.5" })}
            value={wohnflaeche}
            onChange={onChangeWohnflaeche}
            disabled={isLoading}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">{t("fields.wohnflaecheHint", { defaultValue: "Living area in m². Used for Nebenkosten distribution." })}</p>
        </div>

        {/* Stromzählernummer (single) */}
        <div className="space-y-2">
          <Label htmlFor="apt-strom" className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            {t("fields.stromZaehlerNr", { defaultValue: "Stromzählernummer" })}
            <span className="text-muted-foreground font-normal text-xs">({t("optional", { defaultValue: "optional" })})</span>
          </Label>
          <Input
            id="apt-strom"
            value={stromZaehlerNr}
            onChange={(e) => onChangeStromZaehlerNr?.(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        {/* Wasserzählernummern (multiple) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Droplet className="h-3.5 w-3.5 text-muted-foreground" />
            {t("fields.wasserZaehlerNrn", { defaultValue: "Wasserzählernummern" })}
            <span className="text-muted-foreground font-normal text-xs">({t("optional", { defaultValue: "optional" })})</span>
          </Label>
          {wasserZaehlerNrn.map((nr, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={nr}
                onChange={(e) => {
                  const arr = [...wasserZaehlerNrn];
                  arr[i] = e.target.value;
                  onChangeWasserZaehlerNrn?.(arr);
                }}
                disabled={isLoading}
                autoComplete="off"
              />
              <Button
                type="button" variant="ghost" size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChangeWasserZaehlerNrn?.(wasserZaehlerNrn.filter((_, j) => j !== i))}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button" variant="outline" size="sm" className="h-8"
            onClick={() => onChangeWasserZaehlerNrn?.([...wasserZaehlerNrn, ""])}
            disabled={isLoading}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("fields.addWasserZaehler", { defaultValue: "Wasserzähler hinzufügen" })}
          </Button>
        </div>

        {/* Preview badge */}
        {selectedProperty && code.trim() && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("addPreview")}</p>
              <p className="text-sm font-medium truncate">
                {selectedProperty.name} · {code.trim()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="outline" onClick={onChangeAddApartmentDialogClose} disabled={isLoading}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
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
  );
}
