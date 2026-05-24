import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

type Props = {
  properties?: any[];
  apartments?: any[];
  tenants?: any[];
  allCosts?: any[];
  allAptCosts?: any[];
  allRentPayments?: any[];
};

const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const COLORS = ["#0088FE","#00C49F","#FFBB28","#FF8042","#8884D8","#82ca9d","#ffc658","#ff7300"];

function fmt(v: number) {
  return `€${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function UserAnalytics({
  properties = [],
  apartments = [],
  allCosts = [],
  allAptCosts = [],
  allRentPayments = [],
}: Props) {
  const { t } = useTranslation("analytics");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalRent = useMemo(
    () => allRentPayments.filter(p => Number(p.year) === year).reduce((s, p) => s + Number(p.value || 0), 0),
    [allRentPayments, year]
  );

  const totalPropertyCosts = useMemo(
    () => allCosts.filter(c => Number(c.year) === year).reduce((s, c) => s + Number(c.value || 0), 0),
    [allCosts, year]
  );

  const totalAptCosts = useMemo(
    () => allAptCosts.filter(c => Number(c.year) === year).reduce((s, c) => s + Number(c.value || 0), 0),
    [allAptCosts, year]
  );

  const totalExpenses = totalPropertyCosts + totalAptCosts;
  const netResult = totalRent - totalExpenses;

  const occupiedCount = apartments.filter(a => a.occupied).length;
  const occupancyPct = apartments.length > 0 ? Math.round((occupiedCount / apartments.length) * 100) : 0;

  const monthlyData = useMemo(() =>
    MONTH_KEYS.map((key, idx) => ({
      name: key,
      income: allRentPayments
        .filter(p => Number(p.year) === year && Number(p.month) === idx + 1)
        .reduce((s, p) => s + Number(p.value || 0), 0),
    })),
    [allRentPayments, year]
  );

  const expenseData = useMemo(() => {
    const map: Record<string, number> = {};
    [...allCosts, ...allAptCosts]
      .filter(c => Number(c.year) === year)
      .forEach(c => {
        const label = c.name || c.line || "other";
        map[label] = (map[label] || 0) + Number(c.value || 0);
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allCosts, allAptCosts, year]);

  const years = Array.from({ length: 5 }, (_, i) => year - 4 + i);
  const yearlyData = useMemo(() =>
    years.map(y => ({
      name: String(y),
      income: allRentPayments.filter(p => Number(p.year) === y).reduce((s, p) => s + Number(p.value || 0), 0),
      expenses:
        allCosts.filter(c => Number(c.year) === y).reduce((s, c) => s + Number(c.value || 0), 0) +
        allAptCosts.filter(c => Number(c.year) === y).reduce((s, c) => s + Number(c.value || 0), 0),
    })),
    [allRentPayments, allCosts, allAptCosts, year]
  );

  const propertyBreakdown = useMemo(() =>
    properties.map(prop => {
      const propApts = apartments.filter(a => (a.propertyId ?? a["property-id"]) === prop.id);
      const aptIds = new Set(propApts.map(a => a.id));

      const income = allRentPayments
        .filter(p => Number(p.year) === year && aptIds.has(p.apartmentId ?? p["apartment-id"]))
        .reduce((s, p) => s + Number(p.value || 0), 0);

      const propCosts = allCosts
        .filter(c => Number(c.year) === year && (c.propertyId ?? c["property-id"]) === prop.id)
        .reduce((s, c) => s + Number(c.value || 0), 0);

      const aptCosts = allAptCosts
        .filter(c => Number(c.year) === year && aptIds.has(c.apartmentId ?? c["apartment-id"]))
        .reduce((s, c) => s + Number(c.value || 0), 0);

      return { id: prop.id, name: prop.name, income, expenses: propCosts + aptCosts, net: income - propCosts - aptCosts };
    }),
    [properties, apartments, allRentPayments, allCosts, allAptCosts, year]
  );

  const hasData = allRentPayments.length > 0 || allCosts.length > 0 || allAptCosts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold w-16 text-center">{year}</span>
        <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("totalIncome")}</p>
            <p className="text-2xl font-bold text-green-600">{fmt(totalRent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("totalExpenses")}</p>
            <p className="text-2xl font-bold text-red-600">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("netResult")}</p>
            <p className={`text-2xl font-bold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netResult)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t("occupancy")}</p>
            <p className="text-2xl font-bold">{occupancyPct}%</p>
            <p className="text-xs text-muted-foreground">{occupiedCount}/{apartments.length} {t("units")}</p>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("noData")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("noDataHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("monthlyIncome")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `€${v}`} />
                    <Tooltip formatter={(v: number) => [fmt(v), t("income")]} />
                    <Bar dataKey="income" fill="#22c55e" name={t("income")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("expenseBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
                ) : (() => {
                  const expTotal = expenseData.reduce((s, d) => s + d.value, 0);
                  return (
                    <div className="flex gap-4 items-center">
                      <div
                        className="shrink-0"
                        style={{ width: 210, height: 210 }}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseData}
                              cx="50%"
                              cy="50%"
                              innerRadius={56}
                              outerRadius={88}
                              dataKey="value"
                              paddingAngle={2}
                              onMouseEnter={(_, index) => setHoveredIndex(index)}
                            >
                              {expenseData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                  opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.25 : 1}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => [fmt(v), t("amount")]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 max-h-[210px] overflow-y-auto pr-1">
                        {expenseData.map((entry, i) => {
                          const pct = expTotal > 0 ? (entry.value / expTotal) * 100 : 0;
                          const dimmed = hoveredIndex !== null && hoveredIndex !== i;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 text-xs cursor-default transition-opacity duration-150 ${dimmed ? "opacity-30" : "opacity-100"}`}
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="flex-1">{entry.name}</span>
                              <span className="tabular-nums shrink-0 font-medium">{fmt(entry.value)}</span>
                              <span className="text-muted-foreground shrink-0 w-12 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("yearlyOverview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `€${v}`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="income" fill="#22c55e" name={t("income")} />
                      <Bar dataKey="expenses" fill="#ef4444" name={t("expenses")} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {propertyBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("perProperty")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">{t("property")}</th>
                        <th className="text-right py-2 px-4">{t("income")}</th>
                        <th className="text-right py-2 px-4">{t("expenses")}</th>
                        <th className="text-right py-2 pl-4">{t("net")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propertyBreakdown.map(row => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="text-right py-2 px-4 text-green-600">{fmt(row.income)}</td>
                          <td className="text-right py-2 px-4 text-red-600">{fmt(row.expenses)}</td>
                          <td className={`text-right py-2 pl-4 font-semibold ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold border-t-2">
                        <td className="py-2 pr-4">Total</td>
                        <td className="text-right py-2 px-4 text-green-600">{fmt(totalRent)}</td>
                        <td className="text-right py-2 px-4 text-red-600">{fmt(totalExpenses)}</td>
                        <td className={`text-right py-2 pl-4 ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(netResult)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
