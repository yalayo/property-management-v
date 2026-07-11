import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Property = { id: string; name: string };

type TaxIncome = {
  id: string;
  "property-id": string;
  year: number;
  description: string;
  amount: number | string;
  category?: string;
  date?: string;
};

type TaxExpense = {
  id: string;
  "property-id": string;
  year: number;
  description: string;
  amount: number | string;
  category?: string;
  date?: string;
};

type Props = {
  properties?: Property[];
  taxIncomes?: TaxIncome[];
  taxExpenses?: TaxExpense[];
  isReadOnly?: boolean;
  isSaving?: boolean;
  onAddTaxIncome?: (data: any) => void;
  onDeleteTaxIncome?: (id: string) => void;
  onAddTaxExpense?: (data: any) => void;
  onDeleteTaxExpense?: (id: string) => void;
};

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ItemForm = { description: string; amount: string; category: string; date: string };

const emptyForm: ItemForm = { description: "", amount: "", category: "", date: "" };

export default function OtherFinancesView({
  properties = [],
  taxIncomes = [],
  taxExpenses = [],
  isReadOnly = false,
  isSaving = false,
  onAddTaxIncome,
  onDeleteTaxIncome,
  onAddTaxExpense,
  onDeleteTaxExpense,
}: Props) {
  const { t } = useTranslation("finances");
  const { t: tCommon } = useTranslation("common");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties.length > 0 ? String(properties[0].id) : ""
  );
  const [incomeForm, setIncomeForm] = useState<ItemForm | null>(null);
  const [expenseForm, setExpenseForm] = useState<ItemForm | null>(null);

  const propIncomes = taxIncomes.filter(
    i => String(i["property-id"]) === selectedPropertyId && Number(i.year) === year
  );
  const propExpenses = taxExpenses.filter(
    e => String(e["property-id"]) === selectedPropertyId && Number(e.year) === year
  );

  const totalIncome = propIncomes.reduce((s, i) => s + parseNum(i.amount), 0);
  const totalExpenses = propExpenses.reduce((s, e) => s + parseNum(e.amount), 0);

  function handleSaveIncome() {
    if (!incomeForm || !incomeForm.description.trim() || !incomeForm.amount) return;
    onAddTaxIncome?.({
      propertyId: selectedPropertyId,
      year,
      description: incomeForm.description.trim(),
      amount: parseFloat(incomeForm.amount),
      category: incomeForm.category || undefined,
      date: incomeForm.date || undefined,
    });
    setIncomeForm(null);
  }

  function handleSaveExpense() {
    if (!expenseForm || !expenseForm.description.trim() || !expenseForm.amount) return;
    onAddTaxExpense?.({
      propertyId: selectedPropertyId,
      year,
      description: expenseForm.description.trim(),
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category || undefined,
      date: expenseForm.date || undefined,
    });
    setExpenseForm(null);
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("noProperties")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="border rounded px-3 py-1.5 text-sm bg-background"
          value={selectedPropertyId}
          onChange={e => setSelectedPropertyId(e.target.value)}
        >
          {properties.map(p => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums w-12 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Other Income */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("income.title")}</CardTitle>
            {!isReadOnly && onAddTaxIncome && !incomeForm && (
              <Button size="sm" variant="outline" className="h-7 gap-1"
                onClick={() => setIncomeForm({ ...emptyForm })}>
                <Plus className="h-3.5 w-3.5" />
                {t("income.add")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {propIncomes.length === 0 && !incomeForm && (
            <p className="text-sm text-muted-foreground px-4 pb-4">{t("income.empty")}</p>
          )}
          {propIncomes.map(item => (
            <div key={item.id}
              className="flex items-center justify-between px-4 py-2.5 border-t gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                {(item.category || item.date) && (
                  <p className="text-xs text-muted-foreground">
                    {[item.category, item.date].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-green-600 shrink-0">
                + € {fmt(parseNum(item.amount))}
              </span>
              {!isReadOnly && onDeleteTaxIncome && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onDeleteTaxIncome(String(item.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {incomeForm && (
            <div className="border-t px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">{t("income.description")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("income.descPlaceholder")}
                    value={incomeForm.description}
                    onChange={e => setIncomeForm(f => f ? { ...f, description: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("income.amount")}</Label>
                  <Input className="h-8 text-sm" type="number" min="0" step="0.01"
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={e => setIncomeForm(f => f ? { ...f, amount: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("income.category")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("income.category")}
                    value={incomeForm.category}
                    onChange={e => setIncomeForm(f => f ? { ...f, category: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("income.date")}</Label>
                  <Input className="h-8 text-sm" type="date"
                    value={incomeForm.date}
                    onChange={e => setIncomeForm(f => f ? { ...f, date: e.target.value } : f)} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7"
                  disabled={!incomeForm.description.trim() || !incomeForm.amount || isSaving}
                  onClick={handleSaveIncome}>
                  {tCommon("save")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7"
                  onClick={() => setIncomeForm(null)}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          )}
          {propIncomes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
              <span className="text-xs text-muted-foreground">{t("income.title")}</span>
              <span className="text-sm font-semibold tabular-nums text-green-600">
                + € {fmt(totalIncome)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("expense.title")}</CardTitle>
            {!isReadOnly && onAddTaxExpense && !expenseForm && (
              <Button size="sm" variant="outline" className="h-7 gap-1"
                onClick={() => setExpenseForm({ ...emptyForm })}>
                <Plus className="h-3.5 w-3.5" />
                {t("expense.add")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("expense.hint")}</p>
        </CardHeader>
        <CardContent className="p-0">
          {propExpenses.length === 0 && !expenseForm && (
            <p className="text-sm text-muted-foreground px-4 pb-4">{t("expense.empty")}</p>
          )}
          {propExpenses.map(item => (
            <div key={item.id}
              className="flex items-center justify-between px-4 py-2.5 border-t gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.description}</p>
                {(item.category || item.date) && (
                  <p className="text-xs text-muted-foreground">
                    {[item.category, item.date].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-destructive shrink-0">
                − € {fmt(parseNum(item.amount))}
              </span>
              {!isReadOnly && onDeleteTaxExpense && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onDeleteTaxExpense(String(item.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {expenseForm && (
            <div className="border-t px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-xs">{t("expense.description")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("expense.descPlaceholder")}
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(f => f ? { ...f, description: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("expense.amount")}</Label>
                  <Input className="h-8 text-sm" type="number" min="0" step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => f ? { ...f, amount: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("expense.category")}</Label>
                  <Input className="h-8 text-sm" placeholder={t("expense.category")}
                    value={expenseForm.category}
                    onChange={e => setExpenseForm(f => f ? { ...f, category: e.target.value } : f)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("expense.date")}</Label>
                  <Input className="h-8 text-sm" type="date"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm(f => f ? { ...f, date: e.target.value } : f)} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7"
                  disabled={!expenseForm.description.trim() || !expenseForm.amount || isSaving}
                  onClick={handleSaveExpense}>
                  {tCommon("save")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7"
                  onClick={() => setExpenseForm(null)}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          )}
          {propExpenses.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
              <span className="text-xs text-muted-foreground">{t("expense.title")}</span>
              <span className="text-sm font-semibold tabular-nums text-destructive">
                − € {fmt(totalExpenses)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
