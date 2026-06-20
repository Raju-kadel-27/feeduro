import { PageHeader } from "@components/common/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { authClient } from "@lib/auth/client";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";

import type { Route } from "./+types/passkeys";

export function meta() {
  return [{ title: "Passkeys — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);
  return null;
}

interface PasskeyRecord {
  id: string;
  name: string | null;
  createdAt: Date | string | null;
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d));
}

export default function PasskeysSettings() {
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPasskeys() {
    setLoading(true);
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
      toast.error(error.message ?? "Failed to load passkeys");
    } else {
      setPasskeys((data as PasskeyRecord[] | null) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function handleAdd() {
    setAdding(true);
    const { error } = await authClient.passkey.addPasskey({ name: "My Passkey" });
    if (error) {
      toast.error(error.message ?? "Failed to register passkey");
    } else {
      toast.success("Passkey registered");
      await loadPasskeys();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) {
      toast.error(error.message ?? "Failed to delete passkey");
    } else {
      toast.success("Passkey removed");
      setPasskeys((prev) => prev.filter((pk) => pk.id !== id));
    }
    setDeletingId(null);
  }

  const columns = useMemo<ColumnDef<PasskeyRecord>[]>(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Fingerprint size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {row.original.name ?? "Passkey"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {row.original.createdAt ? formatDate(row.original.createdAt) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleDelete(row.original.id)}
                disabled={deletingId === row.original.id}
                className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove passkey</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ], [deletingId, handleDelete]);

  const table = useReactTable({
    data: passkeys,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Passkeys"
          icon={Fingerprint}
          action={
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Plus size={16} />
              {adding ? "Registering…" : "Add Passkey"}
            </button>
          }
        />

        <section className="space-y-6">
          {loading ? (
            <div className="rounded-lg border border-border p-10 text-center bg-muted/10">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : passkeys.length === 0 ? (
            <Empty className="border border-border">
              <EmptyMedia variant="icon" className="bg-teal-500/10 text-teal-600 dark:text-teal-400"><Fingerprint /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No passkeys registered yet</EmptyTitle>
                <EmptyDescription>Add a passkey to sign in with your device biometrics instead of a password.</EmptyDescription>
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
      </main>
    </>
  );
}
