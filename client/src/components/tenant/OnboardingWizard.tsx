import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '../ui/form';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight, FileText, Upload, User, Check } from 'lucide-react';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { Progress } from '../ui/progress';
import { FileUpload } from '../files/FileUpload';
import { SignaturePad } from './SignaturePad';

// Validation schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  dateOfBirth: z.date(),
  idNumber: z.string().min(6, 'ID/Passport number is required'),
});

const employmentInfoSchema = z.object({
  employmentStatus: z.enum(['employed', 'self-employed', 'student', 'retired', 'unemployed']),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncome: z.string().optional(),
  employmentStartDate: z.date().optional(),
  employerContactName: z.string().optional(),
  employerContactPhone: z.string().optional(),
  additionalIncomeSources: z.string().optional(),
});

const referencesSchema = z.object({
  personalReferences: z.array(
    z.object({
      name: z.string().min(2, 'Name is required'),
      relationship: z.string().min(2, 'Relationship is required'),
      phone: z.string().min(10, 'Phone number is required'),
      email: z.string().email().optional(),
    })
  ).min(1, 'At least one personal reference is required'),
  previousLandlords: z.array(
    z.object({
      name: z.string().min(2, 'Name is required'),
      propertyAddress: z.string().min(5, 'Address is required'),
      phone: z.string().min(10, 'Phone number is required'),
      email: z.string().email().optional(),
      rentalPeriod: z.string().min(3, 'Rental period is required'),
    })
  ).optional(),
});

const bankingInfoSchema = z.object({
  accountHolder: z.string().min(2, 'Account holder name is required'),
  accountNumber: z.string().min(5, 'Account number is required'),
  iban: z.string().min(15, 'IBAN is required').optional(),
  bankName: z.string().min(2, 'Bank name is required'),
  branchCode: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'direct_debit', 'standing_order', 'other']),
  preferredPaymentDay: z.number().min(1).max(31),
  authorizeDirectDebit: z.boolean().optional(),
});

const leaseInfoSchema = z.object({
  propertyId: z.number(),
  unitNumber: z.string().optional(),
  leaseStart: z.date(),
  leaseEnd: z.date().optional(),
  leaseTerms: z.enum(['month-to-month', '6-month', '1-year', '2-year', 'other']),
  monthlyRent: z.number().min(1, 'Monthly rent is required'),
  securityDeposit: z.number().min(0),
  petDeposit: z.number().min(0).optional(),
  hasPets: z.boolean(),
  petDetails: z.string().optional(),
  occupants: z.number().min(1, 'Number of occupants is required'),
  occupantNames: z.string().optional(),
  parkingSpaces: z.number().min(0),
  specialTerms: z.string().optional(),
});

const documentsSchema = z.object({
  idDocument: z.any().optional(), // Will be file upload
  proofOfIncome: z.any().optional(), // Will be file upload
  creditReport: z.any().optional(), // Will be file upload
  additionalDocuments: z.array(z.any()).optional(),
  backgroundCheckConsent: z.boolean(),
  creditCheckConsent: z.boolean(),
  termsAndConditions: z.boolean(),
  signature: z.string(),
});

// Combined schema for the entire form
const tenantOnboardingSchema = z.object({
  personalInfo: personalInfoSchema,
  employmentInfo: employmentInfoSchema,
  references: referencesSchema,
  bankingInfo: bankingInfoSchema,
  leaseInfo: leaseInfoSchema,
  documents: documentsSchema,
});

type TenantOnboardingFormValues = z.infer<typeof tenantOnboardingSchema>;

interface OnboardingWizardProps {
  propertyId?: number;
  availableProperties?: any[];
}

