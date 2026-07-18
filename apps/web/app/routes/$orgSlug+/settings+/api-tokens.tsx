import { PageHeader } from "@components/common/page-header";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { and, desc, eq } from "drizzle-orm";
import { AlertCircle, Check, Code, Copy, Key, Plus, Terminal, Trash2 } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { Await, useRevalidator } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { apikey, member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/api-tokens";

export function meta() {
  return [{ title: "API Tokens — Feeduro" }];
}

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  lastRequest: Date | null;
  enabled: boolean;
}

type ApiTokensData = { keys: ApiKeyRow[]; isAdmin: boolean };

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const dataPromise: Promise<ApiTokensData> = Promise.all([
    db.query.apikey.findMany({
      where: eq(apikey.referenceId, organizationId),
      columns: {
        id: true,
        name: true,
        start: true,
        prefix: true,
        createdAt: true,
        expiresAt: true,
        lastRequest: true,
        enabled: true,
      },
      orderBy: [desc(apikey.createdAt)],
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]).then(([keys, memberRecord]) => ({
    keys: keys as ApiKeyRow[],
    isAdmin: memberRecord?.role === "admin",
  }));

  return { dataPromise };
}

const EXPIRY_OPTIONS = [
  { label: "No expiration", value: null },
  { label: "30 days", value: 60 * 60 * 24 * 30 },
  { label: "90 days", value: 60 * 60 * 24 * 90 },
  { label: "1 year", value: 60 * 60 * 24 * 365 },
] as const;

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy"
      className={cn(
        "p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors bg-muted/10 hover:bg-muted/20",
        className,
      )}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

export function ErrorBoundary() {
  return (
    <div className="p-6 text-sm text-destructive">
      Failed to load API tokens. Please refresh and try again.
    </div>
  );
}

export default function ApiTokensSettings({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await resolve={loaderData.dataPromise as unknown as Promise<ApiTokensData>}>
          {(pageData) => <ApiTokensContent {...pageData} />}
        </Await>
      </Suspense>
    </>
  );
}

function ApiTokensContent({ keys, isAdmin }: ApiTokensData) {
  const revalidator = useRevalidator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function callApi(body: object) {
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { error?: string; key?: { key: string } };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  const { mutate: createKey, isPending: creating } = useMutation({
    mutationFn: () => callApi({ intent: "create", name, expiresIn }),
    onSuccess: (result) => {
      const key = (result as { key?: { key: string } }).key?.key ?? null;
      setNewKey(key);
      setName("");
      setExpiresIn(null);
      setDialogOpen(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteKey, isPending: deleting } = useMutation({
    mutationFn: (keyId: string) => callApi({ intent: "delete", keyId }),
    onSuccess: () => {
      toast.success("API key deleted");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const columns = useMemo<ColumnDef<ApiKeyRow>[]>(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">
            {row.original.name ?? "Unnamed"}
          </span>
          {row.original.start && (
            <code className="text-xs text-muted-foreground font-mono mt-0.5 block">
              {row.original.start}••••••••
            </code>
          )}
        </div>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const isExpired = row.original.expiresAt != null && new Date(row.original.expiresAt) < new Date();
        const label = !row.original.enabled ? "Disabled" : isExpired ? "Expired" : "Active";
        const cls = !row.original.enabled || isExpired
          ? "bg-destructive/10 text-destructive"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        return (
          <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap", cls)}>
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        isAdmin ? (
          <button
            type="button"
            onClick={() => deleteKey(row.original.id)}
            disabled={deleting}
            title="Delete key"
            className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        ) : null,
    },
  ], [isAdmin, deleteKey, deleting]);

  const table = useReactTable({
    data: keys,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
      <PageHeader
        title="API Tokens"
          icon={Code}
          action={isAdmin ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus size={16} />
                  Generate New Key
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New API Key</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => { e.preventDefault(); createKey(); }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. CI / Production"
                      required
                      maxLength={32}
                      className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Expiration</label>
                    <select
                      value={expiresIn ?? ""}
                      onChange={(e) => setExpiresIn(e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {EXPIRY_OPTIONS.map((opt) => (
                        <option key={String(opt.value)} value={opt.value ?? ""}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={creating || !name.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {creating ? "Generating…" : "Generate Key"}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined}
        />

        {/* One-time key reveal */}
        {newKey && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={16} />
              <span className="text-sm font-semibold">
                Copy your API key now — it won't be shown again
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <code className="text-sm font-mono text-foreground flex-1 break-all">{newKey}</code>
              <CopyButton value={newKey} />
            </div>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I've saved my key
            </button>
          </div>
        )}

        {/* Keys table */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Active Keys</h3>

          {keys.length === 0 ? (
            <Empty className="border border-border">
              <EmptyMedia variant="icon" className="size-14 [&_svg]:size-7 bg-teal-500/10 text-teal-600 dark:text-teal-400"><Key /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No API keys yet</EmptyTitle>
                <EmptyDescription>Generate a key to authenticate requests to the Feeduro API.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Usage hint */}
        <section className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/40">
            <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">Using the API</span>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Authenticate requests by passing your token in the{" "}
              <code className="rounded px-1.5 py-0.5 bg-muted font-mono text-xs text-foreground">
                x-api-key
              </code>{" "}
              header.
            </p>
            <div className="rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Shell</span>
                <CopyButton
                  value={`curl -H "x-api-key: fdy_YOUR_TOKEN" https://api.feeduro.com/v1/`}
                  className="text-zinc-400 hover:text-zinc-200 bg-transparent hover:bg-zinc-800"
                />
              </div>
              <div className="px-4 py-3">
                <code className="text-sm font-mono text-zinc-300 block">
                  <span className="text-zinc-500 select-none">$ </span>
                  {"curl \\\n"}
                  <span className="text-zinc-500 select-none">{"  "}</span>
                  {"-H "}
                  <span className="text-emerald-400">"x-api-key: fdy_••••••••"</span>
                  {" \\\n"}
                  <span className="text-zinc-500 select-none">{"  "}</span>
                  <span className="text-sky-400">https://api.feeduro.com/v1/...</span>
                </code>
              </div>
            </div>
          </div>
        </section>
    </main>
  );
}
