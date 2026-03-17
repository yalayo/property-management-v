import React from "react";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation("landing");

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">{t("dashboard.sectionLabel")}</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {t("dashboard.title")}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="mt-10">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden p-6">
            <div className="h-64 md:h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  className="h-24 w-24 mx-auto opacity-25"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-900">{t("dashboard.interactiveTitle")}</p>
                <p className="mt-2 text-sm text-gray-500">{t("dashboard.interactiveDesc")}</p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h4 className="font-medium text-primary-900">{t("dashboard.cards.propertyOverview")}</h4>
                <p className="mt-1 text-sm text-gray-500">{t("dashboard.cards.propertyOverviewDesc")}</p>
              </div>

              <div className="bg-primary-50 p-4 rounded-lg">
                <h4 className="font-medium text-primary-900">{t("dashboard.cards.financialTracking")}</h4>
                <p className="mt-1 text-sm text-gray-500">{t("dashboard.cards.financialTrackingDesc")}</p>
              </div>

              <div className="bg-primary-50 p-4 rounded-lg">
                <h4 className="font-medium text-primary-900">{t("dashboard.cards.tenantManagement")}</h4>
                <p className="mt-1 text-sm text-gray-500">{t("dashboard.cards.tenantManagementDesc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
