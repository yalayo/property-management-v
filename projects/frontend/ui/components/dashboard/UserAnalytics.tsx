import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";

const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const PIE_COLORS  = ["#0088FE","#00C49F","#FFBB28","#FF8042","#8884D8","#82ca9d","#ffc658","#ff7300"];
const APT_COLORS  = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];

function fmt(v: number) {
  return `€${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function netClass(v: number) {
  return v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground";
}

function KpiCard({ label, value, valueClass = "", subtitle }: {
  label: string; value: string; valueClass?: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-xl font-bold leading-tight ${valueClass}`}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

type Props = {
  properties?: any[];
  apartments?: any[];
  tenants?: any[];
  allCosts?: any[];
  allAptCosts?: any[];
  allRentPayments?: any[];
};

export default function UserAnalytics({
  properties = [],
  apartments = [],
  tenants = [],
  allCosts = [],
  allAptCosts = [],
  allRentPayments = [],
}: Props) {
  const { t } = useTranslation("analytics");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedPropertyId, setSelectedPropertyId] = useState<any>(null);
  const [hoveredExpIdx, setHoveredExpIdx] = useState<number | null>(null);
  const [hoveredPropExpIdx, setHoveredPropExpIdx] = useState<number | null>(null);

  // ── Business totals ───────────────────────────────────────────────────────

  const totalRent = useMemo(
    () => allRentPayments.filter(p => Number(p.year) === year).reduce((s, p) => s + Number(p.value || 0), 0),
    [allRentPayments, year]
  );
  const totalKaltmiete = useMemo(
    () => allRentPayments.filter(p => Number(p.year) === year).reduce((s, p) => s + Number(p.kaltmiete || 0), 0),
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

  const totalExpenses      = totalPropertyCosts + totalAptCosts;
  const netResult          = totalRent - totalExpenses;
  const avgMonthlyCashflow = netResult / 12;

  const occupiedCount  = apartments.filter(a => a.occupied).length;
  const occupancyPct   = apartments.length > 0 ? Math.round((occupiedCount / apartments.length) * 100) : 0;

  // ── Monthly data (income with kalt/nk split + distributed expenses) ───────

  const monthlyData = useMemo(() => {
    const monthlyExp = totalExpenses / 12;
    let cum = 0;
    return MONTH_KEYS.map((key, idx) => {
      const mth  = idx + 1;
      const pmts = allRentPayments.filter(p => Number(p.year) === year && Number(p.month) === mth);
      const income = pmts.reduce((s, p) => s + Number(p.value || 0), 0);
      const kalt   = pmts.reduce((s, p) => s + Number(p.kaltmiete || 0), 0);
      const nk     = pmts.reduce((s, p) => s + Number(p["nebenkosten-warm"] || 0), 0);
      const other  = Math.max(0, income - kalt - nk);
      const net    = income - monthlyExp;
      cum += net;
      return {
        name: key,
        income:          +income.toFixed(2),
        expenses:        +monthlyExp.toFixed(2),
        net:             +net.toFixed(2),
        cumulative:      +cum.toFixed(2),
        kaltmiete:       +kalt.toFixed(2),
        nebenkostenWarm: +nk.toFixed(2),
        other:           +other.toFixed(2),
      };
    });
  }, [allRentPayments, totalExpenses, year]);

  // ── Expense breakdown pie ─────────────────────────────────────────────────

  const expenseData = useMemo(() => {
    const map: Record<string, number> = {};
    [...allCosts, ...allAptCosts]
      .filter(c => Number(c.year) === year)
      .forEach(c => {
        const label = c.name || c.line || "other";
        map[label] = (map[label] || 0) + Number(c.value || 0);
      });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allCosts, allAptCosts, year]);

  // ── 5-year overview ───────────────────────────────────────────────────────

  const years = Array.from({ length: 5 }, (_, i) => year - 4 + i);
  const yearlyData = useMemo(() =>
    years.map(y => ({
      name: String(y),
      income:   allRentPayments.filter(p => Number(p.year) === y).reduce((s, p) => s + Number(p.value || 0), 0),
      expenses: allCosts.filter(c => Number(c.year) === y).reduce((s, c) => s + Number(c.value || 0), 0)
              + allAptCosts.filter(c => Number(c.year) === y).reduce((s, c) => s + Number(c.value || 0), 0),
    })),
    [allRentPayments, allCosts, allAptCosts, year]
  );

  // ── Property-level P&L table ──────────────────────────────────────────────

  const propertyBreakdown = useMemo(() =>
    properties.map(prop => {
      const pApts  = apartments.filter(a => (a.propertyId ?? a["property-id"]) === prop.id);
      const aptIds = new Set(pApts.map(a => a.id));
      const inc    = allRentPayments.filter(p => Number(p.year) === year && aptIds.has(p.apartmentId ?? p["apartment-id"])).reduce((s, p) => s + Number(p.value || 0), 0);
      const pc     = allCosts.filter(c => Number(c.year) === year && (c.propertyId ?? c["property-id"]) === prop.id).reduce((s, c) => s + Number(c.value || 0), 0);
      const ac     = allAptCosts.filter(c => Number(c.year) === year && aptIds.has(c.apartmentId ?? c["apartment-id"])).reduce((s, c) => s + Number(c.value || 0), 0);
      return { id: prop.id, name: prop.name, income: inc, expenses: pc + ac, net: inc - pc - ac };
    }),
    [properties, apartments, allRentPayments, allCosts, allAptCosts, year]
  );

  const hasData = allRentPayments.length > 0 || allCosts.length > 0 || allAptCosts.length > 0;

  // ── Per-property ──────────────────────────────────────────────────────────

  const effectivePropId = selectedPropertyId ?? properties[0]?.id ?? null;
  const propApts        = useMemo(() => apartments.filter(a => (a.propertyId ?? a["property-id"]) === effectivePropId), [apartments, effectivePropId]);
  const propAptIds      = useMemo(() => new Set(propApts.map(a => a.id)), [propApts]);

  const propIncome = useMemo(
    () => allRentPayments.filter(p => Number(p.year) === year && propAptIds.has(p.apartmentId ?? p["apartment-id"])).reduce((s, p) => s + Number(p.value || 0), 0),
    [allRentPayments, year, propAptIds]
  );
  const propPropCosts = useMemo(
    () => allCosts.filter(c => Number(c.year) === year && (c.propertyId ?? c["property-id"]) === effectivePropId).reduce((s, c) => s + Number(c.value || 0), 0),
    [allCosts, year, effectivePropId]
  );
  const propAptCostsTotal = useMemo(
    () => allAptCosts.filter(c => Number(c.year) === year && propAptIds.has(c.apartmentId ?? c["apartment-id"])).reduce((s, c) => s + Number(c.value || 0), 0),
    [allAptCosts, year, propAptIds]
  );

  const propExpenses    = propPropCosts + propAptCostsTotal;
  const propNet         = propIncome - propExpenses;
  const propOccupied    = propApts.filter(a => a.occupied).length;
  const propOccupancyPct = propApts.length > 0 ? Math.round((propOccupied / propApts.length) * 100) : 0;

  // Stacked monthly income by apartment
  const propMonthlyByApt = useMemo(() =>
    MONTH_KEYS.map((key, idx) => {
      const mth   = idx + 1;
      const entry: Record<string, any> = { name: key };
      propApts.forEach(apt => {
        entry[String(apt.id)] = +allRentPayments
          .filter(p => Number(p.year) === year && Number(p.month) === mth && (p.apartmentId ?? p["apartment-id"]) === apt.id)
          .reduce((s, p) => s + Number(p.value || 0), 0)
          .toFixed(2);
      });
      return entry;
    }),
    [propApts, allRentPayments, year]
  );

  // Property expense breakdown
  const propExpenseData = useMemo(() => {
    const map: Record<string, number> = {};
    [...allCosts.filter(c => Number(c.year) === year && (c.propertyId ?? c["property-id"]) === effectivePropId),
     ...allAptCosts.filter(c => Number(c.year) === year && propAptIds.has(c.apartmentId ?? c["apartment-id"]))]
      .forEach(c => { const l = c.name || c.line || "other"; map[l] = (map[l] || 0) + Number(c.value || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allCosts, allAptCosts, year, effectivePropId, propAptIds]);

  // Apartment overview table
  const today = new Date().toISOString().split("T")[0];
  const aptOverview = useMemo(() =>
    propApts.map(apt => {
      const aptTenants   = tenants.filter(t => String(t["apartment-id"]) === String(apt.id));
      const activeTenant = aptTenants
        .filter(t => (!t["end-date"] || t["end-date"] >= today) && (!t["start-date"] || t["start-date"] <= today))
        .sort((a, b) => (b["start-date"] ?? "").localeCompare(a["start-date"] ?? ""))[0] ?? null;
      const ytdIncome = allRentPayments
        .filter(p => Number(p.year) === year && (p.apartmentId ?? p["apartment-id"]) === apt.id)
        .reduce((s, p) => s + Number(p.value || 0), 0);
      const tenantName = activeTenant
        ? `${activeTenant["first-name"] || ""} ${activeTenant["last-name"] || ""}`.trim() || null
        : null;
      return {
        id: apt.id, code: apt.code, occupied: apt.occupied,
        tenantName,
        startDate: activeTenant?.["start-date"] ?? null,
        endDate:   activeTenant?.["end-date"]   ?? null,
        kaltmiete: activeTenant?.kaltmiete               ?? null,
        nkWarm:    activeTenant?.["nebenkosten-warm"]    ?? null,
        ytdIncome,
      };
    }),
    [propApts, tenants, allRentPayments, year, today]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold w-16 text-center">{year}</span>
        <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">{t("tabs.business")}</TabsTrigger>
          <TabsTrigger value="property">{t("tabs.perProperty")}</TabsTrigger>
        </TabsList>

        {/* ── BUSINESS OVERVIEW ──────────────────────────────────────────── */}
        <TabsContent value="business" className="space-y-6 pt-4">

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label={t("totalIncome")}         value={fmt(totalRent)}          valueClass="text-green-600" />
            <KpiCard label={t("totalExpenses")}       value={fmt(totalExpenses)}       valueClass="text-red-600" />
            <KpiCard label={t("netResult")}           value={fmt(netResult)}           valueClass={netClass(netResult)} />
            <KpiCard label={t("avgMonthlyCashflow")}  value={fmt(avgMonthlyCashflow)}  valueClass={netClass(avgMonthlyCashflow)} />
            <KpiCard label={t("coldRent")}            value={fmt(totalKaltmiete)}      valueClass="text-blue-600" />
            <KpiCard label={t("occupancy")}           value={`${occupancyPct}%`}       subtitle={`${occupiedCount}/${apartments.length} ${t("units")}`} />
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
              {/* Monthly cashflow: income bars + expense bars + net line */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("monthlyCashflow")}</CardTitle>
                  {totalExpenses > 0 && <p className="text-xs text-muted-foreground mt-1">* {t("estimatedMonthly")}</p>}
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v: number) => [fmt(v), ""]} />
                        <Legend />
                        <Bar dataKey="income"   fill="#22c55e" name={t("income")} />
                        {totalExpenses > 0 && <Bar dataKey="expenses" fill="#ef4444" opacity={0.6} name={`${t("expenses")} *`} />}
                        <Line type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2} dot={false} name={t("net")} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cumulative cashflow */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("cumulativeCashflow")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v: number) => [fmt(v), t("cumulative")]} />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="url(#cumGrad)" strokeWidth={2} name={t("cumulative")} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Rent composition: kaltmiete + nk warm + other stacked */}
                <Card>
                  <CardHeader><CardTitle>{t("rentComposition")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => `€${v}`} />
                          <Tooltip formatter={(v: number) => [fmt(v), ""]} />
                          <Legend />
                          <Bar dataKey="kaltmiete"       stackId="r" fill="#3b82f6" name={t("kaltmiete")} />
                          <Bar dataKey="nebenkostenWarm" stackId="r" fill="#f59e0b" name={t("nebenkostenWarm")} />
                          <Bar dataKey="other"           stackId="r" fill="#94a3b8" name={t("otherRent")} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Expense breakdown pie */}
                <Card>
                  <CardHeader><CardTitle>{t("expenseBreakdown")}</CardTitle></CardHeader>
                  <CardContent>
                    {expenseData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">{t("noData")}</div>
                    ) : (() => {
                      const expTotal = expenseData.reduce((s, d) => s + d.value, 0);
                      return (
                        <div className="flex gap-4 items-center">
                          <div className="shrink-0" style={{ width: 180, height: 180 }} onMouseLeave={() => setHoveredExpIdx(null)}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={expenseData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={2}
                                  onMouseEnter={(_, i) => setHoveredExpIdx(i)}>
                                  {expenseData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}
                                      opacity={hoveredExpIdx !== null && hoveredExpIdx !== i ? 0.25 : 1} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => [fmt(v), t("amount")]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {expenseData.map((entry, i) => {
                              const pct   = expTotal > 0 ? (entry.value / expTotal) * 100 : 0;
                              const dimmed = hoveredExpIdx !== null && hoveredExpIdx !== i;
                              return (
                                <div key={i} className={`flex items-center gap-2 text-xs cursor-default transition-opacity ${dimmed ? "opacity-30" : "opacity-100"}`}
                                  onMouseEnter={() => setHoveredExpIdx(i)} onMouseLeave={() => setHoveredExpIdx(null)}>
                                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="flex-1 truncate">{entry.name}</span>
                                  <span className="tabular-nums shrink-0 font-medium">{fmt(entry.value)}</span>
                                  <span className="text-muted-foreground shrink-0 w-10 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* 5-year income vs expenses */}
              <Card>
                <CardHeader><CardTitle>{t("yearlyOverview")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="income"   fill="#22c55e" name={t("income")} />
                        <Bar dataKey="expenses" fill="#ef4444" name={t("expenses")} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Per-property P&L table */}
              {propertyBreakdown.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t("perProperty")}</CardTitle></CardHeader>
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
                              <td className={`text-right py-2 pl-4 font-semibold ${netClass(row.net)}`}>{fmt(row.net)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold border-t-2">
                            <td className="py-2 pr-4">Total</td>
                            <td className="text-right py-2 px-4 text-green-600">{fmt(totalRent)}</td>
                            <td className="text-right py-2 px-4 text-red-600">{fmt(totalExpenses)}</td>
                            <td className={`text-right py-2 pl-4 ${netClass(netResult)}`}>{fmt(netResult)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Month-by-month detail table */}
              <Card>
                <CardHeader><CardTitle>{t("monthlyDetail")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">{t("month")}</th>
                          <th className="text-right py-2 px-3">{t("income")}</th>
                          {totalExpenses > 0 && <th className="text-right py-2 px-3">{t("expenses")} *</th>}
                          <th className="text-right py-2 px-3">{t("net")}</th>
                          <th className="text-right py-2 pl-3">{t("cumulative")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 pr-4 font-medium uppercase text-xs tracking-wider">{row.name}</td>
                            <td className="text-right py-1.5 px-3 text-green-600">{row.income > 0 ? fmt(row.income) : "—"}</td>
                            {totalExpenses > 0 && <td className="text-right py-1.5 px-3 text-red-600">{fmt(row.expenses)}</td>}
                            <td className={`text-right py-1.5 px-3 font-medium ${netClass(row.net)}`}>{fmt(row.net)}</td>
                            <td className={`text-right py-1.5 pl-3 font-medium ${netClass(row.cumulative)}`}>{fmt(row.cumulative)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold border-t-2">
                          <td className="py-2 pr-4">Total</td>
                          <td className="text-right py-2 px-3 text-green-600">{fmt(totalRent)}</td>
                          {totalExpenses > 0 && <td className="text-right py-2 px-3 text-red-600">{fmt(totalExpenses)}</td>}
                          <td className={`text-right py-2 px-3 font-semibold ${netClass(netResult)}`}>{fmt(netResult)}</td>
                          <td className="text-right py-2 pl-3 text-muted-foreground">—</td>
                        </tr>
                        {totalExpenses > 0 && (
                          <tr><td colSpan={5} className="pt-1.5 text-xs text-muted-foreground">* {t("estimatedMonthly")}</td></tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── PER PROPERTY TAB ────────────────────────────────────────────── */}
        <TabsContent value="property" className="space-y-6 pt-4">
          {properties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t("noData")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Property selector (only shown when multiple properties exist) */}
              {properties.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {properties.map(prop => (
                    <Button
                      key={prop.id}
                      variant={effectivePropId === prop.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPropertyId(prop.id)}
                    >
                      {prop.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Property KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label={t("totalIncome")}   value={fmt(propIncome)}   valueClass="text-green-600" />
                <KpiCard label={t("totalExpenses")} value={fmt(propExpenses)} valueClass="text-red-600" />
                <KpiCard label={t("netResult")}     value={fmt(propNet)}      valueClass={netClass(propNet)} />
                <KpiCard label={t("occupancy")}     value={`${propOccupancyPct}%`} subtitle={`${propOccupied}/${propApts.length} ${t("units")}`} />
              </div>

              {/* Stacked bar: income per apartment per month */}
              {propApts.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t("perApartment")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={propMonthlyByApt} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => `€${v}`} />
                          <Tooltip formatter={(v: number) => [fmt(v), ""]} />
                          <Legend />
                          {propApts.map((apt, i) => (
                            <Bar key={apt.id} dataKey={String(apt.id)} stackId="apt" fill={APT_COLORS[i % APT_COLORS.length]} name={apt.code} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apartment overview table */}
              {aptOverview.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t("apartmentDetail")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 pr-3">{t("apartment")}</th>
                            <th className="text-left py-2 px-3">{t("currentTenant")}</th>
                            <th className="text-left py-2 px-3">{t("leasePeriod")}</th>
                            <th className="text-right py-2 px-3">{t("kaltmiete")}</th>
                            <th className="text-right py-2 px-3">{t("nebenkostenWarm")}</th>
                            <th className="text-right py-2 pl-3">{t("ytdIncome")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aptOverview.map(row => (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-medium">{row.code}</td>
                              <td className="py-2 px-3">
                                {row.tenantName
                                  ? <span>{row.tenantName}</span>
                                  : <Badge variant="outline" className="text-muted-foreground font-normal">{t("vacant")}</Badge>
                                }
                              </td>
                              <td className="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">
                                {row.startDate ? `${row.startDate} → ${row.endDate || t("openEnded")}` : "—"}
                              </td>
                              <td className="text-right py-2 px-3 text-blue-600">
                                {row.kaltmiete != null ? fmt(Number(row.kaltmiete)) : "—"}
                              </td>
                              <td className="text-right py-2 px-3 text-amber-600">
                                {row.nkWarm != null ? fmt(Number(row.nkWarm)) : "—"}
                              </td>
                              <td className="text-right py-2 pl-3 font-medium text-green-600">
                                {row.ytdIncome > 0 ? fmt(row.ytdIncome) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-semibold border-t-2">
                            <td className="py-2 pr-3" colSpan={5}>Total</td>
                            <td className="text-right py-2 pl-3 text-green-600">{fmt(propIncome)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Property expense breakdown pie */}
              {propExpenseData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t("propertyExpenses")}</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      const expTotal = propExpenseData.reduce((s, d) => s + d.value, 0);
                      return (
                        <div className="flex gap-4 items-center">
                          <div className="shrink-0" style={{ width: 180, height: 180 }} onMouseLeave={() => setHoveredPropExpIdx(null)}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={propExpenseData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={2}
                                  onMouseEnter={(_, i) => setHoveredPropExpIdx(i)}>
                                  {propExpenseData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}
                                      opacity={hoveredPropExpIdx !== null && hoveredPropExpIdx !== i ? 0.25 : 1} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => [fmt(v), t("amount")]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                            {propExpenseData.map((entry, i) => {
                              const pct    = expTotal > 0 ? (entry.value / expTotal) * 100 : 0;
                              const dimmed = hoveredPropExpIdx !== null && hoveredPropExpIdx !== i;
                              return (
                                <div key={i} className={`flex items-center gap-2 text-xs cursor-default transition-opacity ${dimmed ? "opacity-30" : "opacity-100"}`}
                                  onMouseEnter={() => setHoveredPropExpIdx(i)} onMouseLeave={() => setHoveredPropExpIdx(null)}>
                                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="flex-1 truncate">{entry.name}</span>
                                  <span className="tabular-nums shrink-0 font-medium">{fmt(entry.value)}</span>
                                  <span className="text-muted-foreground shrink-0 w-10 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
