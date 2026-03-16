import React from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../lib/i18n";

const LANGUAGES = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
] as const;

export default function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation();
  const current = i18nInstance.language;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("i18n-locale", lang);
  };

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {LANGUAGES.map(({ code, label }, idx) => (
        <React.Fragment key={code}>
          {idx > 0 && <span className="text-slate-300">/</span>}
          <button
            onClick={() => changeLanguage(code)}
            className={
              current === code
                ? "text-primary font-semibold"
                : "text-slate-500 hover:text-slate-800 transition-colors"
            }
          >
            {label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
