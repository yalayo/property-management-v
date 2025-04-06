import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '@shared/schema';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { format, subMonths, parseISO, isAfter } from 'date-fns';

interface ExpensesByCategoryProps {
  transactions: Transaction[];
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

export function ExpensesByCategory({ transactions }: ExpensesByCategoryProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  
  // Prepare data for the pie chart
  const getCategoryData = (): CategoryData[] => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const now = new Date();
    let startDate: Date;
    
    // Set the time range
    if (timeRange === 'month') {
      startDate = subMonths(now, 1);
    } else if (timeRange === 'quarter') {
      startDate = subMonths(now, 3);
    } else {
      startDate = subMonths(now, 12);
    }
    
    // Filter expenses by time range
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = parseISO(transaction.date.toString());
      return transaction.type === 'expense' && isAfter(transactionDate, startDate);
    });
    
    // Group expenses by category
    const categoryMap = new Map<string, number>();
    const categoryColorMap = new Map<string, string>();
    
    filteredTransactions.forEach(transaction => {
      const categoryName = transaction.categoryName || `Category ${transaction.categoryId}`;
      const currentAmount = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, currentAmount + transaction.amount);
    });
    
    // Calculate total expenses
    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);
    
    // Convert to array and calculate percentages
    const categoryData = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    
    return categoryData;
  };
  
  const data = getCategoryData();
  const isEmpty = data.length === 0;
  
  // Colors for the pie chart sections
  const COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F94144',
    '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B'
  ];
  
  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 shadow-md">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.percentage.toFixed(1)}% of total
          </p>
        </Card>
      );
    }
    return null;
  };
  
  // Create the legend formatter
  const renderLegendText = (value: string, entry: any) => {
    return <span className="text-xs">{value}: {formatCurrency(entry.payload.value)}</span>;
  };
  
  return (
    <div className="h-full">
      <div className="flex justify-end mb-4">
        <Tabs value={timeRange} onValueChange={(value: string) => setTimeRange(value as any)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="h-[calc(100%-40px)]">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center flex-col">
            <p className="text-muted-foreground">No expense data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={renderLegendText}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}