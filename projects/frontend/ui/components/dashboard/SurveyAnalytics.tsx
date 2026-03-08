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
  Cell 
} from "recharts";

export default function SurveyAnalytics() {
  // Fetch survey analytics
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['/api/admin/survey-analytics'],
    queryFn: () => fetch('/api/admin/survey-analytics').then(res => res.json())
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">Failed to load survey results. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no data, show empty state
  if (!analytics || analytics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No survey responses yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort analytics by yes percentage (highest first)
  const sortedAnalytics = [...analytics].sort((a, b) => b.yesPercentage - a.yesPercentage);
  
  // Prepare data for the pie chart (top 5 challenges)
  const topChallenges = sortedAnalytics.slice(0, 5);
  const pieChartData = topChallenges.map(item => ({
    name: item.questionText,
    value: item.yesCount,
  }));

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Survey Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4">Top Challenges Identified</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">All Survey Responses</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis 
                    type="category" 
                    dataKey="questionText" 
                    width={150} 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Yes Responses']}
                  />
                  <Legend />
                  <Bar dataKey="yesPercentage" name="Yes %" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Key Insights</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <ul className="list-disc list-inside space-y-2 text-blue-900">
                {topChallenges.map((challenge, index) => (
                  <li key={index}>
                    <span className="font-medium">{challenge.questionText}:</span> {challenge.yesPercentage}% of respondents 
                    answered "Yes" ({challenge.yesCount} out of {challenge.totalResponses})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
