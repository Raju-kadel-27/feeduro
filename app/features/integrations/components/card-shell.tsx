import type React from "react";

interface Props {
  children: React.ReactNode;
}

export function IntegrationCardShell({ children }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {children}
    </div>
  );
}