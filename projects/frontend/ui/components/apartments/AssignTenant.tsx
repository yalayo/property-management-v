import React from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

type AssignFormValues = {
  name: string;
  email?: string;
  phone?: string;
  startDate?: string;
};

type Props = {
  apartmentCode?: string;
  isLoading?: boolean;
  onClose?: () => void;
  onSubmit?: (data: AssignFormValues) => void;
};

export default function AssignTenant({
  apartmentCode,
  isLoading = false,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tTenants } = useTranslation("tenants");
  const { t: tCommon } = useTranslation("common");

  const assignSchema = z.object({
    name: z.string().min(1, tTenants("validation.nameRequired")),
    email: z.union([z.string().email(tTenants("validation.emailInvalid")), z.literal("")]).optional(),
    phone: z.string().optional(),
    startDate: z.string().optional(),
  });

  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { name: "", email: "", phone: "", startDate: "" },
  });

  const handleSubmit = (data: AssignFormValues) => {
    onSubmit?.(data);
    form.reset();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {apartmentCode
            ? t("assignTenantTitle", { code: apartmentCode })
            : t("assignTenant")}
        </DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>{tTenants("fields.name")}</FormLabel>
              <FormControl>
                <Input placeholder={tTenants("placeholders.name")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>{tTenants("fields.email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={tTenants("placeholders.email")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>{tTenants("fields.phone")}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder={tTenants("placeholders.phone")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>{tTenants("fields.startDate")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
                  {t("assigning")}
                </>
              ) : (
                t("assignTenant")
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
