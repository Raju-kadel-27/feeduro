import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { buildBoardInlineSnippet, buildSnippet } from "../../utils/snippet-builder";
import { CodeBlock } from "./code-block";
import { SectionHeading } from "./section-heading";
import { StepBadge } from "./step-badge";

type Board = { id: string; name: string; isDefault: boolean; embedToken: string };

type Props = {
  boards: Board[];
  currentToken: string;
  position: "left" | "right";
  theme: "light" | "dark" | "auto";
  inlineBoardId: string;
  setInlineBoardId: (id: string) => void;
  orgSlug: string;
};

function BoardSelect({
  boards,
  value,
  onChange,
  className,
}: {
  boards: Board[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  if (boards.length <= 1) return null;
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
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

export function SettingsEmbedSection({
  boards,
  currentToken,
  position,
  theme,
  inlineBoardId,
  setInlineBoardId,
  orgSlug,
}: Props) {
  const selectedBoard = boards.find((b) => b.id === inlineBoardId) ?? boards[0];
  const snippet = buildSnippet(currentToken, position, theme);

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeading
        title="Embed snippet"
        description="Choose your stack. Works for anonymous visitors out of the box — no login required."
      />
      <Tabs defaultValue="html">
        <TabsList className="h-9">
          <TabsTrigger value="html">Floating (HTML)</TabsTrigger>
          <TabsTrigger value="react">Floating (React)</TabsTrigger>
          <TabsTrigger value="inline">Inline embed</TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Paste this snippet before{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> on every
            page. That's it — the widget is live.
          </p>
          <CodeBlock label="HTML" code={snippet} />
        </TabsContent>

        <TabsContent value="inline" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Renders a feedback board directly inside a{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;div&gt;</code> — no floating
            button. Each board has its own embed token. Give the container a height (e.g.{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">height:600px</code>).
          </p>
          <BoardSelect boards={boards} value={inlineBoardId} onChange={setInlineBoardId} />
          {selectedBoard ? (
            <CodeBlock
              label="HTML"
              code={buildBoardInlineSnippet(selectedBoard.embedToken, theme)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No public boards available. Create a board first.
            </p>
          )}
        </TabsContent>

        <TabsContent value="react" className="space-y-3">
          <StepBadge n={1} label="Install the package" />
          <CodeBlock
            label="terminal"
            code={`npm install @feeduro/react\n# or: pnpm add @feeduro/react  /  yarn add @feeduro/react`}
          />
          <StepBadge n={2} label="Floating widget — wrap your app with FeeduroProvider" />
          <CodeBlock
            label="App.tsx  ·  layout.tsx  ·  root.tsx"
            code={`import { FeeduroProvider } from '@feeduro/react';\n\nexport default function App() {\n  return (\n    <FeeduroProvider\n      token="${currentToken}"\n      position="${position}"\n      theme="${theme}"\n    >\n      {/* your app */}\n    </FeeduroProvider>\n  );\n}`}
          />
          <p className="text-xs text-muted-foreground pl-7">
            No <code className="bg-muted px-1 py-0.5 rounded">&lt;script&gt;</code> tag needed —
            the provider loads the SDK automatically. Works with Next.js App Router, Remix, React
            Router, and plain Vite.
          </p>
          <StepBadge n={3} label="Inline board — drop FeeduroBoard anywhere" />
          <BoardSelect
            boards={boards}
            value={inlineBoardId}
            onChange={setInlineBoardId}
            className="pl-7"
          />
          <CodeBlock
            label="feedback/page.tsx"
            code={`import { FeeduroBoard } from '@feeduro/react';\n\nexport default function FeedbackPage() {\n  return (\n    <FeeduroBoard\n      token="${selectedBoard?.embedToken ?? currentToken}"\n      theme="${theme}"\n      style={{ height: 600 }}\n    />\n  );\n}`}
          />
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Want to tie feedback to your logged-in users? See{" "}
        <span className="font-medium text-foreground">Identity verification</span> below.
      </p>
    </section>
  );
}
