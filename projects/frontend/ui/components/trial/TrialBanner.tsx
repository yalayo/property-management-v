import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, Pause, Play, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

export type TrialInfo = {
  status: "active" | "paused" | "expired";
  "days-remaining": number;
  "started-at": number;
  paused: boolean;
  history?: Array<{ type: string; ts: number }>;
};

type Props = {
  trialInfo: TrialInfo;
  onPause?: () => void;
  onResume?: () => void;
};

export default function TrialBanner({ trialInfo, onPause, onResume }: Props) {
  const { t } = useTranslation("trial");

  if (!trialInfo) return null;

  const { status } = trialInfo;
  const daysRemaining = trialInfo["days-remaining"] ?? 0;
  const daysDisplay = Math.ceil(daysRemaining);

  if (status === "expired") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 flex-1">{t("expired")}</p>
      </div>
    );
  }

  const isActive = status === "active";
  const isPaused = status === "paused";

  return (
    <div className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 ${
      isPaused
        ? "border-slate-200 bg-slate-50"
        : "border-blue-200 bg-blue-50"
    }`}>
      <Clock className={`h-4 w-4 flex-shrink-0 ${isPaused ? "text-slate-500" : "text-blue-600"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isPaused ? "text-slate-700" : "text-blue-800"}`}>
          {isPaused ? t("paused") : t("active", { days: daysDisplay })}
        </p>
        {isPaused && (
          <p className="text-xs text-slate-500 mt-0.5">
            {t("pausedNote", { days: daysDisplay })}
          </p>
        )}
      </div>
      {isActive && onPause && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
          onClick={onPause}
        >
          <Pause className="h-3 w-3 mr-1" />
          {t("pause")}
        </Button>
      )}
      {isPaused && onResume && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
          onClick={onResume}
        >
          <Play className="h-3 w-3 mr-1" />
          {t("resume")}
        </Button>
      )}
    </div>
  );
}
