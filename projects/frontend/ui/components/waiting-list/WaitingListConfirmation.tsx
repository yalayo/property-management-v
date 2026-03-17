import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Gift, ArrowRight } from "lucide-react";

interface WaitingListConfirmationProps {
  email: string | null;
  onSelectPlan?: (tierId: string) => void;
}

export default function WaitingListConfirmation({ email, onSelectPlan }: WaitingListConfirmationProps) {
  const { t } = useTranslation("landing");

  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">{t("waitingListConfirmation.title")}</CardTitle>
        <CardDescription className="text-base">
          {t("waitingListConfirmation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-slate-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-slate-900">{t("waitingListConfirmation.whatNext")}</h3>
              <ul className="mt-2 text-sm text-slate-600 space-y-2">
                <li>{t("waitingListConfirmation.next1")}</li>
                <li>{t("waitingListConfirmation.next2")}</li>
                <li>
                  {email
                    ? t("waitingListConfirmation.next3Email", { email })
                    : t("waitingListConfirmation.next3NoEmail")}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Support Our Development option */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-lg border border-indigo-100">
          <div className="flex items-start">
            <div className="shrink-0">
              <div className="bg-indigo-100 rounded-full p-2 mr-3">
                <Gift className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{t("waitingListConfirmation.supportTitle")}</h3>
              <p className="mt-1 text-sm text-slate-600 mb-3">
                {t("waitingListConfirmation.supportDesc")}
              </p>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => onSelectPlan?.("crowdfunding")}>
                {t("waitingListConfirmation.supportNow")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 text-center">
          <p>{t("waitingListConfirmation.noWait")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
