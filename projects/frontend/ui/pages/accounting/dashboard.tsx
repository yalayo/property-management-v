import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Separator } from '../ui/separator';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { IncomeChart } from '../accounting/IncomeChart';
import { ExpensesByCategory } from '../accounting/ExpensesByCategory';
import { PropertyFinancialSummary } from '../accounting/PropertyFinancialSummary';
import { TransactionsTable } from '../accounting/TransactionsTable';
import { 
  AreaChart, 
  BadgeDollarSign, 
  Building, 
  CalendarDays, 
  CircleDollarSign, 
  FilePlus, 
  PieChart as PieChartIcon, 
  PlusCircle, 
  Wallet 
} from 'lucide-react';

export default function AccountingDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch transactions data
  const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error loading transactions',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Fetch properties data
  const { data: properties, isLoading: isLoadingProperties, error: propertiesError } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error loading properties',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Calculate financial overview metrics
  const calculateMetrics = () => {
    // Current month income & expenses
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const startOfPreviousMonth = startOfMonth(subMonths(now, 1));
    
    // Current month metrics
    const currentMonthIncome = transactions
      ? transactions.filter((t: any) => t.type === 'income' && new Date(t.date) >= startOfCurrentMonth)
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    const currentMonthExpenses = transactions
      ? transactions.filter((t: any) => t.type === 'expense' && new Date(t.date) >= startOfCurrentMonth)
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    // Previous month metrics
    const previousMonthIncome = transactions
      ? transactions.filter((t: any) => 
          t.type === 'income' && 
          new Date(t.date) >= startOfPreviousMonth && 
          new Date(t.date) < startOfCurrentMonth
        ).reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    const previousMonthExpenses = transactions
      ? transactions.filter((t: any) => 
          t.type === 'expense' && 
          new Date(t.date) >= startOfPreviousMonth && 
          new Date(t.date) < startOfCurrentMonth
        ).reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    // Income and expenses for all time
    const totalIncome = transactions
      ? transactions.filter((transaction: any) => transaction.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    const totalExpenses = transactions
      ? transactions.filter((transaction: any) => transaction.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      : 0;
    
    // Property metrics
    const propertyCount = properties ? properties.length : 0;
    
    return {
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthProfit: currentMonthIncome - currentMonthExpenses,
      previousMonthIncome,
      previousMonthExpenses,
      previousMonthProfit: previousMonthIncome - previousMonthExpenses,
      totalIncome,
      totalExpenses,
      totalProfit: totalIncome - totalExpenses,
      propertyCount,
      incomeChangePercent: previousMonthIncome ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100 : 0,
      expensesChangePercent: previousMonthExpenses ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100 : 0,
      profitChangePercent: previousMonthProfit ? ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100 : 0
    };
  };
  
  const {
    currentMonthIncome,
    currentMonthExpenses,
    currentMonthProfit,
    previousMonthIncome,
    previousMonthExpenses,
    previousMonthProfit,
    totalIncome,
    totalExpenses,
    totalProfit,
    propertyCount,
    incomeChangePercent,
    expensesChangePercent,
    profitChangePercent
  } = calculateMetrics();
  
  // Most recent transactions
  const recentTransactions = transactions 
    ? [...transactions]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
    : [];
  
  // Upcoming scheduled transactions
  const upcomingTransactions = transactions
    ? transactions.filter((t: any) => t.recurring && new Date(t.date) > new Date())
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
    : [];
  
  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  const isLoading = isLoadingTransactions || isLoadingProperties;
  const hasError = transactionsError || propertiesError;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading accounting data...</p>
        </div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="rounded-full bg-red-100 p-3 mb-4">
          <CircleDollarSign className="h-6 w-6 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Failed to load accounting data</h1>
        <p className="text-muted-foreground mb-4">
          {transactionsError?.message || propertiesError?.message || 'An unknown error occurred.'}
        </p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }
  
  return (
    <div className="container py-6 mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your property finances and transactions
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button asChild variant="outline">
            <Link href="/accounting/transactions/new">
              <FilePlus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
          <Button asChild>
            <Link href="/accounting/reports">
              <AreaChart className="mr-2 h-4 w-4" /> Financial Reports
            </Link>
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Month Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthIncome)}</div>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                    <BadgeDollarSign className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <p className={`text-xs mt-1 ${incomeChangePercent > 0 ? 'text-green-500' : incomeChangePercent < 0 ? 'text-red-500' : ''}`}>
                  {incomeChangePercent > 0 ? '↑' : incomeChangePercent < 0 ? '↓' : ''} 
                  {Math.abs(incomeChangePercent).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Month Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthExpenses)}</div>
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                    <Wallet className="h-5 w-5 text-red-500" />
                  </div>
                </div>
                <p className={`text-xs mt-1 ${expensesChangePercent < 0 ? 'text-green-500' : expensesChangePercent > 0 ? 'text-red-500' : ''}`}>
                  {expensesChangePercent > 0 ? '↑' : expensesChangePercent < 0 ? '↓' : ''} 
                  {Math.abs(expensesChangePercent).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Month Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold">{formatCurrency(currentMonthProfit)}</div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <CircleDollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <p className={`text-xs mt-1 ${profitChangePercent > 0 ? 'text-green-500' : profitChangePercent < 0 ? 'text-red-500' : ''}`}>
                  {profitChangePercent > 0 ? '↑' : profitChangePercent < 0 ? '↓' : ''} 
                  {Math.abs(profitChangePercent).toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-2xl font-bold">{propertyCount}</div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                    <Building className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {formatCurrency(totalProfit)} Total profit
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Income & Expenses</CardTitle>
                <CardDescription>
                  Monthly financial performance overview
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <IncomeChart transactions={transactions} />
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>
                  Breakdown of your spending
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ExpensesByCategory transactions={transactions} />
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your latest financial activities
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/accounting/transactions">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <CircleDollarSign className={`h-5 w-5 ${
                            transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.categoryName || `Category ${transaction.categoryId}`} • {format(new Date(transaction.date), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No recent transactions</p>
                  <Button size="sm" className="mt-2" asChild>
                    <Link href="/accounting/transactions/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create a transaction
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-3">
              <div className="flex justify-between w-full text-sm">
                <p>Total Transactions</p>
                <p className="font-medium">{transactions ? transactions.length : 0}</p>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    Manage and view all your financial transactions
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/accounting/transactions/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Transaction
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={transactions} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="properties" className="space-y-6">
          <PropertyFinancialSummary properties={properties} transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}