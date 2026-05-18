import type React from "react";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function IntegrationSection({ title, children }: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>

      {children}
    </section>
  );
}
