import { Switch } from "@components/ui/switch";
import { UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  initialEnabled: boolean;
  subscriberCount: number;
}

export function SubscriptionsSection({ initialEnabled, subscriberCount }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);

  async function handleToggle(value: boolean) {
    const prev = enabled;
    setEnabled(value);
    try {
      const res = await fetch("/api/changelog-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "toggle-subscriptions", enabled: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? "Email subscriptions enabled" : "Email subscriptions disabled");
    } catch {
      setEnabled(prev);
      toast.error("Failed to save");
    }
  }

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="text-sm font-medium">Email Subscriptions</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Let visitors subscribe to changelog updates. A subscribe form will appear on your public
          changelog, and you can notify subscribers on each publish.
        </p>
        {enabled && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersIcon className="h-3.5 w-3.5" />
            {subscriberCount === 0
              ? "No subscribers yet"
              : `${subscriberCount} active subscriber${subscriberCount === 1 ? "" : "s"}`}
          </p>
        )}
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}
