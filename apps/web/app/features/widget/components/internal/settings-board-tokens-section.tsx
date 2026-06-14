import { CopyButton } from "./copy-button";
import { SectionHeading } from "./section-heading";

type Board = { id: string; name: string; isDefault: boolean; embedToken: string };

type Props = { boards: Board[] };

export function SettingsBoardTokensSection({ boards }: Props) {
  if (!boards.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <SectionHeading
        title="Board embed tokens"
        description="Each public board has its own token. Use it with FeeduroBoard or the data-fdy-embed attribute to embed a specific board inline."
      />
      <ul className="divide-y divide-border">
        {boards.map((board) => (
          <li key={board.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{board.name}</span>
                {board.isDefault && (
                  <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate select-all">
                {board.embedToken}
              </p>
            </div>
            <CopyButton text={board.embedToken} />
          </li>
        ))}
      </ul>
    </section>
  );
}
