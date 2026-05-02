import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Switch } from "@components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { requireOrgBySlug } from "@lib/session.server";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { data, useFetcher } from "react-router";
import { getDb } from "@/db";
import { feedbackBoards, widgetConfigs } from "@/db/schema";
import type { Route } from "./+types/widget";

function generateSigningSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function meta() {
  return [{ title: "Widget Settings — Feediyo" }];
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [existingConfig, publicBoards] = await Promise.all([
    db.query.widgetConfigs.findFirst({
      where: eq(widgetConfigs.organizationId, org.id),
    }),
    db.query.feedbackBoards.findMany({
      where: and(
        eq(feedbackBoards.organizationId, org.id),
        eq(feedbackBoards.visibility, "public"),
      ),
    }),
  ]);

  let config = existingConfig;
  if (!config) {
    await db.insert(widgetConfigs).values({
      organizationId: org.id,
      signingSecret: generateSigningSecret(),
    });
    config = await db.query.widgetConfigs.findFirst({
      where: eq(widgetConfigs.organizationId, org.id),
    });
  } else if (!config.signingSecret) {
    await db
      .update(widgetConfigs)
      .set({ signingSecret: generateSigningSecret() })
      .where(eq(widgetConfigs.id, config.id));
    config = await db.query.widgetConfigs.findFirst({
      where: eq(widgetConfigs.organizationId, org.id),
    });
  }

  return data({
    orgSlug: org.slug ?? "",
    config: config!,
    boards: publicBoards.map((b) => ({ id: b.id, name: b.name, isDefault: b.isDefault })),
  });
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function action({ request, params }: Route.ActionArgs) {
  const { org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent") as string;

  const existing = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.organizationId, org.id),
  });

  if (intent === "save") {
    const enabled = form.get("enabled") === "true";
    const boardId = (form.get("boardId") as string) || null;
    const position = (form.get("position") as "left" | "right") || "right";
    const theme = (form.get("theme") as "light" | "dark" | "auto") || "auto";

    if (existing) {
      await db
        .update(widgetConfigs)
        .set({ enabled, boardId, position, theme })
        .where(eq(widgetConfigs.id, existing.id));
    } else {
      await db
        .insert(widgetConfigs)
        .values({ organizationId: org.id, enabled, boardId, position, theme });
    }
    return data({ ok: true });
  }

  if (intent === "regenerate") {
    const newToken = createId();
    if (existing) {
      await db
        .update(widgetConfigs)
        .set({ token: newToken })
        .where(eq(widgetConfigs.id, existing.id));
    } else {
      await db.insert(widgetConfigs).values({ organizationId: org.id, token: newToken });
    }
    return data({ ok: true });
  }

  if (intent === "rotate-secret") {
    const newSecret = generateSigningSecret();
    if (existing) {
      await db
        .update(widgetConfigs)
        .set({ signingSecret: newSecret })
        .where(eq(widgetConfigs.id, existing.id));
    } else {
      await db.insert(widgetConfigs).values({ organizationId: org.id, signingSecret: newSecret });
    }
    return data({ ok: true, newSecret });
  }

  return data({ ok: false }, { status: 400 });
}

// ─── Snippet builder ──────────────────────────────────────────────────────────

