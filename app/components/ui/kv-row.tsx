import type { ReactNode } from "react";

export function KVRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <span className="text-muted-foreground self-center">{label}</span>
      <div className="min-w-0">{children}</div>
    </>
  );
}