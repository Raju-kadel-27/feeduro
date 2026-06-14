import { Spinner } from "@components/ui/spinner";
import { cn } from "@lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";

interface Item { id: string; name: string; folder?: string }

async function callClickupApi(body: object) {
  const res = await fetch("/api/clickup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { error?: string; [k: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function Dropdown<T extends Item>({
  placeholder,
  selected,
  items,
  isLoading,
  error,
  onSelect,
  onRefresh,
}: {
  placeholder: string;
  selected: string | null;
  items: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onSelect: (item: T) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items?.find((i) => i.id === selected);
  const label = selectedItem
    ? (selectedItem.folder ? `${selectedItem.folder} / ${selectedItem.name}` : selectedItem.name)
    : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className={selectedItem ? "text-foreground" : "text-muted-foreground"}>{label}</span>
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner className="size-3.5" /> Loading…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-destructive">
                <AlertCircle size={14} /> {error.message}
              </div>
            )}
            {!isLoading && !error && (items ?? []).length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nothing found</p>
            )}
            {(items ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <span className="flex-1 truncate">
                  {item.folder ? `${item.folder} / ${item.name}` : item.name}
                </span>
                {item.id === selected && <Check size={12} className="ml-auto text-primary shrink-0" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ListPickerProps {
  workspaceId: string;
  selectedListId: string | null;
  initialSpaceId?: string | null;
  onSelect: (listId: string, listName: string, spaceId: string) => void;
}

export function ListPicker({ workspaceId, selectedListId, initialSpaceId, onSelect }: ListPickerProps) {
  const [spaceId, setSpaceId] = useState<string | null>(initialSpaceId ?? null);
  const spacesQuery = useQuery({
    queryKey: ["clickup-spaces", workspaceId],
    queryFn: async () => {
      const json = (await callClickupApi({ intent: "list_spaces", workspaceId })) as {
        spaces?: Item[];
      };
      return json.spaces ?? [];
    },
  });

  const listsQuery = useQuery({
    queryKey: ["clickup-lists", spaceId],
    queryFn: async () => {
      const json = (await callClickupApi({ intent: "list_lists", spaceId })) as {
        lists?: Item[];
      };
      return json.lists ?? [];
    },
    enabled: !!spaceId,
  });

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Space</p>
        <Dropdown<Item>
          placeholder="Select a space…"
          selected={spaceId}
          items={spacesQuery.data}
          isLoading={spacesQuery.isLoading}
          error={spacesQuery.error}
          onSelect={(s) => setSpaceId(s.id)}
          onRefresh={() => spacesQuery.refetch()}
        />
      </div>
      {spaceId && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">List</p>
          <Dropdown<Item>
            placeholder="Select a list…"
            selected={selectedListId}
            items={listsQuery.data}
            isLoading={listsQuery.isLoading}
            error={listsQuery.error}
            onSelect={(l) => onSelect(l.id, l.name, spaceId!)}
            onRefresh={() => listsQuery.refetch()}
          />
        </div>
      )}
    </div>
  );
}