function buildSnippet(token: string, position: string, theme: string) {
  return `<script>
  window.$fdyq = window.$fdyq || [];
  window.feediyo = window.feediyo || new Proxy({}, { get: (_, p) => (...a) => window.$fdyq.push([p, ...a]) });
  document.head.appendChild(Object.assign(document.createElement('script'), { src: 'https://feediyo.com/sdk/v1/fdy.js', async: true }));
  window.feediyo.init('${token}', { position: '${position}', theme: '${theme}' });
</script>`;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function CodeBlock({ label, code, wrap = false }: { label: string; code: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[11px] font-medium text-zinc-400 tracking-wide">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 h-6 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className={`p-4 text-[13px] font-mono leading-relaxed overflow-x-auto text-zinc-300 bg-zinc-950 ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
      >
        {code}
      </pre>
    </div>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 select-none">
        {n}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WidgetSettings({ loaderData }: Route.ComponentProps) {
  const { config, boards } = loaderData;
  const fetcher = useFetcher();
  const regenFetcher = useFetcher();
  const secretFetcher = useFetcher();
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmRotateSecret, setConfirmRotateSecret] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);

  const [enabled, setEnabled] = useState(config.enabled);
  const [boardId, setBoardId] = useState(config.boardId ?? "");
  const [position, setPosition] = useState<"left" | "right">(config.position);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(config.theme);

  const currentToken = (regenFetcher.data as { ok?: boolean } | undefined)?.ok
    ? "(regenerated — reload to see new snippet)"
    : config.token;

  const currentSecret =
    (secretFetcher.data as { newSecret?: string } | undefined)?.newSecret ??
    config.signingSecret ??
    "";

  const snippet = buildSnippet(currentToken, position, theme);
  const isSaving = fetcher.state !== "idle";
  const savedOk = (fetcher.data as { ok?: boolean } | undefined)?.ok;

  function handleSave() {
    const form = new FormData();
    form.set("intent", "save");
    form.set("enabled", String(enabled));
    form.set("boardId", boardId);
    form.set("position", position);
    form.set("theme", theme);
    fetcher.submit(form, { method: "POST" });
  }

  function handleRegenerate() {
    if (!confirmRegen) {
      setConfirmRegen(true);
      return;
    }
    setConfirmRegen(false);
    const form = new FormData();
    form.set("intent", "regenerate");
    regenFetcher.submit(form, { method: "POST" });
  }

  function handleRotateSecret() {
    if (!confirmRotateSecret) {
      setConfirmRotateSecret(true);
      return;
    }
    setConfirmRotateSecret(false);
    const form = new FormData();
    form.set("intent", "rotate-secret");
    secretFetcher.submit(form, { method: "POST" });
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium text-foreground">Widget</span>
        </header>

        <main className="p-6 max-w-2xl mx-auto w-full space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Embed Widget</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add a floating feedback button to any website or React app.
            </p>
          </div>

          {/* ── Status ── */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Widget enabled</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When off, the embed iframe returns 404 and the button disappears.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => {
                  setEnabled(v);
                  const form = new FormData();
                  form.set("intent", "save");
                  form.set("enabled", String(v));
                  form.set("boardId", boardId);
                  form.set("position", position);
                  form.set("theme", theme);
                  fetcher.submit(form, { method: "POST" });
                }}
              />
            </div>
          </section>

          {/* ── Configuration ── */}
          <section className="rounded-xl border border-border bg-card px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Board — only shown when there are public boards to choose from */}
              {boards.length > 0 && (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Board
                    </span>
                    <select
                      value={boardId}
                      onChange={(e) => setBoardId(e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition"
                    >
                      <option value="">Default</option>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                          {b.isDefault ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-px h-5 bg-border hidden sm:block" />
                </>
              )}

              {/* Position */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Position
                </span>
                <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
                  {(["right", "left"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPosition(v)}
                      className={`px-2.5 py-1 rounded text-xs transition-all ${
                        position === v
                          ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v === "right" ? "Right" : "Left"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-5 bg-border hidden sm:block" />

              {/* Theme */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Theme
                </span>
                <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
                  {(["auto", "light", "dark"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTheme(v)}
                      className={`px-2.5 py-1 rounded text-xs capitalize transition-all ${
                        theme === v
                          ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-2 ml-auto">
                {!isSaving && savedOk && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </section>

          {/* ── Embed snippet ── */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <SectionHeading
              title="Embed snippet"
              description="Choose your stack. Works for anonymous visitors out of the box — no login required."
            />

            <Tabs defaultValue="html">
              <TabsList className="h-9">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="react">React</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Paste this snippet before{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> on
                  every page. That's it — the widget is live.
                </p>
                <CodeBlock label="HTML" code={snippet} />
              </TabsContent>

              <TabsContent value="react" className="space-y-3">
                <StepBadge n={1} label="Install the package" />
                <CodeBlock
                  label="terminal"
                  code={`npm install @feediyo/react
# or: pnpm add @feediyo/react  /  yarn add @feediyo/react`}
                />

                <StepBadge n={2} label="Wrap your app with FeediyoProvider" />
                <CodeBlock
                  label="App.tsx  ·  layout.tsx  ·  root.tsx"
                  code={`import { FeediyoProvider } from '@feediyo/react';

export default function App() {
  return (
    <FeediyoProvider
      projectId="${currentToken}"
      position="${position}"
      theme="${theme}"
    >
      {/* your app */}
    </FeediyoProvider>
  );
}`}
                />
                <p className="text-xs text-muted-foreground pl-7">
                  No <code className="bg-muted px-1 py-0.5 rounded">&lt;script&gt;</code> tag needed
                  — the provider loads the SDK automatically. Works with Next.js App Router, Remix,
                  React Router, and plain Vite.
                </p>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              Want to tie feedback to your logged-in users? See{" "}
              <span className="font-medium text-foreground">Identity verification</span> below.
            </p>
          </section>

          {/* ── Identity verification ── */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-6">
            <SectionHeading
              title="Identity verification"
              description="Tie feedback submissions to your logged-in users with a server-generated HMAC signature. Without it, anyone could spoof a user ID."
            />

            {/* Step 1 */}
            <div className="space-y-3">
              <StepBadge
                n={1}
                label="Copy your signing secret and store it as an environment variable"
              />
              <div className="pl-7 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground/80 overflow-hidden">
                    {secretVisible ? currentSecret : "•".repeat(Math.min(currentSecret.length, 32))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecretVisible((v) => !v)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={secretVisible ? "Hide" : "Reveal"}
                  >
                    {secretVisible ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {secretVisible ? "Hide" : "Reveal"}
                  </button>
                  <CopyButton text={currentSecret} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Never put this in client-side code. Set it as{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">FEEDIYO_SIGNING_SECRET</code> on
                  your server.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <StepBadge
                n={2}
                label="Generate the signature server-side and pass it to your widget"
              />
              <div className="pl-7">
                <Tabs defaultValue="nodejs">
                  <TabsList className="h-9">
                    <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                    <TabsTrigger value="react">React</TabsTrigger>
                    <TabsTrigger value="golang">Go</TabsTrigger>
                    <TabsTrigger value="rails">Rails</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>

                  {/* ── Node.js ── */}
                  <TabsContent value="nodejs" className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
                      Server
                    </p>
                    <CodeBlock
                      label="server.js"
                      code={`import crypto from 'node:crypto';

const signature = crypto
  .createHmac('sha256', process.env.FEEDIYO_SIGNING_SECRET)
  .update(currentUser.id)
  .digest('hex');

// Pass to the client — e.g. res.render('page', { feediyoSig: signature });`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Client
                    </p>
                    <CodeBlock
                      label="page.js"
                      code={`window.feediyo.identify({
  id:        currentUser.id,
  email:     currentUser.email,
  name:      currentUser.name,
  signature: feediyoSig,
});`}
                    />
                  </TabsContent>

                  {/* ── React ── */}
                  <TabsContent value="react" className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
                      Server — one call, everything included
                    </p>
                    <CodeBlock
                      label="app/root.tsx  ·  layout.tsx  (React Router / Remix)"
                      code={`import { createFeediyoAuth } from '~/lib/feediyo-auth.server';

export async function loader({ request }) {
  const user = await getAuthUser(request);

  const feediyoAuth = user
    ? await createFeediyoAuth(
        user.id,
        user.email,
        user.name,
        process.env.FEEDIYO_SIGNING_SECRET!,
      )
    : null;

  return { user, feediyoAuth };
}`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Client — pass to the provider, done
                    </p>
                    <CodeBlock
                      label="app/root.tsx  ·  layout.tsx"
                      code={`import { FeediyoProvider } from '@feediyo/react';

export default function Root({ loaderData }) {
  const { user, feediyoAuth } = loaderData;

  return (
    <FeediyoProvider
      projectId="${currentToken}"
      position="${position}"
      theme="${theme}"
      user={user && feediyoAuth
        ? { id: user.id, email: user.email, name: user.name, ...feediyoAuth }
        : null}
    >
      {/* your app */}
    </FeediyoProvider>
  );
}`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Automatic login — link to your public board
                    </p>
                    <CodeBlock
                      label="any component inside FeediyoProvider"
                      code={`import { useFeediyo } from '@feediyo/react';

function FeedbackLink() {
  const { createAutoLoginUrl } = useFeediyo();

  return (
    <a href={createAutoLoginUrl('https://${loaderData.orgSlug}.feediyo.com')}>
      View public board →
    </a>
  );
}`}
                    />
                    <p className="text-xs text-zinc-500 pt-1">
                      <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
                        createFeediyoAuth
                      </code>{" "}
                      generates both the HMAC signature (widget identity) and the{" "}
                      <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
                        clientToken
                      </code>{" "}
                      (auto-login) in one server call. Users who click the link land on your board
                      already signed in — no login prompt.
                    </p>
                  </TabsContent>

                  {/* ── Go ── */}
                  <TabsContent value="golang" className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
                      Server
                    </p>
                    <CodeBlock
                      label="handler.go"
                      code={`import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "os"
)

func feediyoSignature(userID string) string {
    mac := hmac.New(sha256.New, []byte(os.Getenv("FEEDIYO_SIGNING_SECRET")))
    mac.Write([]byte(userID))
    return hex.EncodeToString(mac.Sum(nil))
}

sig := feediyoSignature(currentUser.ID)
tmpl.Execute(w, PageData{User: currentUser, FeediyoSig: sig})`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Client — Go html/template
                    </p>
                    <CodeBlock
                      label="page.html"
                      code={`<script>
  window.feediyo.identify({
    id:        '{{ .User.ID }}',
    email:     '{{ .User.Email }}',
    name:      '{{ .User.Name }}',
    signature: '{{ .FeediyoSig }}',
  });
</script>`}
                    />
                  </TabsContent>

                  {/* ── Rails ── */}
                  <TabsContent value="rails" className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
                      Server
                    </p>
                    <CodeBlock
                      label="application_controller.rb"
                      code={`require 'openssl'

helper_method :feediyo_signature

def feediyo_signature
  return nil unless current_user
  OpenSSL::HMAC.hexdigest('SHA256', ENV['FEEDIYO_SIGNING_SECRET'], current_user.id.to_s)
end`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Client — ERB
                    </p>
                    <CodeBlock
                      label="layout.html.erb"
                      code={`<% if current_user %>
  <script>
    window.feediyo.identify({
      id:        '<%= current_user.id %>',
      email:     '<%= current_user.email %>',
      name:      '<%= current_user.name %>',
      signature: '<%= feediyo_signature %>',
    });
  </script>
<% end %>`}
                    />
                  </TabsContent>

                  {/* ── Python ── */}
                  <TabsContent value="python" className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5">
                      Server
                    </p>
                    <CodeBlock
                      label="views.py"
                      code={`import hmac, hashlib, os

def feediyo_signature(user_id: str) -> str:
    secret = os.environ["FEEDIYO_SIGNING_SECRET"].encode()
    return hmac.new(secret, user_id.encode(), hashlib.sha256).hexdigest()

def my_view(request):
    sig = feediyo_signature(str(request.user.id))
    return render(request, "page.html", {"user": request.user, "feediyo_sig": sig})`}
                    />
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-0.5 pt-1">
                      Client — Django / Jinja2
                    </p>
                    <CodeBlock
                      label="layout.html"
                      code={`{% if user.is_authenticated %}
  <script>
    window.feediyo.identify({
      id:        '{{ user.id }}',
      email:     '{{ user.email }}',
      name:      '{{ user.get_full_name }}',
      signature: '{{ feediyo_sig }}',
    });
  </script>
{% endif %}`}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Rotate secret */}
            <div className="flex items-center gap-3 pt-1 border-t border-border/60">
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleRotateSecret}
                  disabled={secretFetcher.state !== "idle"}
                  className={`flex items-center gap-2 px-3 h-8 rounded-md border text-sm font-medium transition-colors ${
                    confirmRotateSecret
                      ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {confirmRotateSecret ? "Confirm rotation" : "Rotate secret"}
                </button>
                {confirmRotateSecret ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRotateSecret(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Immediately invalidates all existing signatures.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Danger zone ── */}
          <section className="rounded-xl border border-destructive/25 bg-destructive/[0.02] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Regenerating the widget token will break all existing embed snippets immediately.
                You'll need to redeploy the new snippet to every site.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenFetcher.state !== "idle"}
                className={`flex items-center gap-2 px-3 h-8 rounded-md border text-sm font-medium transition-colors ${
                  confirmRegen
                    ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {confirmRegen ? "Confirm regenerate" : "Regenerate token"}
              </button>
              {confirmRegen && (
                <button
                  type="button"
                  onClick={() => setConfirmRegen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
