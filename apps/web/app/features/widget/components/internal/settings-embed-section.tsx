import { Link } from "react-router";
import { buildBoardInlineSnippet } from "../../utils/snippet-builder";
import { CodeBlock } from "./code-block";
import { SectionHeading } from "./section-heading";

type Board = { id: string; name: string; slug: string; isDefault: boolean };

type Props = {
  orgToken: string;
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
      <span className="text-sm font-medium text-muted-foreground">Board</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.slug})
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsEmbedSection({ orgToken, boards, theme, inlineBoardId, setInlineBoardId }: Props) {
  const selectedBoard = boards.find((b) => b.id === inlineBoardId) ?? boards[0];

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeading
        title="Embed snippet"
        description="Copy this into any page where you want the feedback board to appear. Give the container a fixed height."
      />

      <BoardSelect boards={boards} value={inlineBoardId} onChange={setInlineBoardId} />

      {selectedBoard ? (
        <CodeBlock label="HTML" code={buildBoardInlineSnippet(orgToken, selectedBoard.slug, theme)} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No public boards yet. Create a board first.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Add the <code className="bg-muted px-1 py-0.5 rounded">&lt;script&gt;</code> tag once to your{" "}
        <code className="bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code>. The{" "}
        <code className="bg-muted px-1 py-0.5 rounded">&lt;div&gt;</code> can go anywhere in the page body.
      </p>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>
          <code className="bg-muted px-1 py-0.5 rounded">data-fdy-embed</code>
          {" — "}your org token. Identifies which Feeduro account this belongs to.
        </li>
        <li>
          <code className="bg-muted px-1 py-0.5 rounded">data-fdy-board</code>
          {" — "}the board slug. Change this to embed a different board on a different page.
        </li>
        <li>
          <code className="bg-muted px-1 py-0.5 rounded">data-fdy-theme</code>
          {" — "}
          <code className="bg-muted px-1 py-0.5 rounded">light</code>,{" "}
          <code className="bg-muted px-1 py-0.5 rounded">dark</code>, or{" "}
          <code className="bg-muted px-1 py-0.5 rounded">auto</code> (follows system preference).
        </li>
      </ul>

      <p className="text-sm text-muted-foreground">
        Want to tie feedback to your logged-in users?{" "}
        <Link to="?tab=security" className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80">
          Set up identity verification →
        </Link>
      </p>
    </section>
  );
}
