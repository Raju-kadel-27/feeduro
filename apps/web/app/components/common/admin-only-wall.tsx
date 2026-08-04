import { ShieldAlert } from "lucide-react";

interface AdminOnlyWallProps {
  message?: string;
}

export function AdminOnlyWall({ message = "Only workspace admins can access this page." }: AdminOnlyWallProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-6 flex flex-col items-center gap-3 text-center">
      <ShieldAlert className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
