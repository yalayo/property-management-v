import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TenantOnboardingWizard from '@/components/tenants/TenantOnboardingWizard';

export default function TenantOnboardingPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const propertyId = params.propertyId ? parseInt(params.propertyId) : undefined;
  const tenantId = params.tenantId ? parseInt(params.tenantId) : undefined;
  
  // Fetch existing tenant data if we're editing
  const { data: existingTenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: tenantId ? [`/api/tenants/${tenantId}`] : null,
    enabled: !!tenantId,
  });

  // Fetch property data if propertyId is provided
  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: propertyId ? [`/api/properties/${propertyId}`] : null,
    enabled: !!propertyId,
  });

  if (!user) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-lg mb-4">You need to be logged in to access this page.</p>
          <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  if (isLoadingTenant || isLoadingProperty) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Prepare the existing data for the wizard from the fetched tenant data
  const existingData = tenantId && existingTenant ? {
    personalInfo: {
      firstName: existingTenant.firstName || '',
      lastName: existingTenant.lastName || '',
      email: existingTenant.email || '',
      phone: existingTenant.phone || '',
      dateOfBirth: existingTenant.dateOfBirth ? new Date(existingTenant.dateOfBirth) : undefined,
      idNumber: existingTenant.idNumber || '',
    },
    employmentInfo: {
      employmentStatus: existingTenant.employmentStatus || 'employed',
      employerName: existingTenant.employerName || '',
      employerPhone: existingTenant.employerPhone || '',
      occupation: existingTenant.occupation || '',
      monthlyIncome: existingTenant.monthlyIncome?.toString() || '',
      employmentDuration: existingTenant.employmentDuration || '',
    },
    // Add other sections as needed based on your data structure
  } : undefined;

  return (
    <div className="container max-w-7xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {tenantId ? 'Update Tenant Details' : 'New Tenant Onboarding'}
        </h1>
        <p className="text-muted-foreground">
          {propertyId && property 
            ? `Property: ${property.name || property.address}`
            : 'Complete the form to onboard a new tenant'}
        </p>
      </div>

      <TenantOnboardingWizard 
        propertyId={propertyId}
        tenantId={tenantId}
        existingData={existingData}
        onComplete={(data) => {
          // Handle completion, e.g., navigate to the tenant details page
          navigate(propertyId 
            ? `/properties/${propertyId}/tenants/${data.id}` 
            : `/tenants/${data.id}`);
        }}
      />
    </div>
  );
}