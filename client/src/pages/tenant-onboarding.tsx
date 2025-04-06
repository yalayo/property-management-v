import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { OnboardingWizard } from '../tenant/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function TenantOnboardingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Fetch available properties
  const { data: properties, isLoading: propertiesLoading, error } = useQuery({
    queryKey: ['/api/properties/available'],
    enabled: !!user,
  });
  
  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access the tenant application form.',
        variant: 'destructive',
      });
      setLocation('/auth');
    }
  }, [authLoading, user, setLocation, toast]);
  
  // Show loading state
  if (authLoading || propertiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-10 p-6 bg-destructive/10 rounded-lg">
        <h2 className="text-xl font-bold text-destructive mb-2">Error Loading Properties</h2>
        <p className="text-muted-foreground">
          There was an error loading available properties: {error.message}
        </p>
      </div>
    );
  }
  
  // Extract property ID from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId') ? parseInt(urlParams.get('propertyId')!) : undefined;
  
  return (
    <div className="container py-10">
      <OnboardingWizard
        propertyId={propertyId}
        availableProperties={properties || []}
      />
    </div>
  );
}