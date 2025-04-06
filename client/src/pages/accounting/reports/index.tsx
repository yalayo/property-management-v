import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ArrowLeft, Download, Calendar, Filter, FileText, BarChart, PieChart, TrendingUp, Clock } from 'lucide-react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Property, Transaction, TaxYear } from '@shared/schema';
import { useToast } from '../../hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';

export default function ReportsPage() {
  const [selectedProperty, setSelectedProperty] = useState<number | "all">("all");
  const [selectedYear, setSelectedYear] = useState<number | string>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number | string>("all");
  const { toast } = useToast();

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    onError: (error: Error) => {
      toast({
        title: 'Error loading properties',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch tax years
  const { data: taxYears, isLoading: taxYearsLoading } = useQuery<TaxYear[]>({
    queryKey: ['/api/tax-years'],
    onError: (error: Error) => {
      toast({
        title: 'Error loading tax years',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get current and previous years
  const currentYear = new Date().getFullYear();
  const availableYears = [
    currentYear,
    currentYear - 1,
    currentYear - 2
  ];

  // Function to generate PDF report (placeholder)
  const generateReport = (reportType: string) => {
    toast({
      title: 'Generating Report',
      description: `${reportType} report is being generated.`,
    });
    // In a real implementation, this would call an API endpoint to generate and download the report
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center mb-6">
        <Button asChild variant="ghost" className="mr-4">
          <Link to="/accounting/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">Generate and view financial reports for tax preparation and analysis</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
        <div>
          <label className="text-sm font-medium mb-1 block">Property</label>
          <Select
            value={selectedProperty.toString()}
            onValueChange={(value) => setSelectedProperty(value === "all" ? "all" : parseInt(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Year</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(isNaN(parseInt(value)) ? value : parseInt(value))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Quarter</label>
          <Select
            value={selectedQuarter.toString()}
            onValueChange={(value) => setSelectedQuarter(isNaN(parseInt(value)) ? value : parseInt(value))}
            disabled={selectedYear === "custom"}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year</SelectItem>
              <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
              <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
              <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
              <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="mt-6" onClick={() => generateReport('Custom')}>
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Available Reports</TabsTrigger>
          <TabsTrigger value="tax">Tax Preparation</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        {/* Available Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary" />
                  Income & Expense Report
                </CardTitle>
                <CardDescription>Detailed breakdown of all income and expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and download a comprehensive report of all transactions, categorized by type.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Income & Expense')}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Profit & Loss Statement
                </CardTitle>
                <CardDescription>Financial performance summary</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Summary of revenues, costs, and expenses for the selected period.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Profit & Loss')}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-primary" />
                  Expense Analysis
                </CardTitle>
                <CardDescription>Expense categorization and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Detailed breakdown of expenses by category with comparative analysis.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Expense Analysis')}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Property Performance
                </CardTitle>
                <CardDescription>ROI and property financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Analysis of property financial performance, ROI, and occupancy metrics.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Property Performance')}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  Annual Summary
                </CardTitle>
                <CardDescription>Year-end financial summary</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Comprehensive annual overview of all financial activities and position.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Annual Summary')}>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Custom Report
                </CardTitle>
                <CardDescription>Create a custom report</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate a tailored report with your selected parameters and metrics.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => generateReport('Custom')}>
                  <Download className="h-4 w-4 mr-2" />
                  Create Custom Report
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Tax Preparation Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Preparation Assistant</CardTitle>
              <CardDescription>
                Tools and reports to help with tax preparation for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Available Tax Years</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxYears?.length ? (
                      taxYears.map((taxYear) => (
                        <TableRow key={taxYear.id}>
                          <TableCell className="font-medium">{taxYear.name}</TableCell>
                          <TableCell>{format(new Date(taxYear.startDate), 'dd.MM.yyyy')}</TableCell>
                          <TableCell>{taxYear.endDate ? format(new Date(taxYear.endDate), 'dd.MM.yyyy') : 'Ongoing'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              taxYear.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              taxYear.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {taxYear.status === 'completed' ? 'Completed' : 
                               taxYear.status === 'in_progress' ? 'In Progress' : 
                               'Not Started'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="mr-2" 
                                    onClick={() => generateReport(`TaxYear-${taxYear.id}`)}>
                              <Download className="h-3 w-3 mr-1" />
                              Tax Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No tax years configured. Set up a tax year to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Tax Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Income Statement for Tax</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Detailed income breakdown optimized for tax filing
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => generateReport('Tax Income Statement')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Tax Deduction Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Summary of all potential tax deductible expenses
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => generateReport('Tax Deductions')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Property Depreciation Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Depreciation calculations for all qualifying properties
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => generateReport('Depreciation Schedule')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Tax Summary Package</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Complete tax filing package with all relevant documents
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => generateReport('Tax Package')}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecasting Tab */}
        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Forecasting</CardTitle>
              <CardDescription>
                Budget and financial projections based on historical data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Budget Planning</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage budgets for your properties based on historical data and future projections.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Annual Budget Planner</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Create a comprehensive annual budget with monthly breakdowns
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline">Create Budget</Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Budget vs Actual Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Compare your actual performance against your budget
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline" onClick={() => generateReport('Budget vs Actual')}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <h3 className="text-lg font-medium">Forecasting Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Project future financial performance based on historical trends and market conditions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Cash Flow Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Forecast your expected cash flow for the next 12 months
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline" onClick={() => generateReport('Cash Flow Projection')}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Forecast
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Revenue Growth Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Analyze potential revenue growth scenarios for your properties
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline" onClick={() => generateReport('Revenue Growth')}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Analysis
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">5-Year Projection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Long-term financial projection for your property portfolio
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline" onClick={() => generateReport('5-Year Projection')}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Investment ROI Calculator</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Calculate potential return on investment for property upgrades
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline">
                        Open Calculator
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}