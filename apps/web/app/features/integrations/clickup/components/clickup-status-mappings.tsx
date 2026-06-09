import { Spinner } from "@components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight } from "lucide-react";

interface ClickupStatus { id: string; status: string; type: string; color?: string }
interface StatusMapping { clickupStatus: string; feediyoStatus: string }

const FEEDIYO_STATUSES = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

async function callClickupApi(body: object) {
  const res = await fetch("/api/clickup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { error?: string; [k: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

interface Props {
  listId: string;
  savedMappings: StatusMapping[];
  onChange: (mappings: StatusMapping[]) => void;
  disabled?: boolean;
}

export function ClickupStatusMappings({ listId, savedMappings, onChange, disabled }: Props) {
  const { data: statuses, isLoading, error } = useQuery({
    queryKey: ["clickup-statuses", listId],
    queryFn: async () => {
      const json = (await callClickupApi({ intent: "list_statuses", listId })) as { statuses?: ClickupStatus[] };
      return json.statuses ?? [];
    },
    enabled: !!listId,
  });

  const mappingMap = Object.fromEntries(savedMappings.map((m) => [m.clickupStatus, m.feediyoStatus]));

  function handleChange(statusName: string, feediyoStatus: string) {
    const next = { ...mappingMap, [statusName]: feediyoStatus };
    if (!feediyoStatus) delete next[statusName];
    onChange(
      Object.entries(next).map(([clickupStatus, fs]) => ({ clickupStatus, feediyoStatus: fs })),
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Spinner className="size-3" /> Loading statuses…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-destructive">
        <AlertCircle size={12} /> {error.message}
      </div>
    );
  }

  if (!statuses?.length) return null;

  return (
    <div className="pt-1 border-t border-border space-y-2">
      <div>
        <p className="text-xs font-medium text-foreground">Status mapping</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          When a ClickUp task moves to one of these statuses, the linked Feediyo post updates automatically.
        </p>
      </div>
      <div className="space-y-1.5">
        {statuses.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: s.color ?? "#d3d3d3" }}
            />
            <span className="text-xs text-foreground w-28 truncate">{s.status}</span>
            <ArrowRight size={11} className="text-muted-foreground shrink-0" />
            <select
              value={mappingMap[s.status] ?? ""}
              disabled={disabled}
              onChange={(e) => handleChange(s.status, e.target.value)}
              className="flex-1 text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">— no mapping —</option>
              {FEEDIYO_STATUSES.map((fs) => (
                <option key={fs.value} value={fs.value}>{fs.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
