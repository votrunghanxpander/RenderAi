
import React, { useState, useEffect, useRef } from 'react';

interface ImageUploaderProps {
  title: string;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  selectedFile: File | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  title, 
  onFileSelect, 
  required = false, 
  selectedFile 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = `file-upload-${title.replace(/\s+/g, '-')}`;

  // Manage preview URL
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  // Handle paste from clipboard
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    onFileSelect(file);
                    return;
                }
            }
        }
    };

    container.addEventListener('paste', handlePaste);
    return () => {
        container.removeEventListener('paste', handlePaste);
    };
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            onFileSelect(file);
        }
    }
  };

  const handleContainerClick = () => {
    containerRef.current?.focus();
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-2">
        {title} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        ref={containerRef}
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
        onClick={handleContainerClick}
        className={`
            border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center h-40 transition-all outline-none relative group
            ${isDragOver ? 'border-[#C15F3C] bg-[#F4F3EE]' : 'border-[#B1ADA1] bg-[#F9F9F7] hover:bg-white focus:border-[#C15F3C] focus:bg-white'}
            ${!preview ? 'text-[#B1ADA1]' : ''}
        `}
      >
        <input 
            ref={fileInputRef}
            id={id} 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
        />
        
        {preview ? (
            <div className="relative h-full w-full flex items-center justify-center">
                <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
                <button 
                    onClick={handleClear}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-10"
                    title="Remove image"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full w-full">
                <button 
                    type="button"
                    onClick={handleUploadClick}
                    className="flex flex-col items-center justify-center group-hover:text-[#C15F3C] transition-colors"
                >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs font-medium underline decoration-dashed underline-offset-2">Chọn ảnh</p>
                </button>
                <p className="text-[10px] mt-2 opacity-70">hoặc Click vào đây rồi Dán (Ctrl+V)</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
