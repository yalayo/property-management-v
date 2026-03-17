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
    <section data-section="bottom-cta" className="py-20 bg-gradient-to-r from-indigo-600 via-primary to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          {t("bottomCTA.title")}
        </h2>
        <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto">
          {t("bottomCTA.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onSignUp && (
            <Button
              size="lg"
              variant="secondary"
              className="font-semibold"
              onClick={() => {
                trackCTA?.("bottom_cta_primary", "bottom_cta");
                onSignUp();
              }}
            >
              {t("bottomCTA.primary")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          {onSignIn && (
            <Button
              size="lg"
              className="font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/30"
              onClick={() => {
                trackCTA?.("bottom_cta_signin", "bottom_cta");
                onSignIn();
              }}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {t("bottomCTA.secondary")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
