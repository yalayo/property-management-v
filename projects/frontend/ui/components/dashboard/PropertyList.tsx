import React from "react";
import { useState } from "react";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

type PropertyFormValues = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  units: string;
  purchasePrice?: string;
  currentValue?: string;
};

type Props = {
  properties?: any[];
  isSaving?: boolean;
  onAddProperty?: (data: any) => void;
  onEditProperty?: (id: number, data: any) => void;
  onDeleteProperty?: (id: number) => void;
  onViewApartments?: (property: any) => void;
  onGoBack?: () => void;
};

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="purchasePrice" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.purchasePrice")}</FormLabel>
              <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="currentValue" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.currentValue")}</FormLabel>
              <FormControl><Input type="number" placeholder={t("placeholders.optional")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
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

const emptyDefaults = {
  name: "", address: "", city: "", postalCode: "", units: "1", purchasePrice: "", currentValue: "",
};

export default function PropertyList({ properties = [], isSaving = false, onAddProperty, onEditProperty, onDeleteProperty, onViewApartments, onGoBack }: Props) {
  const { t } = useTranslation("properties");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<any | null>(null);

  const propertyFormSchema = z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    address: z.string().min(1, t("validation.addressRequired")),
    city: z.string().min(1, t("validation.cityRequired")),
    postalCode: z.string().min(5, t("validation.postalCodeRequired")),
    units: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, t("validation.unitsInvalid")),
    purchasePrice: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
    currentValue: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  });

  const addForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });
  const editForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });

  const handleAdd = (data: PropertyFormValues) => {
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
    editForm.reset({
      name: property.name || "",
      address: property.address || "",
      city: property.city || "",
      postalCode: property.postal_code || property.postalCode || "",
      units: String(property.units || 1),
      purchasePrice: property.purchase_price ? String(property.purchase_price) : "",
      currentValue: property.current_value ? String(property.current_value) : "",
    });
  };

  const handleEdit = (data: PropertyFormValues) => {
    if (onEditProperty && editingProperty) {
      onEditProperty(editingProperty.id, data);
    }
    setEditingProperty(null);
    editForm.reset();
  };

  const handleDelete = () => {
    if (onDeleteProperty && deletingProperty) {
      onDeleteProperty(deletingProperty.id);
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
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />{t("addProperty")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("addNew")}</DialogTitle></DialogHeader>
            <PropertyForm form={addForm} onSubmit={handleAdd} isSaving={isSaving} onCancel={() => setIsAddOpen(false)} submitLabel={t("saveProperty")} />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {properties.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property: any) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{property.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{property.address}</p>
                      <p className="text-sm text-gray-500">{property.city}, {property.postal_code || property.postalCode}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(property)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingProperty(property)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span>{t("units", { count: property.units })}</span>
                    {(property.current_value || property.currentValue) && (
                      <span className="font-medium">€{(property.current_value || property.currentValue).toLocaleString()}</span>
                    )}
                  </div>
                  {onViewApartments && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => onViewApartments(property)}
                    >
                      <Building2 className="h-3.5 w-3.5 mr-1.5" />
                      {t("viewApartments")}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">{t("noProperties")}</p>
            <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />{t("addFirst")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editingProperty} onOpenChange={(open) => { if (!open) setEditingProperty(null); }}>
        <DialogContent>
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
