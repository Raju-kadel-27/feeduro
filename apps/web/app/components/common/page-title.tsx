import type React from "react";
import { cn } from "@lib/utils";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

interface Props {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, action, className }: Props) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b px-4",
        action && "justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      {action}
    </header>
  );
}
