import React from "react";
import { useTranslation } from "react-i18next";
import { Users, CreditCard, MessageSquare, BarChart3 } from "lucide-react";

const ITEMS = [
  { key: "tenants", Icon: Users, color: "bg-blue-50 text-blue-600" },
  { key: "payments", Icon: CreditCard, color: "bg-emerald-50 text-emerald-600" },
  { key: "comms", Icon: MessageSquare, color: "bg-purple-50 text-purple-600" },
  { key: "reports", Icon: BarChart3, color: "bg-amber-50 text-amber-600" },
];

export default function WhatWeHandle() {
  const { t } = useTranslation("landing");

  return (
    <section data-section="what-we-handle" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("whatWeHandle.sectionLabel")}
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
            {t("whatWeHandle.title")}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t("whatWeHandle.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
          {ITEMS.map(({ key, Icon, color }) => (
            <div
              key={key}
              className="flex flex-col items-start p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-xl ${color} mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                {t(`whatWeHandle.items.${key}.title`)}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t(`whatWeHandle.items.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
