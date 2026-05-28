import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";

type AssignFormValues = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  startDate?: string;
};

type Props = {
  apartmentCode?: string;
  isLoading?: boolean;
  assignError?: string;
  onClose?: () => void;
  onSubmit?: (data: AssignFormValues) => void;
};

export default function AssignTenant({
  apartmentCode,
  isLoading = false,
  assignError,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation("apartments");
  const { t: tTenants } = useTranslation("tenants");
  const { t: tCommon } = useTranslation("common");

  const errorMessage = assignError === "date-overlap"
    ? tTenants("validation.dateOverlap")
    : assignError
    ? tTenants("validation.saveFailed")
    : undefined;

  const assignSchema = z.object({
    firstName: z.string().min(1, tTenants("validation.firstNameRequired")),
    lastName: z.string().optional(),
    email: z.union([z.string().email(tTenants("validation.emailInvalid")), z.literal("")]).optional(),
    phone: z.string().optional(),
    startDate: z.string().optional(),
  });

  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", startDate: "" },
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
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>{tTenants("fields.firstName")}</FormLabel>
                <FormControl>
                  <Input placeholder={tTenants("placeholders.firstName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>{tTenants("fields.lastName")}</FormLabel>
                <FormControl>
                  <Input placeholder={tTenants("placeholders.lastName")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

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

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

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
