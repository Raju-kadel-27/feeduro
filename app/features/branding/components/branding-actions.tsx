import { Check } from "lucide-react";

import { Button } from "@components/ui/button";

interface BrandingActionsProps {
  isSubmitting: boolean;
  isDirty: boolean;
}

export function BrandingActions({ isSubmitting, isDirty }: BrandingActionsProps) {
  return (
    <div className="pt-5">
      <Button type="submit" disabled={isSubmitting || !isDirty} className="gap-1.5">
        {isSubmitting ? (
          <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          </svg>
        ) : (
          <Check className="size-3.5" />
        )}
        Save changes
      </Button>
    </div>
  );
}
