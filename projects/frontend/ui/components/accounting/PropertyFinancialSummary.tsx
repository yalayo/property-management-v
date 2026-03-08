import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, subMonths, parseISO, isAfter } from 'date-fns';
import { TransactionsTable } from './TransactionsTable';
import { Transaction } from '@shared/schema';

interface PropertyFinancialSummaryProps {
  properties: Property[];
  transactions: Transaction[];
}

interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string | null;
  units: number | null;
  acquisitionDate: Date | null;
  purchasePrice: number | null;
  currentValue: number | null;
}

interface PropertyFinancialData {
  id: number;
  name: string;
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  roi?: number;
}

export function PropertyFinancialSummary({ properties, transactions }: PropertyFinancialSummaryProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year' | 'all'>('year');
  const [expandedProperty, setExpandedProperty] = useState<number | null>(null);
  const [sortField, setSortField] = useState<'name' | 'income' | 'expenses' | 'profit' | 'profitMargin' | 'roi'>('profit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toggle property expansion
  const togglePropertyExpand = (propertyId: number) => {
    if (expandedProperty === propertyId) {
      setExpandedProperty(null);
    } else {
      setExpandedProperty(propertyId);
    }
  };
  
  // Toggle sort
  const toggleSort = (field: 'name' | 'income' | 'expenses' | 'profit' | 'profitMargin' | 'roi') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Calculate property financial data
  const calculatePropertyData = (): PropertyFinancialData[] => {
    if (!properties || !transactions) {
      return [];
    }
    
    const now = new Date();
    let startDate: Date;
    
    // Set the time range
    if (timeRange === 'month') {
      startDate = subMonths(now, 1);
    } else if (timeRange === 'quarter') {
      startDate = subMonths(now, 3);
    } else if (timeRange === 'year') {
      startDate = subMonths(now, 12);
    } else {
      // Set to a long time ago for "all time"
      startDate = new Date(0);
    }
    
    // Calculate financial metrics for each property
    const propertyData = properties.map(property => {
      // Filter transactions for this property and time range
      const propertyTransactions = transactions.filter(transaction => {
        const transactionDate = parseISO(transaction.date.toString());
        return (
          transaction.propertyId === property.id && 
          (timeRange === 'all' || isAfter(transactionDate, startDate))
        );
      });
      
      // Calculate income and expenses
      const income = propertyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = propertyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate profit and profit margin
      const profit = income - expenses;
      const profitMargin = income > 0 ? (profit / income) * 100 : 0;
      
      // Calculate ROI if purchase price is available
      let roi;
      if (property.purchasePrice && property.purchasePrice > 0) {
        roi = (profit / property.purchasePrice) * 100;
      }
      
      return {
        id: property.id,
        name: property.name,
        income,
        expenses,
        profit,
        profitMargin,
        roi,
      };
    });
    
    return propertyData;
  };
  
  // Filter and sort property data
  const getFilteredAndSortedData = () => {
    const propertyData = calculatePropertyData();
    
    // Filter by search term
    const filteredData = searchTerm 
      ? propertyData.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : propertyData;
    
    // Sort data
    const sortedData = [...filteredData].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const aValue = a[sortField] || 0;
        const bValue = b[sortField] || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
    
    return sortedData;
  };
  
  const propertyFinancialData = getFilteredAndSortedData();
  
  // Calculate total metrics
  const totals = propertyFinancialData.reduce(
    (acc, curr) => {
      acc.income += curr.income;
      acc.expenses += curr.expenses;
      acc.profit += curr.profit;
      return acc;
    },
    { income: 0, expenses: 0, profit: 0 }
  );
  
  // Calculate total profit margin
  const totalProfitMargin = totals.income > 0 
    ? (totals.profit / totals.income) * 100 
    : 0;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Property Financial Summary</CardTitle>
            <CardDescription>
              Financial performance breakdown by property
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select 
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as any)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" asChild>
              <a 
                href="/api/properties/financial-report/export"
                download={`property-report-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {propertyFinancialData.length === 0 ? (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium mb-2">No property data available</h3>
            <p className="text-muted-foreground mb-4">
              There are no properties with financial data to display.
            </p>
          </div>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('name')}
                    >
                      Property
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('income')}
                    >
                      Income
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('expenses')}
                    >
                      Expenses
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('profit')}
                    >
                      Profit
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('profitMargin')}
                    >
                      Margin
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 -ml-3 font-medium"
                      onClick={() => toggleSort('roi')}
                    >
                      ROI
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {propertyFinancialData.map((property) => (
                  <React.Fragment key={property.id}>
                    <TableRow>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(property.income)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(property.expenses)}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        property.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(property.profit)}
                      </TableCell>
                      <TableCell className={`text-right ${
                        property.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(property.profitMargin)}
                      </TableCell>
                      <TableCell className={`text-right ${
                        property.roi && property.roi >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {property.roi ? formatPercentage(property.roi) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => togglePropertyExpand(property.id)}
                        >
                          {expandedProperty === property.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded property details */}
                    {expandedProperty === property.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0 border-b-0">
                          <div className="p-4 bg-muted/30">
                            <Tabs defaultValue="transactions">
                              <TabsList className="mb-4">
                                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                                <TabsTrigger value="details">Property Details</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="transactions">
                                <TransactionsTable 
                                  transactions={transactions.filter(
                                    t => t.propertyId === property.id
                                  )} 
                                />
                              </TabsContent>
                              
                              <TabsContent value="details">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-base">Basic Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Address:</span>
                                        <span>{getPropertyById(property.id)?.address}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">City:</span>
                                        <span>{getPropertyById(property.id)?.city}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Postal Code:</span>
                                        <span>{getPropertyById(property.id)?.postalCode}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Units:</span>
                                        <span>{getPropertyById(property.id)?.units || '-'}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-base">Financial Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Acquisition Date:</span>
                                        <span>
                                          {getPropertyById(property.id)?.acquisitionDate 
                                            ? format(new Date(getPropertyById(property.id)?.acquisitionDate as Date), 'PPP')
                                            : '-'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Purchase Price:</span>
                                        <span>
                                          {getPropertyById(property.id)?.purchasePrice 
                                            ? formatCurrency(getPropertyById(property.id)?.purchasePrice as number)
                                            : '-'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Current Value:</span>
                                        <span>
                                          {getPropertyById(property.id)?.currentValue 
                                            ? formatCurrency(getPropertyById(property.id)?.currentValue as number)
                                            : '-'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Appreciation:</span>
                                        <span>
                                          {getAppreciation(property.id)}
                                        </span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                
                {/* Totals row */}
                <TableRow className="border-t-2 border-border font-medium">
                  <TableCell>Total ({propertyFinancialData.length} properties)</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.income)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.expenses)}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(totals.profit)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    totalProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(totalProfitMargin)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
        <div>
          Showing {propertyFinancialData.length} of {properties.length} properties
        </div>
        <div>
          {timeRange === 'all' ? 'All time' : `Last ${timeRange}`}
        </div>
      </CardFooter>
    </Card>
  );
  
  // Helper function to get property by ID
  function getPropertyById(id: number) {
    return properties.find(p => p.id === id);
  }
  
  // Helper function to calculate property appreciation
  function getAppreciation(propertyId: number) {
    const property = getPropertyById(propertyId);
    if (!property?.purchasePrice || !property?.currentValue) {
      return '-';
    }
    
    const appreciation = property.currentValue - property.purchasePrice;
    const appreciationPercentage = (appreciation / property.purchasePrice) * 100;
    
    return (
      <span className={appreciationPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
        {formatCurrency(appreciation)} ({appreciationPercentage.toFixed(2)}%)
      </span>
    );
  }
}