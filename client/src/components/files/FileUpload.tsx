import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  value: any;
  onChange: (value: any) => void;
  acceptedFileTypes?: string[];
  maxSizeInMB?: number;
  multiple?: boolean;
}

export function FileUpload({
  value,
  onChange,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  maxSizeInMB = 10,
  multiple = false,
}: FileUploadProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      validateAndProcessFiles(selectedFiles);
    }
  };
  
  // Validate and process selected files
  const validateAndProcessFiles = async (selectedFiles: File[]) => {
    // Validate file types and sizes
    const invalidTypeFiles = selectedFiles.filter(file => 
      !acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type))
    );
    
    const oversizedFiles = selectedFiles.filter(file => 
      file.size > maxSizeInBytes
    );
    
    // Show warning if there are invalid files
    if (invalidTypeFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: `Files must be one of the following types: ${acceptedFileTypes.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: `Files must be smaller than ${maxSizeInMB}MB`,
        variant: 'destructive',
      });
      return;
    }
    
    // Simulate upload process
    setIsUploading(true);
    
    try {
      // Create an array to store file data (could be URLs in a real app)
      const fileData: any[] = [];
      
      // Process each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setProgress(progress);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Convert file to base64 (for demo purposes)
        // In a real app, you'd upload to a server and get a URL back
        const fileDataUrl = await readFileAsDataURL(file);
        fileData.push({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: fileDataUrl,
        });
      }
      
      // Update files state
      setFiles(prev => [...prev, ...selectedFiles]);
      
      // Update form value
      if (multiple) {
        onChange(fileData);
      } else {
        onChange(fileData[0]);
      }
      
      toast({
        title: 'Upload successful',
        description: `${selectedFiles.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your file(s).',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Convert file to data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      validateAndProcessFiles(droppedFiles);
    }
  };
  
  // Trigger file input click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Remove a file
  const handleRemoveFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      newValue.splice(index, 1);
      onChange(newValue);
    } else {
      onChange(null);
    }
  };
  
  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept={acceptedFileTypes.join(',')}
          multiple={multiple}
        />
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="font-medium text-center mb-1">
          Drag and drop your file{multiple ? 's' : ''} here
        </p>
        <p className="text-sm text-muted-foreground text-center mb-2">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Accepted formats: {acceptedFileTypes.join(', ')}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Maximum size: {maxSizeInMB}MB
        </p>
      </div>
      
      {isUploading && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Uploading...</p>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label>Uploaded Files</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <div className="flex items-center">
                  <File className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}