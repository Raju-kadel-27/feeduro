import type React from "react";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function IntegrationSection({ title, children }: Props) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-medium text-gray-600">{title}</h3>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </section>
  );
}
