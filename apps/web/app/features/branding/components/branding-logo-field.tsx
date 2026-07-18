import { cn } from "@lib/utils";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { fileToBase64 } from "../utils/logo-upload";

interface BrandingLogoFieldProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export function BrandingLogoField({ value, onChange, name: _name }: BrandingLogoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const base64 = await fileToBase64(file);
    onChange(base64);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  if (value) {
    return (
      <div className="relative group w-48">
        <div className="h-24 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center p-3">
          <img src={value} alt="logo" className="max-h-full max-w-full object-contain" />
        </div>
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-colors shadow-sm"
        >
          <X className="size-2.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "w-48 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 hover:bg-muted/40",
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground leading-tight">
          Drop or <span className="text-foreground">browse</span>
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </>
  );
}
