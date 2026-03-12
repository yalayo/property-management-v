import React from "react";
import { useState } from "react";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

const propertyFormSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(5, "Valid postal code is required"),
  units: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, "Must be a valid number"),
  purchasePrice: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  currentValue: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

type Props = {
  properties?: any[];
  isSaving?: boolean;
  onAddProperty?: (data: PropertyFormValues) => void;
  onEditProperty?: (id: number, data: PropertyFormValues) => void;
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
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Property Name</FormLabel>
            <FormControl><Input placeholder="E.g., Riverside Apartment" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl><Input placeholder="Street address" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl><Input placeholder="City" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="postalCode" render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
              <FormControl><Input placeholder="Postal code" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="units" render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Units</FormLabel>
            <FormControl><Input type="number" min="1" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="purchasePrice" render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Price (€)</FormLabel>
              <FormControl><Input type="number" placeholder="Optional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="currentValue" render={({ field }) => (
            <FormItem>
              <FormLabel>Current Value (€)</FormLabel>
              <FormControl><Input type="number" placeholder="Optional" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : submitLabel}
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
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<any | null>(null);

  const addForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });
  const editForm = useForm<PropertyFormValues>({ resolver: zodResolver(propertyFormSchema), defaultValues: emptyDefaults });

  const handleAdd = (data: PropertyFormValues) => {
    if (onAddProperty) {
      onAddProperty(data);
    } else {
      toast({ title: "Coming soon", description: "Property management is being connected." });
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
            <Button variant="ghost" size="sm" onClick={onGoBack}>← Back</Button>
          )}
          <CardTitle>Properties ({properties.length})</CardTitle>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Property</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Property</DialogTitle></DialogHeader>
            <PropertyForm form={addForm} onSubmit={handleAdd} isSaving={isSaving} onCancel={() => setIsAddOpen(false)} submitLabel="Save Property" />
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
                    <span>Units: {property.units}</span>
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
                      View Apartments
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">No properties found. Add your first property to get started.</p>
            <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Your First Property
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editingProperty} onOpenChange={(open) => { if (!open) setEditingProperty(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Property</DialogTitle></DialogHeader>
          <PropertyForm form={editForm} onSubmit={handleEdit} isSaving={isSaving} onCancel={() => setEditingProperty(null)} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingProperty} onOpenChange={(open) => { if (!open) setDeletingProperty(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Property</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            Are you sure you want to delete <span className="font-semibold">{deletingProperty?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setDeletingProperty(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? "Deleting..." : "Delete Property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
