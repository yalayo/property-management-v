import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation, Redirect, Route, RouteComponentProps } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Create the component renderer that will handle redirects
  const ProtectedComponent = (props: any) => {
    if (!user) {
      return <Redirect to="/login" />;
    }
    
    return <Component {...props} />;
  };

  // Return the route with the protected component
  return <Route path={path} component={ProtectedComponent} />;
}