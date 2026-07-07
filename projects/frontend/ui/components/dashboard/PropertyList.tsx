import React from "react";
import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination";

const PAGE_SIZE = 9;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

type PropertyFormValues = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  units: string;
  acquisitionDate?: string;
  purchasePrice?: string;
  currentValue?: string;
  landValue?: string;
  buildingValue?: string;
  ownershipShare?: string;
  livingAreaM2?: string;
  rentalAreaM2?: string;
  yearBuilt?: string;
  usage?: string;
};

type Props = {
  properties?: any[];
  apartments?: any[];
  isSaving?: boolean;
  isReadOnly?: boolean;
  saveError?: string | null;
  justSaved?: boolean;
  onAddProperty?: (data: any) => void;
  onEditProperty?: (id: number, data: any) => void;
  onDeleteProperty?: (id: number) => void;
  onViewApartments?: (property: any) => void;
  onSelectProperty?: (property: any) => void;
  onGoBack?: () => void;
  navContext?: { propertyId?: string; nonce?: number } | null;
};

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1 border-t">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function PropertyForm({ form, onSubmit, isSaving, onCancel, submitLabel }: {
  form: any;
  onSubmit: (data: PropertyFormValues) => void;
  isSaving: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { t } = useTranslation("properties");
  const { t: tCommon } = useTranslation("common");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.name")}</FormLabel>
            <FormControl><Input placeholder={t("placeholders.name")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.address")}</FormLabel>
            <FormControl><Input placeholder={t("placeholders.address")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.city")}</FormLabel>
              <FormControl><Input placeholder={t("placeholders.city")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="postalCode" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.postalCode")}</FormLabel>
              <FormControl><Input placeholder={t("placeholders.postalCode")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="units" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.units")}</FormLabel>
            <FormControl><Input type="number" min="1" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <SectionHeading label={t("sections.financial")} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="acquisitionDate" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.acquisitionDate")}</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="purchasePrice" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.purchasePrice")}</FormLabel>
              <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="landValue" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.landValue")}</FormLabel>
              <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="buildingValue" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.buildingValue")}</FormLabel>
              <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="currentValue" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.currentValue")}</FormLabel>
            <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <SectionHeading label={t("sections.propertyDetails")} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="yearBuilt" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.yearBuilt")}</FormLabel>
              <FormControl><Input type="number" placeholder="e.g. 1998" min="1800" max="2099" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ownershipShare" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.ownershipShare")}</FormLabel>
              <FormControl><Input type="number" placeholder="e.g. 100" min="0" max="100" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="livingAreaM2" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.livingAreaM2")}</FormLabel>
              <FormControl><Input type="number" placeholder="m²" min="0" step="0.1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="rentalAreaM2" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.rentalAreaM2")}</FormLabel>
              <FormControl><Input type="number" placeholder="m²" min="0" step="0.1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="usage" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.usage")}</FormLabel>
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder={t("placeholders.usage")} /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="full-rental">{t("usage.fullRental")}</SelectItem>
                <SelectItem value="partial-rental">{t("usage.partialRental")}</SelectItem>
                <SelectItem value="owner-occupied">{t("usage.ownerOccupied")}</SelectItem>
                <SelectItem value="mixed">{t("usage.mixed")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>{tCommon("cancel")}</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? tCommon("saving") : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

const emptyDefaults: PropertyFormValues = {
  name: "", address: "", city: "", postalCode: "", units: "1",
  acquisitionDate: "", purchasePrice: "", currentValue: "",
  landValue: "", buildingValue: "", ownershipShare: "",
  livingAreaM2: "", rentalAreaM2: "", yearBuilt: "", usage: "",
};

function parseNum(val?: string) { return val ? parseFloat(val) : undefined; }
function parseInt10(val?: string) { return val ? parseInt(val, 10) : undefined; }

export default function PropertyList({ properties = [], apartments = [], isSaving = false, isReadOnly = false, saveError, justSaved, onAddProperty, onEditProperty, onDeleteProperty, onViewApartments, onSelectProperty, onGoBack, navContext }: Props) {
  const { t } = useTranslation("properties");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [filterText, setFilterText] = useState("");

  const prevSaveError = useRef<string | null | undefined>(saveError);
  const prevJustSaved = useRef<boolean | undefined>(justSaved);

  useEffect(() => {
    if (saveError && saveError !== prevSaveError.current) {
      const desc = saveError === "duplicate-name"
        ? t("validation.nameTaken")
        : saveError === "trial-expired"
        ? tCommon("trialExpired", { defaultValue: "Your trial has expired." })
        : tCommon("saveFailed", { defaultValue: "Failed to save. Please try again." });
      toast({ title: tCommon("error", { defaultValue: "Error" }), description: desc, variant: "destructive" });
    }
    prevSaveError.current = saveError;
  }, [saveError]);

  useEffect(() => {
    if (justSaved && justSaved !== prevJustSaved.current) {
      toast({ title: tCommon("saved") });
    }
    prevJustSaved.current = justSaved;
  }, [justSaved]);

  useEffect(() => { setPage(1); }, [properties, filterText]);

  // Auto-open edit dialog when navigated from the task widget
  useEffect(() => {
    if (!navContext?.nonce || !navContext.propertyId) return;
    const prop = properties.find((p: any) => String(p.id) === navContext.propertyId);
    if (prop) handleOpenEdit(prop);
  }, [navContext?.nonce]);

  const filteredProperties = filterText
    ? properties.filter((p: any) => {
        const q = filterText.toLowerCase();
        return p.name?.toLowerCase().includes(q) ||
               p.address?.toLowerCase().includes(q) ||
               p.city?.toLowerCase().includes(q);
      })
    : properties;

  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const pagedProperties = filteredProperties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const propertyFormSchema = z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    address: z.string().min(1, t("validation.addressRequired")),
    city: z.string().min(1, t("validation.cityRequired")),
    postalCode: z.string().min(5, t("validation.postalCodeRequired")),
    units: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, t("validation.unitsInvalid")),
    acquisitionDate: z.string().optional(),
    purchasePrice: z.string().optional().transform(parseNum),
    currentValue: z.string().optional().transform(parseNum),
    landValue: z.string().optional().transform(parseNum),
    buildingValue: z.string().optional().transform(parseNum),
    ownershipShare: z.string().optional().transform(val => val ? parseFloat(val) / 100 : undefined),
    livingAreaM2: z.string().optional().transform(parseNum),
    rentalAreaM2: z.string().optional().transform(parseNum),
    yearBuilt: z.string().optional().transform(parseInt10),
    usage: z.string().optional(),
  });

  const addForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });
  const editForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });

  const handleAdd = (data: PropertyFormValues) => {
    const nameTaken = properties.some(p => p.name?.toLowerCase() === (data.name as string).toLowerCase());
    if (nameTaken) {
      addForm.setError("name", { message: t("validation.nameTaken") });
      return;
    }
    if (onAddProperty) {
      onAddProperty(data);
    } else {
      toast({ title: tCommon("comingSoon"), description: "Property management is being connected." });
    }
    setIsAddOpen(false);
    addForm.reset();
  };

  const handleOpenEdit = (property: any) => {
    setEditingProperty(property);
    const ownershipRaw = property["ownership-share"] ?? property.ownershipShare;
    editForm.reset({
      name: property.name || "",
      address: property.address || "",
      city: property.city || "",
      postalCode: property["postal-code"] || property.postal_code || property.postalCode || "",
      units: String(property.units || 1),
      acquisitionDate: property["acquisition-date"] || property.acquisitionDate || "",
      purchasePrice: property["purchase-price"] != null ? String(property["purchase-price"]) : "",
      currentValue: property["current-value"] != null ? String(property["current-value"]) : "",
      landValue: property["land-value"] != null ? String(property["land-value"]) : "",
      buildingValue: property["building-value"] != null ? String(property["building-value"]) : "",
      ownershipShare: ownershipRaw != null ? String(parseFloat(String(ownershipRaw)) * 100) : "",
      livingAreaM2: property["living-area-m2"] != null ? String(property["living-area-m2"]) : "",
      rentalAreaM2: property["rental-area-m2"] != null ? String(property["rental-area-m2"]) : "",
      yearBuilt: property["year-built"] != null ? String(property["year-built"]) : "",
      usage: property.usage || "",
    });
  };

  const handleEdit = (data: PropertyFormValues) => {
    const nameTaken = properties.some(
      p => p.id !== editingProperty?.id && p.name?.toLowerCase() === (data.name as string).toLowerCase()
    );
    if (nameTaken) {
      editForm.setError("name", { message: t("validation.nameTaken") });
      return;
    }
    if (onEditProperty && editingProperty) {
      const orig = editingProperty;
      const origPostal = orig["postal-code"] ?? orig.postal_code ?? orig.postalCode ?? "";
      const origOwnership = orig["ownership-share"] ?? orig.ownershipShare ?? null;
      const eqOpt = (a: any, b: any) => (a ?? null) === (b ?? null);

      const changes: Record<string, any> = {};
      if (String(data.name)       !== String(orig.name    ?? ""))  changes.name       = data.name;
      if (String(data.address)    !== String(orig.address  ?? ""))  changes.address    = data.address;
      if (String(data.city)       !== String(orig.city     ?? ""))  changes.city       = data.city;
      if (String(data.postalCode) !== String(origPostal))           changes.postalCode = data.postalCode;
      if ((data.units as number)  !== (orig.units ?? 1))            changes.units      = data.units;

      const origAcq = orig["acquisition-date"] ?? orig.acquisitionDate ?? null;
      if ((data.acquisitionDate || null) !== origAcq)               changes.acquisitionDate = data.acquisitionDate;
      if (!eqOpt(data.purchasePrice,  orig["purchase-price"]))      changes.purchasePrice   = data.purchasePrice;
      if (!eqOpt(data.currentValue,   orig["current-value"]))       changes.currentValue    = data.currentValue;
      if (!eqOpt(data.landValue,      orig["land-value"]))          changes.landValue       = data.landValue;
      if (!eqOpt(data.buildingValue,  orig["building-value"]))      changes.buildingValue   = data.buildingValue;
      if (!eqOpt(data.ownershipShare, origOwnership))               changes.ownershipShare  = data.ownershipShare;
      if (!eqOpt(data.livingAreaM2,   orig["living-area-m2"]))      changes.livingAreaM2    = data.livingAreaM2;
      if (!eqOpt(data.rentalAreaM2,   orig["rental-area-m2"]))      changes.rentalAreaM2    = data.rentalAreaM2;
      if (!eqOpt(data.yearBuilt,      orig["year-built"]))          changes.yearBuilt       = data.yearBuilt;
      if ((data.usage || null) !== (orig.usage ?? null))            changes.usage           = data.usage;

      if (Object.keys(changes).length > 0) {
        onEditProperty(editingProperty.id, changes);
      }
    }
    setEditingProperty(null);
    editForm.reset();
  };

  const handleDelete = () => {
    if (onDeleteProperty && deletingProperty) {
      onDeleteProperty(deletingProperty.id);
      toast({ title: tCommon("deleted") });
    }
    setDeletingProperty(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {onGoBack && (
            <Button variant="ghost" size="sm" onClick={onGoBack}>{tCommon("back")}</Button>
          )}
          <CardTitle>{t("title", { count: properties.length })}</CardTitle>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={isReadOnly}><Plus className="h-4 w-4 mr-2" />{t("addProperty")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("addNew")}</DialogTitle></DialogHeader>
            <PropertyForm form={addForm} onSubmit={handleAdd} isSaving={isSaving} onCancel={() => setIsAddOpen(false)} submitLabel={t("saveProperty")} />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={tCommon("search")}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8"
          />
        </div>
        {properties.length > 0 ? (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedProperties.map((property: any) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <button
                        className="font-semibold text-lg hover:underline text-left"
                        onClick={() => onSelectProperty?.(property)}
                      >
                        {property.name}
                      </button>
                      <p className="text-sm text-gray-500 mt-1">{property.address}</p>
                      <p className="text-sm text-gray-500">{property.city}, {property["postal-code"] || property.postal_code || property.postalCode}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" disabled={isReadOnly} onClick={() => handleOpenEdit(property)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={isReadOnly} onClick={() => setDeletingProperty(property)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span>{t("units", { count: property.units })}</span>
                    {(property["current-value"] || property.current_value || property.currentValue) && (
                      <span className="font-medium">€{(property["current-value"] || property.current_value || property.currentValue).toLocaleString()}</span>
                    )}
                  </div>
                  {(() => {
                    const propApts = apartments.filter((a: any) => a["property-id"] === property.id);
                    if (propApts.length === 0) return null;
                    const occupied = propApts.filter((a: any) => a.occupied).length;
                    const pct = Math.round((occupied / propApts.length) * 100);
                    return (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{t("occupancy")}: {occupied}/{propApts.length}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  {property["year-built"] && (
                    <p className="mt-2 text-xs text-muted-foreground">{t("builtIn", { year: property["year-built"] })}</p>
                  )}

                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`el-${i}`}><PaginationEllipsis /></PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p as number); }}>{p}</PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} aria-disabled={page === totalPages} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          </>
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">{t("noProperties")}</p>
            <Button className="mt-4" disabled={isReadOnly} onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />{t("addFirst")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editingProperty} onOpenChange={(open) => { if (!open) setEditingProperty(null); }}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("editProperty")}</DialogTitle></DialogHeader>
          <PropertyForm form={editForm} onSubmit={handleEdit} isSaving={isSaving} onCancel={() => setEditingProperty(null)} submitLabel={t("saveChanges")} />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingProperty} onOpenChange={(open) => { if (!open) setDeletingProperty(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("deleteProperty")}</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            {t("deleteConfirm", { name: deletingProperty?.name })}
          </p>
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setDeletingProperty(null)}>{tCommon("cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? tCommon("deleting") : t("deleteProperty")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
