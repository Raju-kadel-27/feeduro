import type { ReactNode } from "react";

interface BrandingLabelProps {
  children: ReactNode;
  htmlFor?: string;
}

export function BrandingLabel({ children, htmlFor }: BrandingLabelProps) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium leading-none text-foreground shrink-0">
      {children}
    </label>
  );
}
