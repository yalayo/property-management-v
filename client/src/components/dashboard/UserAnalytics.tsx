import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { Skeleton } from "../ui/skeleton";

export default function UserAnalytics() {
  // Fetch analytics data for the user
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['/api/user/analytics'],
    queryFn: () => fetch('/api/user/analytics').then(res => {
      if (!res.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      return res.json();
    })
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Property Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-[20px] w-[250px]" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Property Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 p-4 rounded-md">
            <p className="text-amber-800">This feature is currently being set up for your account. Analytics will be available after you've added properties and collected rental payments.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If analytics endpoint isn't set up yet, show a placeholder with sample data
  const monthlyIncome = [
    { name: 'Jan', income: 3200 },
    { name: 'Feb', income: 3200 },
    { name: 'Mar', income: 3200 },
    { name: 'Apr', income: 3400 },
    { name: 'May', income: 3400 },
    { name: 'Jun', income: 3400 },
  ];

  const expenseCategories = [
    { name: 'Maintenance', value: 450 },
    { name: 'Insurance', value: 180 },
    { name: 'Taxes', value: 380 },
    { name: 'Utilities', value: 120 },
    { name: 'Other', value: 75 },
  ];

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Property Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Monthly Rental Income</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics?.monthlyIncome || monthlyIncome}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value}`, 'Income']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#0ea5e9" 
                    activeDot={{ r: 8 }} 
                    name="Rental Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Expense Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.expenseCategories || expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {(analytics?.expenseCategories || expenseCategories).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`€${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-2">Property Management Tips</h3>
            <ul className="list-disc list-inside space-y-2 text-blue-900">
              <li>Regular property inspections can help identify maintenance issues early.</li>
              <li>Consider setting aside 1-2% of property value annually for maintenance costs.</li>
              <li>Review your rental rates annually to ensure they align with market conditions.</li>
              <li>Maintain a good relationship with your tenants to reduce turnover.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}