import { useState, useRef } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = "*",
  maxSize = 10, // Default 10MB
  onFileSelect,
  disabled = false,
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds the limit of ${maxSize}MB`);
      return;
    }

    // Check file type if accept is specified
    if (accept !== "*") {
      const fileType = file.type;
      const acceptTypes = accept.split(",").map(type => type.trim());
      
      // Check if any of the accepted types match the file type
      const isValidType = acceptTypes.some(type => {
        if (type.includes('/*')) {
          // Handle wildcards like 'image/*'
          const mainType = type.split('/')[0];
          return fileType.startsWith(`${mainType}/`);
        }
        return type === fileType;
      });

      if (!isValidType) {
        setError(`File type not accepted. Please upload ${accept}`);
        return;
      }
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        onClick={!disabled && !selectedFile ? handleClick : undefined}
        onDragEnter={!disabled ? handleDrag : undefined}
        onDragLeave={!disabled ? handleDrag : undefined}
        onDragOver={!disabled ? handleDrag : undefined}
        onDrop={!disabled ? handleDrop : undefined}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-all text-center",
          dragActive && !disabled
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300",
          selectedFile ? "bg-gray-50" : "hover:bg-gray-50",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          className
        )}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-gray-600 mr-3" />
              <div className="text-left">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFile}
              disabled={disabled}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 flex text-sm text-gray-600">
              <p className="text-center">
                <span className="font-medium text-primary-600">
                  Click to upload
                </span>{" "}
                or drag and drop
                <br />
                <span className="text-gray-500">
                  {accept === "*"
                    ? "Any file up to "
                    : `${accept.replace(/,/g, ", ")} up to `}
                  {maxSize}MB
                </span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
