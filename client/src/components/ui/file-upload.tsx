import React, { useState, useRef } from 'react';
import { Check, FileIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  id: string;
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  status?: string; // 'idle', 'uploading', 'success', 'error'
}

export function FileUpload({
  id,
  onFileSelect,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSize = 10, // 10MB default
  className,
  disabled = false,
  status = 'idle',
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      setFileName(null);
      return;
    }

    // Check file type
    const fileType = file.type.split('/')[1];
    const acceptedTypes = accept.split(',').map(type => 
      type.trim().replace('.', '')
    );
    
    if (!acceptedTypes.some(type => 
      file.type.includes(type) || file.name.endsWith(`.${type}`)
    )) {
      setError(`File type not supported. Accepted: ${accept}`);
      setFileName(null);
      return;
    }

    // All validations passed
    setError(null);
    setFileName(file.name);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <UploadCloud className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Uploaded successfully';
      case 'error':
        return 'Upload failed';
      default:
        return fileName ? 'Change file' : 'Choose file';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300",
          disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "cursor-pointer hover:border-gray-400",
          status === 'error' && "border-red-400",
          status === 'success' && "border-green-400",
          fileName && "py-3"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          id={id}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept={accept}
          disabled={disabled || status === 'success' || status === 'uploading'}
        />
        
        {fileName ? (
          <div className="flex items-center space-x-2 w-full">
            <FileIcon className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm truncate">{fileName}</p>
            </div>
            <div className="flex shrink-0 items-center space-x-2">
              {getStatusIcon()}
              <span className="text-xs font-medium">{getStatusText()}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-2">
            <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium mb-1">
              Drag & drop file here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports: {accept.replace(/\./g, '').replace(/,/g, ', ')}
            </p>
            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>
        )}
      </div>
      
      {status !== 'idle' && status !== 'success' && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setFileName(null);
              setError(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            disabled={disabled || !fileName || status === 'uploading'}
            className="text-xs"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}