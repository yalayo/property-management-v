import React, { useState } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Transaction } from '@shared/schema';

interface IncomeChartProps {
  transactions: Transaction[];
}

interface MonthData {
  name: string;
  income: number;
  expenses: number;
  profit: number;
  month: Date;
}

export function IncomeChart({ transactions }: IncomeChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [timeRange, setTimeRange] = useState<'6months' | '12months'>('6months');
  
  const prepareChartData = (): MonthData[] => {
    const now = new Date();
    let startDate: Date;
    
    if (timeRange === '6months') {
      startDate = subMonths(now, 6);
    } else {
      startDate = subMonths(now, 12);
    }
    
    // Initialize data for each month
    const monthsData: MonthData[] = [];
    let currentMonth = startOfMonth(startDate);
    
    while (currentMonth <= now) {
      monthsData.push({
        name: format(currentMonth, 'MMM yyyy', { locale: de }),
        income: 0,
        expenses: 0,
        profit: 0,
        month: new Date(currentMonth),
      });
      currentMonth = startOfMonth(subMonths(currentMonth, -1)); // Next month
    }
    
    // Process transactions into the respective months
    if (transactions && transactions.length > 0) {
      transactions.forEach((transaction: any) => {
        const transactionDate = parseISO(transaction.date.toString());
        
        // Skip transactions outside the time range
        if (transactionDate < startDate) {
          return;
        }
        
        // Find the corresponding month data
        const monthIndex = monthsData.findIndex((data) => 
          isWithinInterval(transactionDate, {
            start: startOfMonth(data.month),
            end: endOfMonth(data.month),
          })
        );
        
        if (monthIndex !== -1) {
          if (transaction.type === 'income') {
            monthsData[monthIndex].income += transaction.amount;
          } else if (transaction.type === 'expense') {
            monthsData[monthIndex].expenses += transaction.amount;
          }
          
          // Update profit
          monthsData[monthIndex].profit = 
            monthsData[monthIndex].income - monthsData[monthIndex].expenses;
        }
      });
    }
    
    return monthsData;
  };
  
  const data = prepareChartData();
  
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 shadow-md">
          <p className="font-medium text-sm">{label}</p>
          <div className="text-xs space-y-1 mt-1">
            <p className="text-green-600">
              Income: {formatCurrency(payload[0].payload.income)}
            </p>
            <p className="text-red-600">
              Expenses: {formatCurrency(payload[0].payload.expenses)}
            </p>
            <p className={payload[0].payload.profit >= 0 ? "text-blue-600" : "text-red-600"}>
              Profit: {formatCurrency(payload[0].payload.profit)}
            </p>
          </div>
        </Card>
      );
    }
    return null;
  };
  
  return (
    <div className="h-full">
      <div className="flex justify-between mb-4">
        <Tabs value={timeRange} onValueChange={(value: string) => setTimeRange(value as any)}>
          <TabsList>
            <TabsTrigger value="6months">6 Months</TabsTrigger>
            <TabsTrigger value="12months">12 Months</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs value={chartType} onValueChange={(value: string) => setChartType(value as any)}>
          <TabsList>
            <TabsTrigger value="area">Area</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="h-[calc(100%-40px)]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <RechartsAreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis 
                tickFormatter={(value) => `${value} €`}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                activeDot={{ r: 8 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.3}
                activeDot={{ r: 8 }}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                activeDot={{ r: 8 }}
              />
            </RechartsAreaChart>
          ) : (
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis 
                tickFormatter={(value) => `${value} €`}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#10b981" />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
              <Bar dataKey="profit" name="Profit" fill="#3b82f6" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}