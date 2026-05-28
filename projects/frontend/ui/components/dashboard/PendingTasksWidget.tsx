import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronRight, ChevronDown, ClipboardList } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskCategory = "steuer" | "nebenkosten";

type Task = {
  id: string;
  category: TaskCategory;
  type: string;
  propertyId: string;
  propertyName: string;
  aptCode?: string;
  aptId?: string;
  aptTab?: string;
  navigateTo: "properties" | "abrechnung" | "apartments" | "tax";
  priority: number;
};

type TasksResult = {
  tasks: Task[];
  totalChecks: number;
  passedChecks: number;
};

type NavContext = {
  propertyId?: string;
  aptId?: string;
  aptTab?: string;
};

type Props = {
  properties?: any[];
  apartments?: any[];
  tenants?: any[];
  allCosts?: any[];
  allAptCosts?: any[];
  allRentPayments?: any[];
  taxConfigs?: any[];
  loans?: any[];
  year?: number;
  isLoading?: boolean;
  onNavigate?: (tab: string, context?: NavContext) => void;
};

// ── Task computation ──────────────────────────────────────────────────────────

function computeTasks(
  { properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs }: Required<
    Pick<Props, "properties" | "apartments" | "tenants" | "allAptCosts" | "allRentPayments" | "taxConfigs">
  >,
  year: number
): TasksResult {
  const tasks: Task[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  function check(passing: boolean, task: Task) {
    totalChecks++;
    if (passing) passedChecks++;
    else tasks.push(task);
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31);

  for (const property of properties) {
    const propId   = String(property.id);
    const propName = property.name || propId;

    // ── Steuer checks ────────────────────────────────────────────────────────

    check(!!property["acquisition-date"], {
      id: `steuer-${propId}-acquisition-date`,
      category: "steuer",
      type: "missing-acquisition-date",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 20,
    });

    check(property["land-value"] != null, {
      id: `steuer-${propId}-land-value`,
      category: "steuer",
      type: "missing-land-value",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 21,
    });

    check(property["building-value"] != null, {
      id: `steuer-${propId}-building-value`,
      category: "steuer",
      type: "missing-building-value",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 22,
    });

    check(property["ownership-share"] != null, {
      id: `steuer-${propId}-ownership-share`,
      category: "steuer",
      type: "missing-ownership-share",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 23,
    });

    check(property["year-built"] != null, {
      id: `steuer-${propId}-year-built`,
      category: "steuer",
      type: "missing-year-built",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 24,
    });

    check(!!property.usage, {
      id: `steuer-${propId}-usage`,
      category: "steuer",
      type: "missing-usage",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 25,
    });

    const taxConfig = taxConfigs.find(c => String(c["property-id"]) === propId);
    const hasAfaConfig = !!(taxConfig && taxConfig["building-value"] != null);
    check(hasAfaConfig, {
      id: `steuer-${propId}-afa-config`,
      category: "steuer",
      type: "missing-afa-config",
      propertyId: propId, propertyName: propName,
      navigateTo: "tax", priority: 26,
    });

    // ── Nebenkosten: property-level ──────────────────────────────────────────

    check(!!property.iban, {
      id: `nk-${propId}-iban`,
      category: "nebenkosten",
      type: "missing-iban",
      propertyId: propId, propertyName: propName,
      navigateTo: "properties", priority: 10,
    });

    // ── Nebenkosten: per occupied apartment ──────────────────────────────────

    const propApts = apartments.filter(a => String(a["property-id"]) === propId);

    for (const apt of propApts) {
      const aptId   = String(apt.id);
      const aptCode = apt.code || aptId;

      // Tenant active in year?
      const hasTenantInYear = tenants.some(t => {
        if (String(t["apartment-id"]) !== aptId) return false;
        const start = t["start-date"] ? new Date(t["start-date"] + "T00:00:00") : null;
        const end   = t["end-date"]   ? new Date(t["end-date"]   + "T00:00:00") : null;
        return (!start || start <= yearEnd) && (!end || end >= yearStart);
      });

      if (!hasTenantInYear) continue;

      const hasRent = allRentPayments.some(
        p => String(p["apartment-id"]) === aptId && Number(p.year) === year
      );
      check(hasRent, {
        id: `nk-${aptId}-rent-${year}`,
        category: "nebenkosten",
        type: "missing-rent-payments",
        propertyId: propId, propertyName: propName, aptCode,
        aptId, aptTab: "rent",
        navigateTo: "apartments", priority: 11,
      } as Task & { navigateTo: any });

      const hasAptCosts = allAptCosts.some(
        c => String(c["apartment-id"]) === aptId && Number(c.year) === year
      );
      check(hasAptCosts, {
        id: `nk-${aptId}-aptcosts-${year}`,
        category: "nebenkosten",
        type: "missing-apt-costs",
        propertyId: propId, propertyName: propName, aptCode,
        aptId, aptTab: "costs",
        navigateTo: "apartments", priority: 12,
      } as Task & { navigateTo: any });
    }
  }

  return {
    tasks: tasks.sort((a, b) => a.priority - b.priority),
    totalChecks,
    passedChecks,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const VISIBLE_COUNT = 5;

export default function PendingTasksWidget({
  properties = [],
  apartments = [],
  tenants = [],
  allCosts = [],
  allAptCosts = [],
  allRentPayments = [],
  taxConfigs = [],
  loans = [],
  year,
  isLoading = false,
  onNavigate,
}: Props) {
  const { t } = useTranslation("tasks");
  const [showAll, setShowAll] = useState(false);

  const targetYear = year ?? new Date().getFullYear() - 1;

  const { tasks, totalChecks, passedChecks } = useMemo(
    () =>
      computeTasks(
        { properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs },
        targetYear
      ),
    [properties, apartments, tenants, allAptCosts, allRentPayments, taxConfigs, targetYear]
  );

  const progressPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
  const visibleTasks = showAll ? tasks : tasks.slice(0, VISIBLE_COUNT);

  const categoryColor: Record<TaskCategory, string> = {
    steuer:       "bg-blue-100 text-blue-700",
    nebenkosten:  "bg-amber-100 text-amber-700",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            {t("title")} {targetYear}
          </CardTitle>
          <span className="text-sm font-semibold tabular-nums">
            {progressPct}%
          </span>
        </div>
        <div className="mt-2 space-y-1">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {tasks.length === 0
              ? t("allDone")
              : t("progress", { done: passedChecks, total: totalChecks })}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && tasks.length === 0 ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-700">{t("allDone")}</p>
            <p className="text-xs text-muted-foreground">{t("allDoneDesc", { year: targetYear })}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryColor[task.category]}`}
                  >
                    {t(`categories.${task.category}`)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">
                      {t(`types.${task.type}`, {
                        property: task.propertyName,
                        apt: task.aptCode ?? "",
                        year: targetYear,
                      })}
                    </p>
                    {task.aptCode && (
                      <p className="text-xs text-muted-foreground truncate">
                        {task.propertyName} · {task.aptCode}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 px-2 gap-1 text-xs"
                  onClick={() => onNavigate?.(task.navigateTo, {
                    propertyId: task.propertyId,
                    aptId: task.aptId,
                    aptTab: task.aptTab,
                  })}
                >
                  {t("go")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {tasks.length > VISIBLE_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs text-muted-foreground"
                onClick={() => setShowAll(v => !v)}
              >
                {showAll ? (
                  t("showLess")
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    {t("showAll", { count: tasks.length - VISIBLE_COUNT })}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
