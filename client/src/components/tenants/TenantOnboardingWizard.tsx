import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';
import { Progress } from '../ui/progress';
import { FileUpload } from '../ui/file-upload';
import { Label } from '../ui/label';
import { Check, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

// Schema for Personal Information
const personalInfoSchema = z.object({
  firstName: z.string().min(2, { message: 'First name is required' }),
  lastName: z.string().min(2, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(8, { message: 'Valid phone number is required' }),
  dateOfBirth: z.date().optional(),
  idNumber: z.string().optional(),
});

// Schema for Employment Information
const employmentInfoSchema = z.object({
  employmentStatus: z.enum(['employed', 'self-employed', 'student', 'unemployed', 'retired']),
  employerName: z.string().optional(),
  employerPhone: z.string().optional(),
  occupation: z.string().optional(),
  monthlyIncome: z.string().optional(),
  employmentDuration: z.string().optional(),
});

// Schema for References
const referencesSchema = z.object({
  reference1Name: z.string().min(2, { message: 'Reference name is required' }),
  reference1Relationship: z.string().min(2, { message: 'Relationship is required' }),
  reference1Phone: z.string().min(8, { message: 'Valid phone number is required' }),
  reference1Email: z.string().email({ message: 'Invalid email address' }).optional(),
  reference2Name: z.string().optional(),
  reference2Relationship: z.string().optional(),
  reference2Phone: z.string().optional(),
  reference2Email: z.string().email({ message: 'Invalid email address' }).optional(),
});

// Schema for Banking Information
const bankingInfoSchema = z.object({
  accountHolder: z.string().min(2, { message: 'Account holder name is required' }),
  bankName: z.string().min(2, { message: 'Bank name is required' }),
  accountNumber: z.string().min(5, { message: 'Account number is required' }),
  iban: z.string().optional(),
  bic: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'direct_debit', 'standing_order', 'other']),
});

// Schema for Lease Information
const leaseInfoSchema = z.object({
  moveInDate: z.date({ required_error: 'Move-in date is required' }),
  leaseStartDate: z.date({ required_error: 'Lease start date is required' }),
  leaseDuration: z.enum(['month_to_month', '6_months', '1_year', '2_years', 'other']),
  customDuration: z.string().optional(),
  rentAmount: z.string().min(1, { message: 'Rent amount is required' }),
  depositAmount: z.string().min(1, { message: 'Deposit amount is required' }),
  petPolicy: z.enum(['no_pets', 'cats_only', 'small_dogs', 'all_pets', 'case_by_case']),
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
});

// Schema for Agreement
const agreementSchema = z.object({
  agreeToTerms: z.boolean().refine(val => val === true, { message: 'You must agree to the terms' }),
  agreeToRules: z.boolean().refine(val => val === true, { message: 'You must agree to the house rules' }),
  agreeToPrivacyPolicy: z.boolean().refine(val => val === true, { message: 'You must agree to the privacy policy' }),
  signature: z.string().min(2, { message: 'Signature is required' }),
});

// Step type for the wizard
type Step = {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
};

