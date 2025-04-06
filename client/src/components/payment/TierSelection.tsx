import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/use-toast';
import { apiRequest } from '../../lib/queryClient';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

type SubscriptionTier = {
  id: string;
  name: string;
  description: string;
  price: number;
  paymentType: 'monthly' | 'one-time';
  features: string[];
  popular?: boolean;
};

export function TierSelection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/user'],
  });

  const updateTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const res = await apiRequest('POST', '/api/update-tier', { tier: tierId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Subscription Updated',
        description: 'Your subscription tier has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update subscription: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId);
  };

  const handleUpdateTier = async () => {
    if (!selectedTier) return;
    
    if (selectedTier === 'done_for_you') {
      // For monthly subscription, redirect to subscription page
      setLocation('/subscribe');
    } else if (selectedTier === 'done_by_you') {
      // For 'Done By You' one-time payment
      setLocation('/checkout?tier=done_by_you&amount=950');
    } else if (selectedTier === 'done_with_you') {
      // For 'Done With You' one-time payment
      setLocation('/checkout?tier=done_with_you&amount=2700');
    } else {
      // For other tier updates that don't require payment
      updateTierMutation.mutate(selectedTier);
    }
  };

  // Subscription tiers data
  const tiers: SubscriptionTier[] = [
    {
      id: 'done_by_you',
      name: 'Done By You',
      description: 'Self-service option with basic features and setup guide',
      price: 950,
      paymentType: 'one-time',
      features: [
        'One-time installation fee €950',
        'Self-service software setup',
        'Basic property management features',
        'Email support',
        'Setup guide & documentation',
        'Additional hourly support available',
      ],
    },
    {
      id: 'done_with_you',
      name: 'Done With You',
      description: 'Guided implementation with training and advanced features',
      price: 2700,
      paymentType: 'one-time',
      features: [
        'One-time implementation fee €2,700',
        'Guided setup & configuration',
        'Full features & integrations',
        'Training sessions',
        'Data migration assistance',
        'Priority email & phone support',
        '3 months of free post-implementation support',
      ],
      popular: true,
    },
    {
      id: 'done_for_you',
      name: 'Done For You',
      description: 'Full-service monthly subscription with premium support',
      price: 35,
      paymentType: 'monthly',
      features: [
        '€35/month subscription',
        'Fully managed service',
        'Premium features & integrations',
        'Dedicated account manager',
        'Regular system updates',
        'Priority support 24/7',
        'Monthly performance reviews',
        'Custom report development',
      ],
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isCurrentTier = user?.tier === tier.id;
          const isSelected = selectedTier === tier.id;
          
          return (
            <Card 
              key={tier.id} 
              className={`
                border-2 transition-all 
                ${isCurrentTier ? 'border-primary bg-primary/5' : isSelected ? 'border-primary' : 'border-border'}
                ${tier.popular ? 'ring-1 ring-primary' : ''}
              `}
            >
              <CardHeader className="relative">
                {tier.popular && (
                  <Badge className="absolute right-4 top-4 bg-primary hover:bg-primary/90">
                    Popular
                  </Badge>
                )}
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription className="min-h-[50px]">
                  {tier.description}
                </CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">€{tier.price}</span>
                  {tier.paymentType === 'monthly' ? (
                    <span className="text-muted-foreground">/month</span>
                  ) : (
                    <span className="text-muted-foreground"> one-time</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <Separator className="mb-4" />
                <ul className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                {isCurrentTier ? (
                  <Button className="w-full" disabled variant="outline">
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleSelectTier(tier.id)}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedTier && (
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleUpdateTier}
            disabled={updateTierMutation.isPending || isUserLoading}
            className="px-6"
          >
            {updateTierMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue 
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}