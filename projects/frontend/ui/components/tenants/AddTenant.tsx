import React from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().optional(),
  startDate: z.string().optional(),
  apartmentId: z.string().optional(),
});

type TenantFormValues = z.infer<typeof tenantSchema>;

type Apartment = { id: number; code: string };

type Props = {
  apartments?: Apartment[];
  isLoading?: boolean;
  onClose?: () => void;
  onSubmit?: (data: TenantFormValues) => void;
};

export default function AddTenant({
  apartments = [],
  isLoading = false,
  onClose,
  onSubmit,
}: Props) {
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { name: "", email: "", phone: "", startDate: "", apartmentId: "" },
  });

  const handleSubmit = (data: TenantFormValues) => {
    onSubmit?.(data);
    form.reset();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Tenant</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Maria Schmidt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="tenant@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+49 123 456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="apartmentId" render={({ field }) => (
            <FormItem>
              <FormLabel>Apartment <span className="text-muted-foreground">(optional)</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No apartment assigned" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {apartments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
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
        </form>
      </Form>
    </>
  );
}
