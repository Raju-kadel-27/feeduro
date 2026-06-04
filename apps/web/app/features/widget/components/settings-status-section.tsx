import { Switch } from "@components/ui/switch";

type Props = {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  isLoading: boolean;
};

export function SettingsStatusSection({ enabled, onToggle, isLoading }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Widget enabled</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            When off, the embed iframe returns 404 and the button disappears.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={isLoading} />
      </div>
    </section>
  );
}
