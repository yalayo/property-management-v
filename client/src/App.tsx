import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import WaitingList from "@/pages/waiting-list";
import Payment from "@/pages/payment";
import SurveyResults from "@/pages/survey-results";
import Onboarding from "@/pages/onboarding";
import FeaturesPricing from "@/pages/features-pricing";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminSurveyAnalytics from "@/pages/admin/survey-analytics";
import AdminWaitingList from "@/pages/admin/waiting-list";
import Login from "@/pages/login";
import Register from "@/pages/register";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/waiting-list" component={WaitingList} />
      <Route path="/payment/:tier" component={Payment} />
      <Route path="/survey-results" component={SurveyResults} />
      <Route path="/features-pricing" component={FeaturesPricing} />
      
      {/* Protected user routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/onboarding" component={Onboarding} />
      
      {/* Admin routes */}
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/survey-analytics" component={AdminSurveyAnalytics} />
      <Route path="/admin/waiting-list" component={AdminWaitingList} />
      
      {/* Fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
