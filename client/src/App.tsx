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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/waiting-list" component={WaitingList} />
      <Route path="/payment/:tier" component={Payment} />
      <Route path="/survey-results" component={SurveyResults} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/features-pricing" component={FeaturesPricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
