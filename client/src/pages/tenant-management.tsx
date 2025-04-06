import { useState, useEffect } from 'react';
import { useNavigate } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { Loader2, Plus, Star, Edit, Trash2, Eye, FileText, User, Unlock, Users } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';

// Schemas for forms
const tenantCredentialSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantId: z.number(),
  isActive: z.boolean().default(true),
  expiryDate: z.string().optional().nullable(),
});

const sharedDocumentSchema = z.object({
  documentName: z.string().min(2, 'Document name is required'),
  documentType: z.string().min(2, 'Document type is required'),
  description: z.string().optional().nullable(),
  fileId: z.number(),
  isPublic: z.boolean().default(false),
});

const tenantDocumentSchema = z.object({
  tenantId: z.number(),
  documentId: z.number(),
  expiryDate: z.string().optional().nullable(),
});

const tenantRatingSchema = z.object({
  tenantId: z.number(),
  paymentRating: z.number().min(1).max(5),
  propertyRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  overallRating: z.number().min(1).max(5),
  notes: z.string().optional().nullable(),
  ratingDate: z.string().default(() => new Date().toISOString().split('T')[0]),
});

// Tenant Portal Access Tab
const TenantPortalTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  
  // Fetch tenant credentials
  const { data: credentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['/api/tenant-credentials/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/tenant-credentials/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch tenants for dropdown
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/tenants/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/tenants/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Form for adding/editing tenant credentials
  const form = useForm<z.infer<typeof tenantCredentialSchema>>({
    resolver: zodResolver(tenantCredentialSchema),
    defaultValues: {
      username: '',
      password: '',
      tenantId: 0,
      isActive: true,
      expiryDate: null,
    },
  });
  
  // Create tenant credential mutation
  const createCredentialMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantCredentialSchema>) => {
      const res = await apiRequest('POST', '/api/tenant-credentials', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant credential created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-credentials/user', user?.id] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create tenant credential: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update tenant credential mutation
  const updateCredentialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof tenantCredentialSchema> }) => {
      const res = await apiRequest('PUT', `/api/tenant-credentials/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant credential updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-credentials/user', user?.id] });
      setIsAddDialogOpen(false);
      setSelectedCredential(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update tenant credential: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete tenant credential mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tenant-credentials/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant credential deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-credentials/user', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete tenant credential: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof tenantCredentialSchema>) => {
    if (selectedCredential) {
      updateCredentialMutation.mutate({ id: selectedCredential.id, data: values });
    } else {
      createCredentialMutation.mutate(values);
    }
  };
  
  // Handle edit credential
  const handleEditCredential = (credential: any) => {
    setSelectedCredential(credential);
    form.reset({
      username: credential.username,
      password: '',
      tenantId: credential.tenantId,
      isActive: credential.isActive,
      expiryDate: credential.expiryDate ? new Date(credential.expiryDate).toISOString().split('T')[0] : null,
    });
    setIsAddDialogOpen(true);
  };
  
  // Handle delete credential
  const handleDeleteCredential = (id: number) => {
    if (confirm('Are you sure you want to delete this tenant credential?')) {
      deleteCredentialMutation.mutate(id);
    }
  };
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      form.reset();
      setSelectedCredential(null);
    }
  }, [isAddDialogOpen, form]);
  
  if (credentialsLoading || tenantsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tenant Portal Access</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {selectedCredential ? 'Edit Credential' : 'Add Credential'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedCredential ? 'Edit Tenant Credential' : 'Add Tenant Credential'}</DialogTitle>
              <DialogDescription>
                {selectedCredential 
                  ? 'Update the tenant credential details' 
                  : 'Create login credentials for a tenant to access the portal'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.firstName} {tenant.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="tenant-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedCredential ? 'New Password (leave blank to keep current)' : 'Password'}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Leave blank for no expiration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Inactive credentials cannot be used to login
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createCredentialMutation.isPending || updateCredentialMutation.isPending}>
                    {(createCredentialMutation.isPending || updateCredentialMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedCredential ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {credentials?.length > 0 ? (
          credentials.map((credential: any) => (
            <Card key={credential.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {credential.username}
                </CardTitle>
                <CardDescription>
                  {tenants?.find((t: any) => t.id === credential.tenantId)?.firstName}{' '}
                  {tenants?.find((t: any) => t.id === credential.tenantId)?.lastName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${credential.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {credential.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Login:</span>
                    <span>
                      {credential.lastLogin 
                        ? new Date(credential.lastLogin).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expires:</span>
                    <span>
                      {credential.expiryDate 
                        ? new Date(credential.expiryDate).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditCredential(credential)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteCredential(credential.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/40 p-4">
            <Unlock className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No Tenant Credentials</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mt-1">
              Create portal access credentials for your tenants to allow them to log in and access their documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Document Repository Tab
const DocumentRepositoryTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDocumentDialogOpen, setIsAddDocumentDialogOpen] = useState(false);
  const [isAssignDocumentDialogOpen, setIsAssignDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  // Fetch shared documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/shared-documents/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/shared-documents/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch tenants for dropdown
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/tenants/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/tenants/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch uploaded files for dropdown
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['/api/files/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/files/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch tenant document assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/tenant-documents'],
    queryFn: async () => {
      // This would require a new endpoint to fetch all tenant document assignments
      // For now, we'll mock this data
      return [];
    },
    enabled: !!user?.id,
  });
  
  // Forms for document management
  const documentForm = useForm<z.infer<typeof sharedDocumentSchema>>({
    resolver: zodResolver(sharedDocumentSchema),
    defaultValues: {
      documentName: '',
      documentType: '',
      description: '',
      fileId: 0,
      isPublic: false,
    },
  });
  
  const assignmentForm = useForm<z.infer<typeof tenantDocumentSchema>>({
    resolver: zodResolver(tenantDocumentSchema),
    defaultValues: {
      tenantId: 0,
      documentId: 0,
      expiryDate: null,
    },
  });
  
  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sharedDocumentSchema>) => {
      const res = await apiRequest('POST', '/api/shared-documents', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-documents/user', user?.id] });
      setIsAddDocumentDialogOpen(false);
      documentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof sharedDocumentSchema> }) => {
      const res = await apiRequest('PUT', `/api/shared-documents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-documents/user', user?.id] });
      setIsAddDocumentDialogOpen(false);
      setSelectedDocument(null);
      documentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/shared-documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-documents/user', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Assign document to tenant mutation
  const assignDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantDocumentSchema>) => {
      const res = await apiRequest('POST', '/api/tenant-documents', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document assigned to tenant successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-documents'] });
      setIsAssignDocumentDialogOpen(false);
      assignmentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to assign document: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tenant-documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document assignment removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-documents'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to remove assignment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle document form submission
  const onDocumentSubmit = (values: z.infer<typeof sharedDocumentSchema>) => {
    if (selectedDocument) {
      updateDocumentMutation.mutate({ id: selectedDocument.id, data: values });
    } else {
      createDocumentMutation.mutate(values);
    }
  };
  
  // Handle assignment form submission
  const onAssignmentSubmit = (values: z.infer<typeof tenantDocumentSchema>) => {
    assignDocumentMutation.mutate(values);
  };
  
  // Handle edit document
  const handleEditDocument = (document: any) => {
    setSelectedDocument(document);
    documentForm.reset({
      documentName: document.documentName,
      documentType: document.documentType,
      description: document.description,
      fileId: document.fileId,
      isPublic: document.isPublic,
    });
    setIsAddDocumentDialogOpen(true);
  };
  
  // Handle delete document
  const handleDeleteDocument = (id: number) => {
    if (confirm('Are you sure you want to delete this document? This will also remove all tenant assignments.')) {
      deleteDocumentMutation.mutate(id);
    }
  };
  
  // Handle delete assignment
  const handleDeleteAssignment = (id: number) => {
    if (confirm('Are you sure you want to remove this document assignment?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };
  
  // Initialize assignment form with selected document
  const handleAssignDocument = (document: any) => {
    assignmentForm.reset({
      documentId: document.id,
      tenantId: 0,
      expiryDate: null,
    });
    setIsAssignDocumentDialogOpen(true);
  };
  
  // Reset forms when dialogs close
  useEffect(() => {
    if (!isAddDocumentDialogOpen) {
      documentForm.reset();
      setSelectedDocument(null);
    }
    if (!isAssignDocumentDialogOpen) {
      assignmentForm.reset();
      setSelectedAssignment(null);
    }
  }, [isAddDocumentDialogOpen, isAssignDocumentDialogOpen, documentForm, assignmentForm]);
  
  if (documentsLoading || tenantsLoading || filesLoading || assignmentsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Document Repository</h2>
        <Dialog open={isAddDocumentDialogOpen} onOpenChange={setIsAddDocumentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {selectedDocument ? 'Edit Document' : 'Add Document'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedDocument ? 'Edit Document' : 'Add Document'}</DialogTitle>
              <DialogDescription>
                {selectedDocument 
                  ? 'Update the document details' 
                  : 'Add a document to your repository to share with tenants'}
              </DialogDescription>
            </DialogHeader>
            <Form {...documentForm}>
              <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4">
                <FormField
                  control={documentForm.control}
                  name="documentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Lease Agreement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={documentForm.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lease">Lease Agreement</SelectItem>
                          <SelectItem value="rule">House Rules</SelectItem>
                          <SelectItem value="notice">Notice</SelectItem>
                          <SelectItem value="form">Form</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={documentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the document" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={documentForm.control}
                  name="fileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select file" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {files?.map((file: any) => (
                            <SelectItem key={file.id} value={file.id.toString()}>
                              {file.filename}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select an uploaded file to associate with this document
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={documentForm.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Public Document</FormLabel>
                        <FormDescription>
                          Public documents are visible to all tenants
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createDocumentMutation.isPending || updateDocumentMutation.isPending}>
                    {(createDocumentMutation.isPending || updateDocumentMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedDocument ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents?.length > 0 ? (
          documents.map((document: any) => (
            <Card key={document.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  {document.documentName}
                </CardTitle>
                <CardDescription>
                  Type: {document.documentType.charAt(0).toUpperCase() + document.documentType.slice(1)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {document.description && (
                    <div>
                      <p className="text-muted-foreground">{document.description}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Visibility:</span>
                    <span className={`px-2 py-1 rounded text-xs ${document.isPublic ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {document.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created:</span>
                    <span>
                      {document.createdAt
                        ? new Date(document.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleAssignDocument(document)}>
                  <Users className="h-4 w-4 mr-1" />
                  Assign
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditDocument(document)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteDocument(document.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/40 p-4">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No Documents</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mt-1">
              Add documents to your repository to share them with tenants. You can make them public or assign them to specific tenants.
            </p>
          </div>
        )}
      </div>
      
      <Dialog open={isAssignDocumentDialogOpen} onOpenChange={setIsAssignDocumentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Document to Tenant</DialogTitle>
            <DialogDescription>
              Select a tenant to share this document with them
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants?.map((tenant: any) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.firstName} {tenant.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={assignmentForm.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                      After this date, the tenant will no longer have access to this document
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={assignDocumentMutation.isPending}>
                  {assignDocumentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assign Document
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Document Assignments Section */}
      {documents?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Document Assignments</h3>
          {assignments?.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Document
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tenant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Assigned
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Expires
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Viewed
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {assignments.map((assignment: any) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {documents.find((d: any) => d.id === assignment.documentId)?.documentName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tenants?.find((t: any) => t.id === assignment.tenantId)?.firstName}{' '}
                        {tenants?.find((t: any) => t.id === assignment.tenantId)?.lastName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.createdAt
                          ? new Date(assignment.createdAt).toLocaleDateString()
                          : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.expiryDate
                          ? new Date(assignment.expiryDate).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${assignment.hasViewed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {assignment.hasViewed ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteAssignment(assignment.id)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/40 p-4">
              <Users className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No Document Assignments</h3>
              <p className="text-muted-foreground text-sm text-center max-w-md mt-1">
                Assign documents to specific tenants to control who can access them. Click the "Assign" button on a document to share it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Tenant Rating Tab
const TenantRatingTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddRatingDialogOpen, setIsAddRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<any>(null);
  
  // Fetch tenant ratings
  const { data: ratings, isLoading: ratingsLoading } = useQuery({
    queryKey: ['/api/tenant-ratings/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/tenant-ratings/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Fetch tenants for dropdown
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/tenants/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest('GET', `/api/tenants/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });
  
  // Form for adding/editing tenant ratings
  const form = useForm<z.infer<typeof tenantRatingSchema>>({
    resolver: zodResolver(tenantRatingSchema),
    defaultValues: {
      tenantId: 0,
      paymentRating: 3,
      propertyRating: 3,
      communicationRating: 3,
      overallRating: 3,
      notes: '',
      ratingDate: new Date().toISOString().split('T')[0],
    },
  });
  
  // Create tenant rating mutation
  const createRatingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantRatingSchema>) => {
      const res = await apiRequest('POST', '/api/tenant-ratings', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant rating added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-ratings/user', user?.id] });
      setIsAddRatingDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to add tenant rating: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update tenant rating mutation
  const updateRatingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof tenantRatingSchema> }) => {
      const res = await apiRequest('PUT', `/api/tenant-ratings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant rating updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-ratings/user', user?.id] });
      setIsAddRatingDialogOpen(false);
      setSelectedRating(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to update tenant rating: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete tenant rating mutation
  const deleteRatingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tenant-ratings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tenant rating deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-ratings/user', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete tenant rating: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof tenantRatingSchema>) => {
    if (selectedRating) {
      updateRatingMutation.mutate({ id: selectedRating.id, data: values });
    } else {
      createRatingMutation.mutate(values);
    }
  };
  
  // Handle edit rating
  const handleEditRating = (rating: any) => {
    setSelectedRating(rating);
    form.reset({
      tenantId: rating.tenantId,
      paymentRating: rating.paymentRating,
      propertyRating: rating.propertyRating,
      communicationRating: rating.communicationRating,
      overallRating: rating.overallRating,
      notes: rating.notes,
      ratingDate: new Date(rating.ratingDate).toISOString().split('T')[0],
    });
    setIsAddRatingDialogOpen(true);
  };
  
  // Handle delete rating
  const handleDeleteRating = (id: number) => {
    if (confirm('Are you sure you want to delete this tenant rating?')) {
      deleteRatingMutation.mutate(id);
    }
  };
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!isAddRatingDialogOpen) {
      form.reset();
      setSelectedRating(null);
    }
  }, [isAddRatingDialogOpen, form]);
  
  // Calculate average tenant ratings
  const getTenantAverages = (tenantId: number) => {
    const tenantRatings = ratings?.filter((r: any) => r.tenantId === tenantId) || [];
    if (tenantRatings.length === 0) return { average: 0, count: 0 };
    
    const sum = tenantRatings.reduce((acc: number, r: any) => acc + r.overallRating, 0);
    return { average: sum / tenantRatings.length, count: tenantRatings.length };
  };
  
  if (ratingsLoading || tenantsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Group ratings by tenant
  const tenantRatings = tenants?.reduce((acc: any, tenant: any) => {
    const { average, count } = getTenantAverages(tenant.id);
    acc[tenant.id] = { 
      tenant,
      average,
      count,
      ratings: ratings?.filter((r: any) => r.tenantId === tenant.id) || [],
    };
    return acc;
  }, {});
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tenant Ratings</h2>
        <Dialog open={isAddRatingDialogOpen} onOpenChange={setIsAddRatingDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {selectedRating ? 'Edit Rating' : 'Add Rating'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedRating ? 'Edit Tenant Rating' : 'Add Tenant Rating'}</DialogTitle>
              <DialogDescription>
                Rate your tenant's performance in different areas
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants?.map((tenant: any) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.firstName} {tenant.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Rating (1-5)</FormLabel>
                      <FormDescription>Rate how timely and reliable their rent payments are</FormDescription>
                      <FormControl>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(value)}
                              className="w-10 h-10"
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="propertyRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Care Rating (1-5)</FormLabel>
                      <FormDescription>Rate how well they maintain the property</FormDescription>
                      <FormControl>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(value)}
                              className="w-10 h-10"
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="communicationRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Rating (1-5)</FormLabel>
                      <FormDescription>Rate their communication and responsiveness</FormDescription>
                      <FormControl>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(value)}
                              className="w-10 h-10"
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="overallRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Rating (1-5)</FormLabel>
                      <FormDescription>Rate your overall satisfaction with this tenant</FormDescription>
                      <FormControl>
                        <div className="flex space-x-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange(value)}
                              className="w-10 h-10"
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional comments about this tenant" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ratingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createRatingMutation.isPending || updateRatingMutation.isPending}>
                    {(createRatingMutation.isPending || updateRatingMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedRating ? 'Update' : 'Add'} Rating
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants?.length > 0 ? (
          Object.values(tenantRatings || {}).map((tenantData: any) => (
            <Card key={tenantData.tenant.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {tenantData.tenant.firstName} {tenantData.tenant.lastName}
                  </div>
                  <div className="flex items-center">
                    <Star className={`h-4 w-4 ${tenantData.average > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                    <span className="ml-1 text-sm font-normal">
                      {tenantData.average > 0 ? tenantData.average.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>
                  {tenantData.count} rating{tenantData.count !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              
              {tenantData.ratings.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {tenantData.ratings.map((rating: any) => (
                    <div key={rating.id} className="p-4 border-t">
                      <div className="flex justify-between mb-2">
                        <div className="flex space-x-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Payment</p>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="ml-1 text-sm">{rating.paymentRating}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Property</p>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="ml-1 text-sm">{rating.propertyRating}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Communication</p>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="ml-1 text-sm">{rating.communicationRating}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Overall</p>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="ml-1 text-sm">{rating.overallRating}</span>
                          </div>
                        </div>
                      </div>
                      
                      {rating.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{rating.notes}</p>
                      )}
                      
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(rating.ratingDate).toLocaleDateString()}
                        </p>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditRating(rating)}>
                            <Edit className="h-3 w-3" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteRating(rating.id)}>
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground">No ratings yet</p>
                </CardContent>
              )}
              
              <CardFooter className="border-t p-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    form.reset({
                      tenantId: tenantData.tenant.id,
                      paymentRating: 3,
                      propertyRating: 3,
                      communicationRating: 3,
                      overallRating: 3,
                      notes: '',
                      ratingDate: new Date().toISOString().split('T')[0],
                    });
                    setIsAddRatingDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rating
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center h-40 border rounded-lg bg-muted/40 p-4">
            <Star className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No Tenants to Rate</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mt-1">
              Add tenants to your properties first, then you can rate them on payment reliability, property care, and communication.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Tenant Management Page Component
export default function TenantManagementPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage tenant portal access, documents, and ratings
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="portal">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portal">Portal Access</TabsTrigger>
          <TabsTrigger value="documents">Document Repository</TabsTrigger>
          <TabsTrigger value="ratings">Tenant Ratings</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="portal">
            <TenantPortalTab />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentRepositoryTab />
          </TabsContent>
          <TabsContent value="ratings">
            <TenantRatingTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}