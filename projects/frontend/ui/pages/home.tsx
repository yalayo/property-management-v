import React from "react";
import { useTranslation } from "react-i18next";
import Footer from "../components/landing/Footer";
import { Button } from "../components/ui/button";
import { Home as HomeIcon, LogIn, UserPlus } from "lucide-react";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function Home(props) {
  const { t } = useTranslation("home");
  const { t: tCommon } = useTranslation("common");
  const onSignIn = props.onSignIn;
  const onSignUp = props.onSignUp;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-primary/10 rounded-md p-1.5">
                <HomeIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="ml-2 text-xl font-bold text-slate-800">{tCommon("appName")}</span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {onSignIn && (
                <Button variant="outline" size="sm" onClick={onSignIn}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("signIn")}
                </Button>
              )}
              {onSignUp && (
                <Button size="sm" onClick={onSignUp}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("createAccount")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-8 pb-16">
        {props.children}
      </main>

      <Footer />
    </div>
  );
}
