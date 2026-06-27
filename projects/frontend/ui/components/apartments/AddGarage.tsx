import React, { useState } from "react";
import { Loader2, ChevronsUpDown, Check, Building2, Hash, Ruler } from "lucide-react";
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
  properties?: Property[];
  isLoading?: boolean;
  code?: string;
  flaeche?: string;
  onClose?: () => void;
  onChangeCode?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeProperty?: (value: string) => void;
  onChangeFlaeche?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
};

export default function AddGarage({
  properties = [],
  isLoading = false,
  code = "",
  flaeche = "",
  onClose,
  onChangeCode,
  onChangeProperty,
  onChangeFlaeche,
  onSubmit,
}: Props) {
  const { t: tCommon } = useTranslation("common");

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const selectedProperty = properties.find((p) => String(p.id) === selectedPropertyId);

  const handlePropertySelect = (id: string) => {
    setSelectedPropertyId(id);
    setPropertyOpen(false);
    onChangeProperty?.(id);
  };

  const canSubmit = !!selectedPropertyId && !!code.trim() && !isLoading;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">{"Garage hinzufügen"}</DialogTitle>
        <DialogDescription>{"Neue Garage für ein Objekt anlegen."}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Property picker */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {"Objekt"}
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
                  {selectedProperty ? selectedProperty.name : "Objekt auswählen"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder={"Objekt suchen …"} />
                <CommandList>
                  <CommandEmpty>{"Kein Objekt gefunden."}</CommandEmpty>
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
          <Label htmlFor="garage-code-new" className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {"Bezeichnung"}
          </Label>
          <Input
            id="garage-code-new"
            placeholder={"z. B. G-01"}
            value={code}
            onChange={onChangeCode}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        {/* Fläche input */}
        <div className="space-y-2">
          <Label htmlFor="garage-flaeche-new" className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            {"Fläche (m²)"}
            <span className="text-muted-foreground font-normal text-xs">
              ({tCommon("optional", { defaultValue: "optional" })})
            </span>
          </Label>
          <Input
            id="garage-flaeche-new"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={"z. B. 15"}
            value={flaeche}
            onChange={onChangeFlaeche}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>

        {selectedProperty && code.trim() && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{"Vorschau"}</p>
              <p className="text-sm font-medium truncate">
                {selectedProperty.name} · {code.trim()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            "Garage hinzufügen"
          )}
        </Button>
      </div>
    </div>
  );
}
