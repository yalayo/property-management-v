import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Loader2, ShieldCheck } from "lucide-react";

type PasswordChangeFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePassword(props) {
  const { user } = props;
  const { t } = useTranslation("changePassword");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!user) {
    return <Redirect to="/login" />;
  }

  const passwordChangeSchema = z
    .object({
      currentPassword: z.string().min(1, t("validation.currentRequired")),
      newPassword: z
        .string()
        .min(8, t("validation.newMin"))
        .regex(/[a-z]/, t("validation.lowercase"))
        .regex(/[A-Z]/, t("validation.uppercase"))
        .regex(/[0-9]/, t("validation.number")),
      confirmPassword: z.string().min(1, t("validation.confirmRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.noMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: PasswordChangeFormValues) => {
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t("failed"));
      }

      toast({
        title: t("success"),
        description: t("successDesc"),
      });

      if (user.isAdmin) {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: t("failed"),
        description: error instanceof Error ? error.message : t("failed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">{t("title")}</CardTitle>
            <CardDescription className="text-center">
              {user.passwordChangeRequired ? t("subtitleRequired") : t("subtitle")}
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("currentPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("placeholders.current")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("newPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("placeholders.new")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("placeholders.confirm")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
