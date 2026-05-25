import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Home } from "lucide-react";

export default function Footer() {
  const { t } = useTranslation("footer");
  const { t: tCommon } = useTranslation("common");

  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/80 flex items-center justify-center flex-shrink-0">
              <Home className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-300 tracking-tight">
              {tCommon("appName")}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-1">
            {[
              { key: "about",           href: "#"                  },
              { key: "featuresPricing", href: "/features-pricing"  },
              { key: "faq",             href: "#"                  },
              { key: "contact",         href: "#"                  },
            ].map(({ key, href }) => (
              <a
                key={key}
                href={href}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t(key)}
              </a>
            ))}
          </nav>

          {/* Language + copyright */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-slate-600 text-center">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
