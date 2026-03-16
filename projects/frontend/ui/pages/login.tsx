import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Redirect } from "wouter";
import { Loader2, Home } from "lucide-react";

type LoginFormValues = {
  user: string;
  password: string;
};

export default function Login(props) {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
  const user = props.user;

  const loginSchema = z.object({
    user: z.string().email({ message: t("login.validation.emailInvalid") }),
    password: z.string().min(6, { message: t("login.validation.passwordMin") }),
  });

  if (user) {
    if (user.passwordChangeRequired) {
      return <Redirect to="/change-password" />;
    }
    return <Redirect to="/dashboard" />;
  }

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      user: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    props.onSubmit(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-background/90">
      {props.onGoHome && (
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center">
              <button
                type="button"
                onClick={props.onGoHome}
                className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                <span className="font-semibold">{tCommon("appName")}</span>
              </button>
            </div>
          </div>
        </header>
      )}
      <div className="flex flex-1">
        <div className="hidden md:flex md:w-1/2 bg-primary/10 flex-col justify-center items-center p-10">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t("login.hero.title")}
            </h1>
            <p className="text-muted-foreground mb-4">
              {t("login.hero.subtitle")}
            </p>
            <ul className="space-y-2">
              {(["payments", "documents", "maintenance", "accounting"] as const).map((key) => (
                <li key={key} className="flex items-center">
                  <div className="rounded-full bg-primary/20 w-6 h-6 flex items-center justify-center mr-2">✓</div>
                  <span>{t(`login.hero.features.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <Card className="w-[350px] sm:w-[400px] shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">{t("login.title")}</CardTitle>
              <CardDescription className="text-center">
                {t("login.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("login.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("login.password")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={props.isLoading}
                  >
                    {props.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("login.submitting")}
                      </>
                    ) : (
                      t("login.submit")
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                {t("login.noAccount")}{" "}
                <button
                  type="button"
                  onClick={props.showSignUp}
                  className="text-primary hover:underline font-medium"
                >
                  {t("login.registerLink")}
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
