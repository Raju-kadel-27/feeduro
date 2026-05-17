import type { PublicChangelog } from "@features/feedback/schemas/public";
import { UpdateEntry } from "./update-entry";

export function UpdatesView({ entries }: { entries: PublicChangelog[] }) {
  return (
    <section className="min-w-0 flex-1">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          No updates published yet.
        </div>
      ) : (
        entries.map((entry) => <UpdateEntry key={entry.id} entry={entry} />)
      )}
    </section>
  );
}