// Step component with forwarded form methods
const StepContent: React.FC<{
  currentStep: Step;
  form: any;
  onNextStep: () => void;
  onPrevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  isUploading: boolean;
}> = ({
  currentStep,
  form,
  onNextStep,
  onPrevStep,
  isFirstStep,
  isLastStep,
  isSaving,
  isUploading,
}) => {
  return (
    <div className="space-y-4">
      <div>{currentStep.component}</div>

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevStep}
          disabled={isFirstStep || isSaving || isUploading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => {
            const isValid = form.trigger();
            if (isValid) {
              onNextStep();
            }
          }}
          disabled={isSaving || isUploading}
        >
          {isLastStep ? (
            isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Complete Onboarding
              </>
            )
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const PersonalInfoStep: React.FC<{ form: any }> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
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
                <Input placeholder="+49 123 456 7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => field.onChange(date)}
                  disabled={(date) => date > new Date()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Identification number" {...field} />
              </FormControl>
              <FormDescription>
                Passport or national ID number
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

const EmploymentInfoStep: React.FC<{ form: any }> = ({ form }) => {
  const watchEmploymentStatus = form.watch('employmentStatus');
  const requiresEmployerInfo = ['employed', 'self-employed'].includes(watchEmploymentStatus);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="employmentStatus"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Employment Status</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="employed" />
                  </FormControl>
                  <FormLabel className="font-normal">Employed</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="self-employed" />
                  </FormControl>
                  <FormLabel className="font-normal">Self-employed</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="student" />
                  </FormControl>
                  <FormLabel className="font-normal">Student</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="unemployed" />
                  </FormControl>
                  <FormLabel className="font-normal">Unemployed</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="retired" />
                  </FormControl>
                  <FormLabel className="font-normal">Retired</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {requiresEmployerInfo && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="employerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employer / Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Ltd." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employer Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+49 123 456 7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation / Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Software Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employmentDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="2 years" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      <FormField
        control={form.control}
        name="monthlyIncome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Monthly Income (€)</FormLabel>
            <FormControl>
              <Input placeholder="3000" {...field} />
            </FormControl>
            <FormDescription>
              Gross monthly income (before taxes)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const ReferencesStep: React.FC<{ form: any }> = ({ form }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Reference 1 (Required)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference1Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference1Relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input placeholder="Previous Landlord" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference1Phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+49 123 456 7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference1Email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="jane.smith@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h3 className="text-lg font-medium">Reference 2 (Optional)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference2Name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Brown" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference2Relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input placeholder="Employer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference2Phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+49 123 456 7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference2Email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john.brown@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

const BankingInfoStep: React.FC<{ form: any }> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="accountHolder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Holder Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input placeholder="1234567890" {...field} />
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
              <FormLabel>IBAN (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="DE89 3704 0044 0532 0130 00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="bic"
        render={({ field }) => (
          <FormItem>
            <FormLabel>BIC/SWIFT (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="DEUTDEDBXXX" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Preferred Payment Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="bank_transfer" />
                  </FormControl>
                  <FormLabel className="font-normal">Bank Transfer</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="direct_debit" />
                  </FormControl>
                  <FormLabel className="font-normal">Direct Debit</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="standing_order" />
                  </FormControl>
                  <FormLabel className="font-normal">Standing Order</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="other" />
                  </FormControl>
                  <FormLabel className="font-normal">Other</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const LeaseInfoStep: React.FC<{ form: any }> = ({ form }) => {
  const watchLeaseDuration = form.watch('leaseDuration');
  const watchHasPets = form.watch('hasPets');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="moveInDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Move-in Date</FormLabel>
              <FormControl>
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => field.onChange(date)}
                  disabled={(date) => date < new Date()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leaseStartDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Lease Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => field.onChange(date)}
                  disabled={(date) => date < new Date()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="leaseDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lease Duration</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lease duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="month_to_month">Month-to-Month</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="1_year">1 Year</SelectItem>
                    <SelectItem value="2_years">2 Years</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchLeaseDuration === 'other' && (
            <FormField
              control={form.control}
              name="customDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="Specify duration" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="rentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Rent (€)</FormLabel>
                <FormControl>
                  <Input placeholder="800" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="depositAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Security Deposit (€)</FormLabel>
                <FormControl>
                  <Input placeholder="1600" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="petPolicy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pet Policy</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pet policy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_pets">No Pets Allowed</SelectItem>
                  <SelectItem value="cats_only">Cats Only</SelectItem>
                  <SelectItem value="small_dogs">Small Dogs Only</SelectItem>
                  <SelectItem value="all_pets">All Pets Allowed</SelectItem>
                  <SelectItem value="case_by_case">Case-by-Case Basis</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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
                <FormLabel>Tenant has pets</FormLabel>
                <FormDescription>
                  Check this if the tenant will have pets in the property
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {watchHasPets && (
          <FormField
            control={form.control}
            name="petDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet Details</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide details about pets (type, breed, age, etc.)"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};

const DocumentsStep: React.FC<{ tenantId: number | null; propertyId: number | null }> = ({ tenantId, propertyId }) => {
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (file: File, documentType: string) => {
    if (!file) return;

    setUploadStatus(prev => ({
      ...prev,
      [documentType]: 'uploading'
    }));
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (tenantId) formData.append('tenantId', tenantId.toString());
      if (propertyId) formData.append('propertyId', propertyId.toString());

      const response = await fetch('/api/tenant-documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setUploadStatus(prev => ({
        ...prev,
        [documentType]: 'success'
      }));

      toast({
        title: 'Document Uploaded',
        description: `Successfully uploaded ${documentType}`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({
        ...prev,
        [documentType]: 'error'
      }));
      
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const documentTypes = [
    { id: 'id_proof', label: 'ID Proof / Passport' },
    { id: 'employment_proof', label: 'Proof of Employment / Income' },
    { id: 'credit_check', label: 'Credit Check (Optional)' },
    { id: 'previous_landlord_reference', label: 'Previous Landlord Reference (Optional)' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 mb-4">
        Upload required documents for tenant verification. Accepted formats: PDF, JPG, PNG.
      </div>

      {documentTypes.map((doc) => (
        <div key={doc.id} className="border rounded-md p-4 space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor={doc.id}>{doc.label}</Label>
            {uploadStatus[doc.id] === 'success' && (
              <span className="text-green-600 flex items-center text-sm">
                <Check className="w-4 h-4 mr-1" /> Uploaded
              </span>
            )}
          </div>
          <FileUpload
            id={doc.id}
            onFileSelect={(file) => handleUpload(file, doc.id)}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={isUploading || uploadStatus[doc.id] === 'success'}
            status={uploadStatus[doc.id]}
          />
        </div>
      ))}
    </div>
  );
};

const AgreementStep: React.FC<{ form: any }> = ({ form }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md border">
        <h3 className="font-medium text-lg mb-2">Lease Agreement Summary</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please review the lease terms and conditions before signing.
        </p>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Move-in Date:</span>
            <span>{form.getValues('moveInDate') && format(form.getValues('moveInDate'), 'PPP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Lease Start Date:</span>
            <span>{form.getValues('leaseStartDate') && format(form.getValues('leaseStartDate'), 'PPP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Lease Duration:</span>
            <span>
              {form.getValues('leaseDuration') === 'other'
                ? form.getValues('customDuration')
                : form.getValues('leaseDuration')?.replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Monthly Rent:</span>
            <span>€{form.getValues('rentAmount')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Security Deposit:</span>
            <span>€{form.getValues('depositAmount')}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="agreeToTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>I agree to the Lease Terms & Conditions</FormLabel>
                <FormDescription>
                  I have read and agree to the full lease agreement terms and conditions.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="agreeToRules"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>I agree to the House Rules</FormLabel>
                <FormDescription>
                  I have read and agree to follow the house rules provided by the landlord.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="agreeToPrivacyPolicy"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>I agree to the Privacy Policy</FormLabel>
                <FormDescription>
                  I consent to the collection and processing of my personal information.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="signature"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Digital Signature</FormLabel>
            <FormControl>
              <Input
                placeholder="Type your full name as signature"
                {...field}
              />
            </FormControl>
            <FormDescription>
              By typing your full name, you are electronically signing this agreement.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export const TenantOnboardingWizard: React.FC<{
  propertyId?: number;
  tenantId?: number;
  existingData?: any;
  onComplete?: (data: any) => void;
}> = ({ propertyId, tenantId, existingData, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Form setup for personal info (initially)
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: existingData?.personalInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  // Form setup for employment info
  const employmentInfoForm = useForm<z.infer<typeof employmentInfoSchema>>({
    resolver: zodResolver(employmentInfoSchema),
    defaultValues: existingData?.employmentInfo || {
      employmentStatus: 'employed',
      employerName: '',
      employerPhone: '',
      occupation: '',
      monthlyIncome: '',
      employmentDuration: '',
    },
  });

  // Form setup for references
  const referencesForm = useForm<z.infer<typeof referencesSchema>>({
    resolver: zodResolver(referencesSchema),
    defaultValues: existingData?.references || {
      reference1Name: '',
      reference1Relationship: '',
      reference1Phone: '',
      reference1Email: '',
      reference2Name: '',
      reference2Relationship: '',
      reference2Phone: '',
      reference2Email: '',
    },
  });

  // Form setup for banking info
  const bankingInfoForm = useForm<z.infer<typeof bankingInfoSchema>>({
    resolver: zodResolver(bankingInfoSchema),
    defaultValues: existingData?.bankingInfo || {
      accountHolder: '',
      bankName: '',
      accountNumber: '',
      iban: '',
      bic: '',
      paymentMethod: 'bank_transfer',
    },
  });

  // Form setup for lease info
  const leaseInfoForm = useForm<z.infer<typeof leaseInfoSchema>>({
    resolver: zodResolver(leaseInfoSchema),
    defaultValues: existingData?.leaseInfo || {
      moveInDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      leaseStartDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      leaseDuration: '1_year',
      customDuration: '',
      rentAmount: '',
      depositAmount: '',
      petPolicy: 'case_by_case',
      hasPets: false,
      petDetails: '',
    },
  });

  // Form setup for agreement
  const agreementForm = useForm<z.infer<typeof agreementSchema>>({
    resolver: zodResolver(agreementSchema),
    defaultValues: existingData?.agreement || {
      agreeToTerms: false,
      agreeToRules: false,
      agreeToPrivacyPolicy: false,
      signature: '',
    },
  });

  // Define steps
  const steps: Step[] = [
    {
      id: 'personal-info',
      title: 'Personal Information',
      description: 'Basic personal details of the tenant',
      component: <PersonalInfoStep form={personalInfoForm} />,
    },
    {
      id: 'employment-info',
      title: 'Employment Information',
      description: 'Employment and income details',
      component: <EmploymentInfoStep form={employmentInfoForm} />,
    },
    {
      id: 'references',
      title: 'References',
      description: 'Previous landlord and personal references',
      component: <ReferencesStep form={referencesForm} />,
    },
    {
      id: 'banking-info',
      title: 'Banking Information',
      description: 'Bank account details for rent payment',
      component: <BankingInfoStep form={bankingInfoForm} />,
    },
    {
      id: 'lease-info',
      title: 'Lease Information',
      description: 'Lease terms, duration, and conditions',
      component: <LeaseInfoStep form={leaseInfoForm} />,
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Upload required verification documents',
      component: <DocumentsStep tenantId={tenantId || null} propertyId={propertyId || null} />,
    },
    {
      id: 'agreement',
      title: 'Agreement',
      description: 'Review and sign the lease agreement',
      component: <AgreementStep form={agreementForm} />,
    },
  ];

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Get current form based on step
  const getCurrentForm = () => {
    switch (currentStepIndex) {
      case 0:
        return personalInfoForm;
      case 1:
        return employmentInfoForm;
      case 2:
        return referencesForm;
      case 3:
        return bankingInfoForm;
      case 4:
        return leaseInfoForm;
      case 5:
        return null; // Documents step doesn't have a form
      case 6:
        return agreementForm;
      default:
        return personalInfoForm;
    }
  };

  // Save form data mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // If we have a tenant ID, update the existing tenant
      if (tenantId) {
        const response = await apiRequest('PUT', `/api/tenants/${tenantId}/onboarding`, data);
        return response.json();
      } 
      // Otherwise create a new tenant
      else {
        const response = await apiRequest('POST', '/api/tenants/onboarding', data);
        return response.json();
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Tenant Onboarding Complete',
        description: 'The tenant has been successfully onboarded.',
      });
      
      // Invalidate tenant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      
      if (onComplete) {
        onComplete(data);
      } else {
        // Navigate to tenants page or the specific tenant page
        navigate(data.id ? `/tenants/${data.id}` : '/tenants');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Onboarding Failed',
        description: error.message || 'There was an error completing the onboarding process.',
        variant: 'destructive',
      });
    },
  });

  // Handle next step or final submission
  const handleNextStep = async () => {
    const currentForm = getCurrentForm();
    
    // If there's a form for this step, validate it
    if (currentForm) {
      const isValid = await currentForm.trigger();
      if (!isValid) return;
      
      // Store form data
      const formValues = currentForm.getValues();
      setFormData(prev => ({
        ...prev,
        [currentStep.id]: formValues,
      }));
    }

    // If it's the last step, submit all data
    if (currentStepIndex === steps.length - 1) {
      const completeData = {
        ...formData,
        [currentStep.id]: getCurrentForm()?.getValues(),
        propertyId: propertyId || null,
      };
      
      saveMutation.mutate(completeData);
    } else {
      // Move to the next step
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Tenant Onboarding</CardTitle>
        <CardDescription>Complete the following steps to onboard a new tenant</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStepIndex + 1} of {steps.length}: {currentStep.title}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Step navigation sidebar */}
          <div className="hidden md:block col-span-4 space-y-1">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg flex items-center cursor-pointer ${
                  index === currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStepIndex
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-background border'
                }`}
                onClick={() => {
                  // Allow going back to completed steps
                  if (index <= currentStepIndex) {
                    setCurrentStepIndex(index);
                  }
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-medium ${
                    index === currentStepIndex
                      ? 'bg-primary-foreground text-primary'
                      : index < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{step.title}</span>
                  <span className="text-xs opacity-80">{step.description}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Current step content */}
          <div className="col-span-12 md:col-span-8">
            <Form {...(getCurrentForm() || {})}>
              <form onSubmit={(e) => e.preventDefault()}>
                <StepContent
                  currentStep={currentStep}
                  form={getCurrentForm()}
                  onNextStep={handleNextStep}
                  onPrevStep={handlePrevStep}
                  isFirstStep={currentStepIndex === 0}
                  isLastStep={currentStepIndex === steps.length - 1}
                  isSaving={saveMutation.isPending}
                  isUploading={false}
                />
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantOnboardingWizard;