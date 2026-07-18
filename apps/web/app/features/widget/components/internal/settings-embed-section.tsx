import { Link } from "react-router";
import { buildBoardInlineSnippet } from "../../utils/snippet-builder";
import { CodeBlock } from "./code-block";
import { SectionHeading } from "./section-heading";

type Board = { id: string; name: string; isDefault: boolean; embedToken: string };

type Props = {
  boards: Board[];
  theme: "light" | "dark" | "auto";
  inlineBoardId: string;
  setInlineBoardId: (id: string) => void;
};

function BoardSelect({
  boards,
  value,
  onChange,
}: {
  boards: Board[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (boards.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Board</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.isDefault ? " ✓" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsEmbedSection({ boards, theme, inlineBoardId, setInlineBoardId }: Props) {
  const selectedBoard = boards.find((b) => b.id === inlineBoardId) ?? boards[0];

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeading
        title="Embed snippet"
        description="Render the feedback board directly inside a container on your page. Each board has its own embed token."
      />

      <p className="text-sm text-muted-foreground">
        Place this where you want the board to appear. Give the container a height (e.g.{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">height:600px</code>).
      </p>

      <BoardSelect boards={boards} value={inlineBoardId} onChange={setInlineBoardId} />

      {selectedBoard ? (
        <CodeBlock label="HTML" code={buildBoardInlineSnippet(selectedBoard.embedToken, theme)} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No public boards available. Create a board first.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Want to tie feedback to your logged-in users? See{" "}
        <Link to="?tab=security" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80">
          Identity verification
        </Link>{" "}
        in the Security tab.
      </p>
    </section>
  );
}
