import React from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type TenantFormValues = {
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  apartmentId?: string;
};

type Apartment = { id: number; code: string };

type Props = {
  apartments?: Apartment[];
  tenants?: any[];
  isLoading?: boolean;
  onClose?: () => void;
  onSubmit?: (data: TenantFormValues) => void;
};

export default function AddTenant({
  apartments = [],
  tenants = [],
  isLoading = false,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation("tenants");
  const { t: tCommon } = useTranslation("common");
  const { toast } = useToast();

  const tenantSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().min(1, t("validation.lastNameRequired")),
    email: z.union([z.string().email(t("validation.emailInvalid")), z.literal("")]).optional(),
    phone: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    apartmentId: z.string().optional(),
  });

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", startDate: "", endDate: "", apartmentId: "" },
  });

  const handleSubmit = (data: TenantFormValues) => {
    const fullName = `${data.firstName || ""} ${data.lastName}`.trim().toLowerCase();
    const nameTaken = tenants.some((ten) => {
      const tenFull = `${ten["first-name"] || ""} ${ten["last-name"] || ""}`.trim().toLowerCase();
      return tenFull === fullName;
    });
    if (nameTaken) {
      form.setError("lastName", { message: t("validation.nameTaken") });
      return;
    }
    onSubmit?.(data);
    toast({ title: tCommon("saved") });
    form.reset();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("addTenant")}</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.firstName")}{" "}
                  <span className="text-muted-foreground font-normal">({tCommon("optional")})</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t("placeholders.firstName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.lastName")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("placeholders.lastName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("placeholders.email")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.phone")}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={t("placeholders.phone")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.startDate")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("fields.endDate")}{" "}
                <span className="text-muted-foreground font-normal">({tCommon("optional")})</span>
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="apartmentId" render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("fields.apartment")}{" "}
                <span className="text-muted-foreground">({tCommon("optional")})</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("fields.noApartment")} />
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
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                t("addTenant")
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
