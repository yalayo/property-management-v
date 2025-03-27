import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, Home, User, FileText, Euro, AlertCircle } from "lucide-react";

// Define the validation schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(5, "Please enter a valid phone number"),
});

const propertyInfoSchema = z.object({
  numberOfProperties: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Please enter a valid number",
  }),
  propertyTypes: z.array(z.string()).min(1, "Select at least one property type"),
  mainPropertyAddress: z.string().min(5, "Please enter a valid address"),
});

const financialInfoSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  iban: z.string().min(15, "Please enter a valid IBAN"),
  taxId: z.string().optional(),
  monthlyRentCollection: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Please enter a valid amount",
  }),
});

const preferencesSchema = z.object({
  preferredCommunication: z.enum(["email", "phone", "whatsapp"], {
    required_error: "Please select a communication preference",
  }),
  receiveReports: z.boolean().default(true),
  automaticReminders: z.boolean().default(true),
  additionalNotes: z.string().optional(),
});

// Define types
type PersonalInfo = z.infer<typeof personalInfoSchema>;
type PropertyInfo = z.infer<typeof propertyInfoSchema>;
type FinancialInfo = z.infer<typeof financialInfoSchema>;
type Preferences = z.infer<typeof preferencesSchema>;

// Combined form data
type OnboardingData = PersonalInfo & PropertyInfo & FinancialInfo & Preferences;

// Property type options
const propertyTypes = [
  { id: "apartment", label: "Apartment" },
  { id: "house", label: "House" },
  { id: "commercial", label: "Commercial" },
  { id: "land", label: "Land" },
  { id: "mixed_use", label: "Mixed Use" },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({});
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Setup form handlers for each step
  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
      phone: formData.phone || "",
    },
  });

  const propertyForm = useForm<PropertyInfo>({
    resolver: zodResolver(propertyInfoSchema),
    defaultValues: {
      numberOfProperties: formData.numberOfProperties || "",
      propertyTypes: formData.propertyTypes || [],
      mainPropertyAddress: formData.mainPropertyAddress || "",
    },
  });

  const financialForm = useForm<FinancialInfo>({
    resolver: zodResolver(financialInfoSchema),
    defaultValues: {
      bankName: formData.bankName || "",
      iban: formData.iban || "",
      taxId: formData.taxId || "",
      monthlyRentCollection: formData.monthlyRentCollection || "",
    },
  });

  const preferencesForm = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      preferredCommunication: formData.preferredCommunication || "email",
      receiveReports: formData.receiveReports !== undefined ? formData.receiveReports : true,
      automaticReminders: formData.automaticReminders !== undefined ? formData.automaticReminders : true,
      additionalNotes: formData.additionalNotes || "",
    },
  });

  // Setup the mutation to save onboarding data
  const submitMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsComplete(true);
      
      toast({
        title: "Setup complete!",
        description: "Your landlord account has been set up successfully.",
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions for each step
  const onPersonalSubmit = (data: PersonalInfo) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const onPropertySubmit = (data: PropertyInfo) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(3);
  };

  const onFinancialSubmit = (data: FinancialInfo) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(4);
  };

  const onPreferencesSubmit = (data: Preferences) => {
    const completeData = { ...formData, ...data } as OnboardingData;
    setFormData(completeData);
    submitMutation.mutate(completeData);
  };

  // Calculate progress percentage
  const progress = (step / 4) * 100;

  // Helper to get the active form
  const getActiveForm = () => {
    switch (step) {
      case 1:
        return {
          form: personalForm,
          onSubmit: onPersonalSubmit,
          title: "Personal Information",
          description: "Tell us about yourself",
          icon: <User className="w-6 h-6 text-primary" />,
        };
      case 2:
        return {
          form: propertyForm,
          onSubmit: onPropertySubmit,
          title: "Property Details",
          description: "Tell us about your properties",
          icon: <Home className="w-6 h-6 text-primary" />,
        };
      case 3:
        return {
          form: financialForm,
          onSubmit: onFinancialSubmit,
          title: "Financial Information",
          description: "Setup your banking information",
          icon: <Euro className="w-6 h-6 text-primary" />,
        };
      case 4:
        return {
          form: preferencesForm,
          onSubmit: onPreferencesSubmit,
          title: "Preferences",
          description: "Customize your experience",
          icon: <FileText className="w-6 h-6 text-primary" />,
        };
      default:
        return {
          form: personalForm,
          onSubmit: onPersonalSubmit,
          title: "Personal Information",
          description: "Tell us about yourself",
          icon: <User className="w-6 h-6 text-primary" />,
        };
    }
  };

  const { form, onSubmit, title, description, icon } = getActiveForm();

  // Render completion screen if the setup is complete
  if (isComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Setup Complete!</CardTitle>
            <CardDescription>
              Your landlord account has been set up successfully. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-2">
            {icon}
            <div className="ml-4">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Step {step} of 4</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+49 123 4567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="numberOfProperties"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Properties</FormLabel>
                        <FormControl>
                          <Input placeholder="1" type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          How many properties do you currently manage?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="propertyTypes"
                    render={({ field }) => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Property Types</FormLabel>
                          <FormDescription>
                            Select all property types that apply
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {propertyTypes.map((type) => (
                            <div key={type.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <Checkbox
                                id={`property-type-${type.id}`}
                                checked={field.value?.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  const newValue = checked
                                    ? [...currentValue, type.id]
                                    : currentValue.filter((val) => val !== type.id);
                                  field.onChange(newValue);
                                }}
                              />
                              <label 
                                htmlFor={`property-type-${type.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {type.label}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mainPropertyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main Property Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Hauptstraße 1, 10115 Berlin, Germany"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Deutsche Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input placeholder="DE89 3704 0044 0532 0130 00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your tax identification number" {...field} />
                        </FormControl>
                        <FormDescription>
                          This helps with generating tax reports
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyRentCollection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent Collection (€)</FormLabel>
                        <FormControl>
                          <Input placeholder="1000" type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Approximate total monthly rent from all properties
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <FormField
                    control={form.control}
                    name="preferredCommunication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Communication Method</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preferred method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How would you like to receive updates and notifications?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        id="receive-reports"
                        checked={preferencesForm.getValues().receiveReports}
                        onCheckedChange={(checked) => {
                          preferencesForm.setValue("receiveReports", checked === true);
                        }}
                      />
                      <div className="space-y-1 leading-none">
                        <label htmlFor="receive-reports" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Receive Monthly Reports</label>
                        <p className="text-sm text-muted-foreground">
                          Get monthly reports about your rental properties
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-start space-x-3 space-y-0">
                      <Checkbox
                        id="automatic-reminders"
                        checked={preferencesForm.getValues().automaticReminders}
                        onCheckedChange={(checked) => {
                          preferencesForm.setValue("automaticReminders", checked === true);
                        }}
                      />
                      <div className="space-y-1 leading-none">
                        <label htmlFor="automatic-reminders" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Automatic Payment Reminders</label>
                        <p className="text-sm text-muted-foreground">
                          Send automatic reminders to tenants for late payments
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information we should know..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <CardFooter className="flex justify-between px-0 pb-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                  disabled={step === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  {step < 4 ? (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  ) : submitMutation.isPending ? (
                    "Saving..."
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}