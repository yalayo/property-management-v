import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

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

    // Render structured data
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
