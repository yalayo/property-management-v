import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Home, ArrowRight, CreditCard } from "lucide-react";
import WaitingListConfirmation from "../components/waiting-list/WaitingListConfirmation";

export default function WaitingList(props) {
  const email: string | null = props.email || null;
  const onViewPricing = props.onViewPricing;
  const onGoHome = props.onGoHome;
  const onSelectPlan = props.onSelectPlan;
  const { t } = useTranslation("waitingList");
  const { t: tCommon } = useTranslation("common");
  const { t: tFooter } = useTranslation("footer");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Modern header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex items-center cursor-pointer" onClick={onGoHome}>
                <div className="bg-primary/10 rounded-md p-1.5">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <span className="ml-2 text-xl font-bold text-slate-800">{tCommon("appName")}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with background pattern */}
      <main className="flex-grow">
        <div className="bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
            <div className="max-w-lg mx-auto">
              <WaitingListConfirmation email={email} onSelectPlan={onSelectPlan} />

              {/* Call to action buttons */}
              <div className="mt-10 space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    {t("readyToStart")}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {t("chooseFrom")}
                  </p>

                  <div className="space-y-3">
                    <Button className="w-full justify-between group" size="lg" onClick={onViewPricing}>
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>{t("viewPricing")}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>

                    <Button variant="outline" className="w-full justify-between group" size="lg" onClick={onGoHome}>
                      <div className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        <span>{t("returnHome")}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            {tFooter("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
