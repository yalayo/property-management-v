import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, Loader2 } from "lucide-react";

export default function FileUpload() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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
        description: "Your file is being processed. Data will be available shortly.",
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
    if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file-upload">Upload Excel or CSV files</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            <p className="text-sm text-gray-500">
              Upload bank statements or property data for automatic processing
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
                Upload File
              </>
            )}
          </Button>
        </form>

        {/* Recent uploads */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Recent Uploads</h3>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : files && files.length > 0 ? (
            <div className="space-y-3">
              {files.map((file: any) => (
                <div key={file.id} className="flex items-center p-3 border rounded-md">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-primary-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    {file.processed ? (
                      <div className="flex items-center text-green-600 text-sm">
                        <Check className="h-4 w-4 mr-1" />
                        Processed
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Processing
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No files uploaded yet</p>
              <p className="text-sm mt-1">Upload Excel or CSV files for automatic data extraction</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
