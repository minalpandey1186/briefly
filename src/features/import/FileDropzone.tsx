import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { validateFile } from '../../lib/validation';

interface FileDropzoneProps {
  onFileContent: (content: string, fileName: string) => void;
  onError: (err: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileContent, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const v = validateFile(file);
      if (!v.valid) {
        onError(v.error!);
        return;
      }
      const reader = new FileReader();
      reader.onload = e => onFileContent(e.target?.result as string, file.name);
      reader.onerror = () => onError('Could not read the file. Please try again.');
      reader.readAsText(file, 'utf-8');
    },
    [onFileContent, onError]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-stone-500 bg-stone-100' : 'border-stone-200 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 bg-stone-200 rounded-xl">
          {isDragging ? <FileText className="h-6 w-6 text-stone-600" /> : <Upload className="h-6 w-6 text-stone-500" />}
        </div>
        <div>
          <p className="text-stone-700 font-medium text-sm">Drop your WhatsApp export here</p>
          <p className="text-stone-400 text-xs mt-1">or click to browse — .txt files only</p>
        </div>
      </div>
    </div>
  );
};
