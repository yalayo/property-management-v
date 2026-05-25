import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "../ui/button";

interface BottomCTAProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
  trackCTA?: (button: string, section: string) => void;
}

export default function BottomCTA({ onSignUp, onSignIn, trackCTA }: BottomCTAProps) {
  const { t } = useTranslation("landing");

  return (
    <section
      data-section="bottom-cta"
      className="py-20 sm:py-24"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #312e81 100%)" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
          {t("bottomCTA.title")}
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          {t("bottomCTA.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onSignUp && (
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-white/90 font-semibold rounded-xl h-12 px-7"
              onClick={() => {
                trackCTA?.("bottom_cta_primary", "bottom_cta");
                onSignUp();
              }}
            >
              {t("bottomCTA.primary")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {onSignIn && (
            <Button
              size="lg"
              className="bg-transparent border border-white/20 text-slate-300 hover:bg-white/10 hover:text-white font-semibold rounded-xl h-12 px-7"
              onClick={() => {
                trackCTA?.("bottom_cta_signin", "bottom_cta");
                onSignIn();
              }}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {t("bottomCTA.secondary")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
