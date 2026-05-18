import { X } from "lucide-react";
import { useRef } from "react";

import { fileToBase64 } from "../utils/logo-upload";

interface BrandingLogoFieldProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export function BrandingLogoField({ value, onChange, name }: BrandingLogoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (name || "??").trim().slice(0, 2).toUpperCase();

  async function handleFile(file?: File) {
    if (!file) return;

    const base64 = await fileToBase64(file);

    onChange(base64);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="size-8 rounded-md bg-primary overflow-hidden flex items-center justify-center"
      >
        {value ? (
          <img src={value} alt="logo" className="size-full object-cover" />
        ) : (
          <span className="text-[11px] font-semibold text-primary-foreground">{initials}</span>
        )}
      </button>

      {value && (
        <button type="button" onClick={() => onChange("")}>
          <X className="size-3.5" />
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
