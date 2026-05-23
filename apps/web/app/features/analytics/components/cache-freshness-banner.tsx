import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Alert } from "@components/ui/alert";

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function CacheFreshnessBanner({ fetchedAt }: { fetchedAt: number }) {
  const [age, setAge] = useState("");

  useEffect(() => {
    const update = () => setAge(formatAge(Date.now() - fetchedAt));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  return (
    <Alert role="status" className="py-2 items-center border-muted bg-muted/40">
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        Analytics data is cached · refreshes every 30 min
        {age && <> · last fetched <span className="font-medium">{age}</span></>}
      </span>
    </Alert>
  );
}