export function OnboardingWizard({ propertyId, availableProperties = [] }: OnboardingWizardProps) {
  const [step, setStep] = useState<
    'personal' | 'employment' | 'references' | 'banking' | 'lease' | 'documents' | 'review' | 'success'
  >('personal');
  const [formData, setFormData] = useState<Partial<TenantOnboardingFormValues>>({
    personalInfo: undefined,
    employmentInfo: undefined,
    references: undefined,
    bankingInfo: undefined,
    leaseInfo: undefined,
    documents: undefined,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Setup the form for the current step
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: formData.personalInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      idNumber: '',
    },
  });

  const employmentInfoForm = useForm<z.infer<typeof employmentInfoSchema>>({
    resolver: zodResolver(employmentInfoSchema),
    defaultValues: formData.employmentInfo || {
      employmentStatus: 'employed',
      employer: '',
      jobTitle: '',
      monthlyIncome: '',
      employerContactName: '',
      employerContactPhone: '',
      additionalIncomeSources: '',
    },
  });

  const referencesForm = useForm<z.infer<typeof referencesSchema>>({
    resolver: zodResolver(referencesSchema),
    defaultValues: formData.references || {
      personalReferences: [{ name: '', relationship: '', phone: '', email: '' }],
      previousLandlords: [{ name: '', propertyAddress: '', phone: '', email: '', rentalPeriod: '' }],
    },
  });

  const bankingInfoForm = useForm<z.infer<typeof bankingInfoSchema>>({
    resolver: zodResolver(bankingInfoSchema),
    defaultValues: formData.bankingInfo || {
      accountHolder: '',
      accountNumber: '',
      iban: '',
      bankName: '',
      branchCode: '',
      paymentMethod: 'bank_transfer',
      preferredPaymentDay: 1,
      authorizeDirectDebit: false,
    },
  });

  const leaseInfoForm = useForm<z.infer<typeof leaseInfoSchema>>({
    resolver: zodResolver(leaseInfoSchema),
    defaultValues: formData.leaseInfo || {
      propertyId: propertyId || 0,
      unitNumber: '',
      leaseTerms: '1-year',
      monthlyRent: 0,
      securityDeposit: 0,
      petDeposit: 0,
      hasPets: false,
      petDetails: '',
      occupants: 1,
      occupantNames: '',
      parkingSpaces: 0,
      specialTerms: '',
    },
  });

  const documentsForm = useForm<z.infer<typeof documentsSchema>>({
    resolver: zodResolver(documentsSchema),
    defaultValues: formData.documents || {
      backgroundCheckConsent: false,
      creditCheckConsent: false,
      termsAndConditions: false,
      signature: '',
    },
  });
  
  // Calculate the progress
  const getProgressPercentage = () => {
    const stepValues: Record<string, number> = {
      'personal': 0,
      'employment': 16.6,
      'references': 33.2,
      'banking': 49.8,
      'lease': 66.4,
      'documents': 83,
      'review': 100,
      'success': 100,
    };
    return stepValues[step];
  };
  
  // Handle step completion and navigation
  const handleNext = (data: any) => {
    switch (step) {
      case 'personal':
        setFormData({ ...formData, personalInfo: data });
        setStep('employment');
        break;
      case 'employment':
        setFormData({ ...formData, employmentInfo: data });
        setStep('references');
        break;
      case 'references':
        setFormData({ ...formData, references: data });
        setStep('banking');
        break;
      case 'banking':
        setFormData({ ...formData, bankingInfo: data });
        setStep('lease');
        break;
      case 'lease':
        setFormData({ ...formData, leaseInfo: data });
        setStep('documents');
        break;
      case 'documents':
        setFormData({ ...formData, documents: data });
        setStep('review');
        break;
      case 'review':
        submitTenantApplication();
        break;
    }
  };
  
  const handleBack = () => {
    switch (step) {
      case 'employment':
        setStep('personal');
        break;
      case 'references':
        setStep('employment');
        break;
      case 'banking':
        setStep('references');
        break;
      case 'lease':
        setStep('banking');
        break;
      case 'documents':
        setStep('lease');
        break;
      case 'review':
        setStep('documents');
        break;
    }
  };
  
  // Handle form submission
  const { mutate: submitTenantApplication, isPending } = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/tenant-application', formData);
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your tenant application has been successfully submitted.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-applications'] });
      setStep('success');
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Error',
        description: `There was an error submitting your application: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle adding new reference fields
  const addPersonalReference = () => {
    const currentReferences = referencesForm.getValues('personalReferences') || [];
    referencesForm.setValue('personalReferences', [
      ...currentReferences,
      { name: '', relationship: '', phone: '', email: '' },
    ]);
  };
  
  const addPreviousLandlord = () => {
    const currentLandlords = referencesForm.getValues('previousLandlords') || [];
    referencesForm.setValue('previousLandlords', [
      ...currentLandlords,
      { name: '', propertyAddress: '', phone: '', email: '', rentalPeriod: '' },
    ]);
  };
  
  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 'personal':
        return (
          <Form {...personalInfoForm}>
            <form onSubmit={personalInfoForm.handleSubmit(handleNext)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={personalInfoForm.control}
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
                  control={personalInfoForm.control}
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
                
                <FormField
                  control={personalInfoForm.control}
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
                  control={personalInfoForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+49 1234 567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID/Passport Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ID or passport number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit">Next: Employment Information</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'employment':
        return (
          <Form {...employmentInfoForm}>
            <form onSubmit={employmentInfoForm.handleSubmit(handleNext)} className="space-y-6">
              <FormField
                control={employmentInfoForm.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="self-employed">Self-employed</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {employmentInfoForm.watch('employmentStatus') === 'employed' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={employmentInfoForm.control}
                      name="employer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employer</FormLabel>
                          <FormControl>
                            <Input placeholder="Company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={employmentInfoForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Your position" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={employmentInfoForm.control}
                      name="monthlyIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Income (€)</FormLabel>
                          <FormControl>
                            <Input placeholder="3000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={employmentInfoForm.control}
                      name="employmentStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Employment Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={employmentInfoForm.control}
                      name="employerContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employer Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="HR manager or supervisor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={employmentInfoForm.control}
                      name="employerContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employer Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+49 1234 567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              <FormField
                control={employmentInfoForm.control}
                name="additionalIncomeSources"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Income Sources (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any additional sources of income"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit">Next: References</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'references':
        return (
          <Form {...referencesForm}>
            <form onSubmit={referencesForm.handleSubmit(handleNext)} className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Personal References</h3>
                
                {referencesForm.watch('personalReferences')?.map((_, index) => (
                  <div 
                    key={`personal-ref-${index}`} 
                    className="border rounded-md p-4 mb-4"
                  >
                    <h4 className="font-medium mb-2">Personal Reference {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={referencesForm.control}
                        name={`personalReferences.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`personalReferences.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                              <Input placeholder="Friend, colleague, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`personalReferences.${index}.phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+49 1234 567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`personalReferences.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPersonalReference}
                  className="mt-2"
                >
                  Add Another Personal Reference
                </Button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Previous Landlords (Optional)</h3>
                
                {referencesForm.watch('previousLandlords')?.map((_, index) => (
                  <div 
                    key={`landlord-${index}`} 
                    className="border rounded-md p-4 mb-4"
                  >
                    <h4 className="font-medium mb-2">Previous Landlord {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={referencesForm.control}
                        name={`previousLandlords.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Landlord/Property Manager Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`previousLandlords.${index}.propertyAddress`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street, City, Postal Code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`previousLandlords.${index}.phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+49 1234 567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`previousLandlords.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={referencesForm.control}
                        name={`previousLandlords.${index}.rentalPeriod`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Rental Period</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Jan 2018 - Dec 2020" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPreviousLandlord}
                  className="mt-2"
                >
                  Add Previous Landlord
                </Button>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit">Next: Banking Information</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'banking':
        return (
          <Form {...bankingInfoForm}>
            <form onSubmit={bankingInfoForm.handleSubmit(handleNext)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={bankingInfoForm.control}
                  name="accountHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full account holder name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN (International Bank Account Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="DE89 3704 0044 0532 0130 00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bank name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="branchCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Code/BIC (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Branch code or BIC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="direct_debit">Direct Debit (Automatic Withdrawal)</SelectItem>
                          <SelectItem value="standing_order">Standing Order</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bankingInfoForm.control}
                  name="preferredPaymentDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Payment Day of Month</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={31} 
                          placeholder="1-31" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Day of the month when rent payment will be processed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {bankingInfoForm.watch('paymentMethod') === 'direct_debit' && (
                <FormField
                  control={bankingInfoForm.control}
                  name="authorizeDirectDebit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Direct Debit Authorization
                        </FormLabel>
                        <FormDescription>
                          I authorize the landlord to automatically withdraw the monthly rent amount from my bank account on the specified payment day.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit">Next: Lease Information</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'lease':
        return (
          <Form {...leaseInfoForm}>
            <form onSubmit={leaseInfoForm.handleSubmit(handleNext)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={leaseInfoForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableProperties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartment/Unit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="leaseStart"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="leaseEnd"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Lease End Date (Optional for open-ended leases)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => 
                              date < (leaseInfoForm.watch('leaseStart') || new Date())
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="leaseTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease Terms</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lease term" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="month-to-month">Month-to-Month</SelectItem>
                          <SelectItem value="6-month">6 Months</SelectItem>
                          <SelectItem value="1-year">1 Year</SelectItem>
                          <SelectItem value="2-year">2 Years</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="e.g., 1200"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="e.g., 2400"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="hasPets"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Pets
                        </FormLabel>
                        <FormDescription>
                          Check if you have or plan to have pets
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {leaseInfoForm.watch('hasPets') && (
                  <>
                    <FormField
                      control={leaseInfoForm.control}
                      name="petDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your pets (type, breed, size, age, etc.)"
                              {...field}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={leaseInfoForm.control}
                      name="petDeposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet Deposit (€)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="e.g., 300"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <FormField
                  control={leaseInfoForm.control}
                  name="occupants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Occupants</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          placeholder="Total number of people living in the unit"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="occupantNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Names of All Occupants (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List names of all people who will live in the unit"
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="parkingSpaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Spaces Required</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={0}
                          placeholder="Number of parking spaces needed"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leaseInfoForm.control}
                  name="specialTerms"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Special Terms or Requests (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special requests or conditions for the lease"
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit">Next: Documents & Signatures</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'documents':
        return (
          <Form {...documentsForm}>
            <form onSubmit={documentsForm.handleSubmit(handleNext)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-4">Required Documents</h3>
                  <div className="space-y-4">
                    <FormField
                      control={documentsForm.control}
                      name="idDocument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Document/Passport</FormLabel>
                          <FormControl>
                            <FileUpload
                              value={field.value}
                              onChange={field.onChange}
                              acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                              maxSizeInMB={5}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload a clear copy of your ID card or passport (max 5MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="proofOfIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof of Income</FormLabel>
                          <FormControl>
                            <FileUpload
                              value={field.value}
                              onChange={field.onChange}
                              acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                              maxSizeInMB={5}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload pay slips, employment contract, or tax returns (max 5MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="creditReport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Report (Optional)</FormLabel>
                          <FormControl>
                            <FileUpload
                              value={field.value}
                              onChange={field.onChange}
                              acceptedFileTypes={['.pdf']}
                              maxSizeInMB={5}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload a recent credit report if available (max 5MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="additionalDocuments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Documents (Optional)</FormLabel>
                          <FormControl>
                            <FileUpload
                              value={field.value}
                              onChange={field.onChange}
                              multiple={true}
                              acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                              maxSizeInMB={10}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload any additional supporting documents (max 10MB total)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="col-span-2">
                  <h3 className="text-lg font-medium mb-4">Consents and Signature</h3>
                  <div className="space-y-4">
                    <FormField
                      control={documentsForm.control}
                      name="backgroundCheckConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Background Check Consent
                            </FormLabel>
                            <FormDescription>
                              I authorize the landlord to perform a background check, which may include criminal history, eviction records, and other relevant information.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="creditCheckConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Credit Check Consent
                            </FormLabel>
                            <FormDescription>
                              I authorize the landlord to perform a credit check and obtain my credit report.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="termsAndConditions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Terms and Conditions
                            </FormLabel>
                            <FormDescription>
                              I confirm that all information provided in this application is true and complete. I understand that providing false information may result in rejection of my application or termination of tenancy.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={documentsForm.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Digital Signature</FormLabel>
                          <FormControl>
                            <SignaturePad
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Please sign in the box above using your mouse or touchscreen
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button type="submit">Review Application</Button>
              </div>
            </form>
          </Form>
        );
        
      case 'review':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Application Review</h2>
              <p className="text-muted-foreground">
                Please review your application details before final submission. You can go back to any section to make changes.
              </p>
            </div>
            
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="references">References</TabsTrigger>
                <TabsTrigger value="banking">Banking</TabsTrigger>
                <TabsTrigger value="lease">Lease</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm">
                        {formData.personalInfo?.firstName} {formData.personalInfo?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm">{formData.personalInfo?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm">{formData.personalInfo?.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Date of Birth</p>
                      <p className="text-sm">
                        {formData.personalInfo?.dateOfBirth 
                          ? format(formData.personalInfo.dateOfBirth, 'PPP') 
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">ID/Passport Number</p>
                      <p className="text-sm">{formData.personalInfo?.idNumber}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('personal')}
                    >
                      Edit Personal Information
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="employment">
                <Card>
                  <CardHeader>
                    <CardTitle>Employment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Employment Status</p>
                      <p className="text-sm">{formData.employmentInfo?.employmentStatus}</p>
                    </div>
                    {formData.employmentInfo?.employmentStatus === 'employed' && (
                      <>
                        <div>
                          <p className="text-sm font-medium">Employer</p>
                          <p className="text-sm">{formData.employmentInfo?.employer || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Job Title</p>
                          <p className="text-sm">{formData.employmentInfo?.jobTitle || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Monthly Income</p>
                          <p className="text-sm">€{formData.employmentInfo?.monthlyIncome || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Employment Start Date</p>
                          <p className="text-sm">
                            {formData.employmentInfo?.employmentStartDate 
                              ? format(formData.employmentInfo.employmentStartDate, 'PPP') 
                              : 'Not provided'}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <p className="text-sm font-medium">Additional Income Sources</p>
                      <p className="text-sm">{formData.employmentInfo?.additionalIncomeSources || 'None'}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('employment')}
                    >
                      Edit Employment Information
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="references">
                <Card>
                  <CardHeader>
                    <CardTitle>References</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Personal References</h3>
                      <div className="space-y-4">
                        {formData.references?.personalReferences?.map((ref, index) => (
                          <div key={index} className="border rounded-md p-3">
                            <p className="text-sm font-medium">{ref.name}</p>
                            <p className="text-sm">Relationship: {ref.relationship}</p>
                            <p className="text-sm">Phone: {ref.phone}</p>
                            {ref.email && <p className="text-sm">Email: {ref.email}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {formData.references?.previousLandlords && formData.references.previousLandlords.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Previous Landlords</h3>
                        <div className="space-y-4">
                          {formData.references.previousLandlords.map((landlord, index) => (
                            <div key={index} className="border rounded-md p-3">
                              <p className="text-sm font-medium">{landlord.name}</p>
                              <p className="text-sm">Property: {landlord.propertyAddress}</p>
                              <p className="text-sm">Period: {landlord.rentalPeriod}</p>
                              <p className="text-sm">Phone: {landlord.phone}</p>
                              {landlord.email && <p className="text-sm">Email: {landlord.email}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('references')}
                    >
                      Edit References
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="banking">
                <Card>
                  <CardHeader>
                    <CardTitle>Banking Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Account Holder</p>
                      <p className="text-sm">{formData.bankingInfo?.accountHolder}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bank Name</p>
                      <p className="text-sm">{formData.bankingInfo?.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Account Number</p>
                      <p className="text-sm">{formData.bankingInfo?.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">IBAN</p>
                      <p className="text-sm">{formData.bankingInfo?.iban || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Payment Method</p>
                      <p className="text-sm">{formData.bankingInfo?.paymentMethod.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Preferred Payment Day</p>
                      <p className="text-sm">{formData.bankingInfo?.preferredPaymentDay}</p>
                    </div>
                    {formData.bankingInfo?.paymentMethod === 'direct_debit' && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium">Direct Debit Authorization</p>
                        <p className="text-sm">
                          {formData.bankingInfo.authorizeDirectDebit ? 'Authorized' : 'Not authorized'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('banking')}
                    >
                      Edit Banking Information
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="lease">
                <Card>
                  <CardHeader>
                    <CardTitle>Lease Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Property</p>
                      <p className="text-sm">
                        {availableProperties.find(p => p.id === formData.leaseInfo?.propertyId)?.name || 'Not selected'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Unit Number</p>
                      <p className="text-sm">{formData.leaseInfo?.unitNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lease Start Date</p>
                      <p className="text-sm">
                        {formData.leaseInfo?.leaseStart ? format(formData.leaseInfo.leaseStart, 'PPP') : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lease End Date</p>
                      <p className="text-sm">
                        {formData.leaseInfo?.leaseEnd 
                          ? format(formData.leaseInfo.leaseEnd, 'PPP') 
                          : 'Open-ended lease'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lease Terms</p>
                      <p className="text-sm">{formData.leaseInfo?.leaseTerms}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Monthly Rent</p>
                      <p className="text-sm">€{formData.leaseInfo?.monthlyRent}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Security Deposit</p>
                      <p className="text-sm">€{formData.leaseInfo?.securityDeposit}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pets</p>
                      <p className="text-sm">{formData.leaseInfo?.hasPets ? 'Yes' : 'No'}</p>
                    </div>
                    {formData.leaseInfo?.hasPets && (
                      <>
                        <div>
                          <p className="text-sm font-medium">Pet Deposit</p>
                          <p className="text-sm">€{formData.leaseInfo?.petDeposit || 0}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium">Pet Details</p>
                          <p className="text-sm">{formData.leaseInfo?.petDetails || 'Not provided'}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm font-medium">Number of Occupants</p>
                      <p className="text-sm">{formData.leaseInfo?.occupants}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Parking Spaces</p>
                      <p className="text-sm">{formData.leaseInfo?.parkingSpaces}</p>
                    </div>
                    {formData.leaseInfo?.specialTerms && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium">Special Terms</p>
                        <p className="text-sm">{formData.leaseInfo.specialTerms}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('lease')}
                    >
                      Edit Lease Information
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Documents & Consents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Uploaded Documents</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {formData.documents?.idDocument && (
                          <li className="text-sm">ID Document/Passport</li>
                        )}
                        {formData.documents?.proofOfIncome && (
                          <li className="text-sm">Proof of Income</li>
                        )}
                        {formData.documents?.creditReport && (
                          <li className="text-sm">Credit Report</li>
                        )}
                        {formData.documents?.additionalDocuments?.length > 0 && (
                          <li className="text-sm">
                            Additional Documents ({formData.documents.additionalDocuments.length})
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Consents</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        <li className="text-sm">
                          Background Check Consent: {formData.documents?.backgroundCheckConsent ? 'Yes' : 'No'}
                        </li>
                        <li className="text-sm">
                          Credit Check Consent: {formData.documents?.creditCheckConsent ? 'Yes' : 'No'}
                        </li>
                        <li className="text-sm">
                          Terms and Conditions: {formData.documents?.termsAndConditions ? 'Accepted' : 'Not accepted'}
                        </li>
                      </ul>
                    </div>
                    
                    {formData.documents?.signature && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Digital Signature</h3>
                        <div className="border rounded-md p-2">
                          <img 
                            src={formData.documents.signature} 
                            alt="Signature" 
                            className="max-h-20"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setStep('documents')}
                    >
                      Edit Documents & Consents
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                type="button" 
                onClick={() => submitTenantApplication()}
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </div>
        );
        
      case 'success':
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Your tenant application has been successfully submitted. We will review your application and get back to you shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                Return to Dashboard
              </Button>
              <Button
                onClick={() => {
                  // Reset form and start new application
                  setFormData({});
                  setStep('personal');
                  navigate('/tenant-onboarding');
                }}
              >
                Submit Another Application
              </Button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {step !== 'success' && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Tenant Application</h2>
          <p className="text-muted-foreground mb-6">
            Please complete all sections of the application form accurately.
          </p>
          
          <div className="mb-8">
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Personal</span>
              <span>Employment</span>
              <span>References</span>
              <span>Banking</span>
              <span>Lease</span>
              <span>Documents</span>
              <span>Review</span>
            </div>
          </div>
          
          <div className="flex items-center mb-6">
            {step === 'personal' && (
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="font-medium">Personal Information</span>
              </div>
            )}
            {step === 'employment' && (
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Employment Information</span>
              </div>
            )}
            {step === 'references' && (
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">References</span>
              </div>
            )}
            {step === 'banking' && (
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="font-medium">Banking Information</span>
              </div>
            )}
            {step === 'lease' && (
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                <span className="font-medium">Lease Information</span>
              </div>
            )}
            {step === 'documents' && (
              <div className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                <span className="font-medium">Documents & Signature</span>
              </div>
            )}
            {step === 'review' && (
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">Review Application</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div>
        {renderStep()}
      </div>
    </div>
  );
}