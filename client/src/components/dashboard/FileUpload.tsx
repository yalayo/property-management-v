import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  Clock,
  CircleX,
  FileIcon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";

type FileData = {
  id: number;
  userId: number;
  filename: string;
  fileType: string;
  uploadDate: string;
  processed: boolean;
  extractedData: any;
};

export default function FileUpload() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<FileData | null>(null);
  
  // Fetch previously uploaded files
  const { data: files, isLoading } = useQuery({
    queryKey: ['/api/files'],
    queryFn: () => fetch('/api/files').then(res => res.json())
  });

  // Setup file upload mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      });
    },
    onSuccess: () => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "File uploaded successfully",
        description: "Your file is being processed with AI-powered data extraction. This may take a minute.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['xlsx', 'xls', 'csv', 'pdf', 'doc', 'docx', 'txt'];
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a document in one of these formats: Excel, CSV, PDF, Word, or text",
        variant: "destructive",
      });
      return;
    }
    
    // Hint to user about the file being processed
    if (['xlsx', 'xls', 'csv'].includes(fileExt)) {
      toast({
        title: "Bank Statement Processing",
        description: "If this is a bank statement, we'll attempt to import the transactions into your accounting system automatically.",
      });
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  // Function to get file icon based on file type
  const getFileIcon = (fileType: string) => {
    switch(fileType.toLowerCase()) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />;
      case 'pdf':
        return <FileIcon className="h-5 w-5 mr-2 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 mr-2 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 mr-2 text-gray-600" />;
    }
  };

  // Function to render extracted data or error
  const renderExtractedData = (file: FileData) => {
    if (!file.extractedData) return null;
    
    // Check if there was an error during processing
    if (file.extractedData.processingFailed || file.extractedData.error) {
      return (
        <div className="bg-red-50 p-4 rounded-md mt-4">
          <div className="flex items-start">
            <CircleX className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Processing Error</h4>
              <p className="text-sm text-red-700 mt-1">
                {file.extractedData.error || "Failed to extract data from this file"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Check if we have raw text instead of structured data
    if (file.extractedData.rawText) {
      return (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Extracted Text:</h4>
          <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
            {file.extractedData.rawText}
          </div>
        </div>
      );
    }

    // Check if it's a bank statement with transactions
    if (file.extractedData.document_type === 'bank_statement' && Array.isArray(file.extractedData.transactions)) {
      const transactions = file.extractedData.transactions;
      
      // Calculate summary statistics
      const incomeTotal = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      
      const expenseTotal = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      
      const netAmount = incomeTotal - expenseTotal;
      
      // Count transactions by category
      const categoryCounts: Record<string, { count: number, amount: number, type: string }> = {};
      transactions.forEach((t: any) => {
        const category = t.category || 'Uncategorized';
        if (!categoryCounts[category]) {
          categoryCounts[category] = { count: 0, amount: 0, type: t.type };
        }
        categoryCounts[category].count += 1;
        categoryCounts[category].amount += parseFloat(t.amount) || 0;
      });
      
      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b.amount - a.amount)
        .slice(0, 5);
        
      return (
        <div className="mt-4 space-y-6">
          <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Bank Statement Processed</h4>
                <p className="text-sm text-green-700 mt-1">
                  {transactions.length} transactions were extracted and added to your accounting system.
                </p>
              </div>
            </div>
          </div>
          
          {/* Bank statement details */}
          <div>
            <h4 className="font-medium mb-2">Bank Statement Details:</h4>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-md">
              <div>
                <p><span className="font-medium">Bank Name:</span> {file.extractedData.bank_name || 'Unknown'}</p>
                <p><span className="font-medium">Account Number:</span> {file.extractedData.account_number || 'Unknown'}</p>
              </div>
              <div>
                <p><span className="font-medium">Statement Period:</span> {file.extractedData.statement_period?.start_date ? (
                  `${file.extractedData.statement_period.start_date} to ${file.extractedData.statement_period.end_date || 'present'}`
                ) : 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          {/* Summary statistics */}
          <div>
            <h4 className="font-medium mb-3">Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800">Total Transactions</h4>
                <p className="text-2xl font-semibold mt-1">{transactions.length}</p>
                <p className="text-xs text-blue-600 mt-1">From {file.filename}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-md border border-green-100">
                <h4 className="text-sm font-medium text-green-800">Total Income</h4>
                <p className="text-2xl font-semibold text-green-700 mt-1">€{incomeTotal.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {transactions.filter((t: any) => t.type === 'income').length} income transactions
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-md border border-red-100">
                <h4 className="text-sm font-medium text-red-800">Total Expenses</h4>
                <p className="text-2xl font-semibold text-red-700 mt-1">€{expenseTotal.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">
                  {transactions.filter((t: any) => t.type === 'expense').length} expense transactions
                </p>
              </div>
            </div>
          </div>
          
          {/* Net position */}
          <div className="p-4 rounded-md border" 
               style={{ 
                 backgroundColor: netAmount >= 0 ? 'rgba(0, 128, 0, 0.05)' : 'rgba(255, 0, 0, 0.05)',
                 borderColor: netAmount >= 0 ? 'rgba(0, 128, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'
               }}>
            <h4 className="text-sm font-medium" 
                style={{ color: netAmount >= 0 ? 'rgb(0, 100, 0)' : 'rgb(180, 0, 0)' }}>
              Net Position
            </h4>
            <p className="text-3xl font-bold mt-1" 
               style={{ color: netAmount >= 0 ? 'rgb(0, 128, 0)' : 'rgb(220, 0, 0)' }}>
              {netAmount >= 0 ? '+' : ''}€{netAmount.toFixed(2)}
            </p>
            <p className="text-xs mt-1" 
               style={{ color: netAmount >= 0 ? 'rgb(0, 100, 0)' : 'rgb(180, 0, 0)' }}>
              {netAmount >= 0 ? 'Positive balance' : 'Negative balance'} for this statement period
            </p>
          </div>
          
          {/* Top categories */}
          <div>
            <h4 className="font-medium mb-3">Top Categories</h4>
            <div className="space-y-2">
              {topCategories.map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: data.type === 'income' ? 'rgb(0, 150, 0)' : 'rgb(220, 50, 50)' }}></div>
                    <span>{category}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">{data.count} transactions</span>
                    <span className={`font-medium ${data.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {data.type === 'income' ? '+' : '-'}€{data.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <h4 className="font-medium mb-2">All Transactions:</h4>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Description</th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Amount</th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                  <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 whitespace-nowrap">{transaction.date}</td>
                    <td className="px-4 py-2">{transaction.description}</td>
                    <td className={`px-4 py-2 whitespace-nowrap font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}€{Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge variant={transaction.type === 'income' ? 'outline' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{transaction.category || 'Uncategorized'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800 flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              Transactions Successfully Imported
            </h4>
            <p className="text-sm text-green-700 mt-1">
              All transactions have been automatically imported into your accounting system. 
              You can review and edit them in the Transactions section.
            </p>
          </div>
        </div>
      );
    }
    
    // Render other structured data
    return (
      <div className="mt-4">
        <h4 className="font-medium mb-2">Extracted Data:</h4>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(file.extractedData).map(([key, value], index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-sm font-medium">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </AccordionTrigger>
              <AccordionContent>
                <pre className="bg-gray-50 p-2 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Document Processor</CardTitle>
        <CardDescription>
          Upload documents for AI-powered data extraction using Google Gemini
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="font-medium text-blue-800">New Feature: Bank Statement Processing</h4>
          <p className="text-sm text-blue-700 mt-1">
            Upload your bank statements in Excel or CSV format to have them automatically processed and imported into your accounting system. 
            Our AI will extract transaction data, attempt to categorize expenses and income, and create the entries for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file-upload">Upload Documents</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            <p className="text-sm text-gray-500">
              Upload bank statements, property data, or tenant documents for AI analysis
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={!selectedFile || uploadMutation.isPending}
            className="flex items-center"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
        </form>

        {/* Recent uploads */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Processed Documents</h3>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : files && files.length > 0 ? (
            <div className="space-y-3">
              {files.map((file: FileData) => (
                <div key={file.id} className="p-4 border rounded-md hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    {getFileIcon(file.fileType)}
                    <div className="flex-1">
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(file.uploadDate).toLocaleDateString()} at {new Date(file.uploadDate).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant={file.processed ? (file.extractedData?.processingFailed ? "destructive" : "default") : "outline"} className="mr-2">
                      {file.processed 
                        ? (file.extractedData?.processingFailed 
                            ? "Failed" 
                            : "Processed") 
                        : "Processing..."}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2"
                          onClick={() => setSelectedFileData(file)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center">
                            {getFileIcon(file.fileType)}
                            {file.filename}
                          </DialogTitle>
                          <DialogDescription>
                            Uploaded on {new Date(file.uploadDate).toLocaleDateString()} at {new Date(file.uploadDate).toLocaleTimeString()}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {file.processed ? (
                          renderExtractedData(file)
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Clock className="h-12 w-12 text-amber-500 mb-3 animate-pulse" />
                            <h3 className="font-medium text-lg">Processing in progress</h3>
                            <p className="text-gray-500 text-center mt-2">
                              Google Gemini AI is currently extracting data from your document.
                              <br />This may take a minute. Check back soon!
                            </p>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border rounded-md">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No documents uploaded yet</p>
              <p className="text-sm mt-2 max-w-md mx-auto">
                Upload your documents to automatically extract important information using Google Gemini AI
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
