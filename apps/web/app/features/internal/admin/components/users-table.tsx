import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { authClient } from "@lib/auth/client";
import { Search, UserCheck } from "lucide-react";
import { ADMIN_PAGE_SIZE } from "@features/internal/admin/constants";

type User = {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  role: string | null;
  banned: boolean | null;
};

type Props = {
  users: User[];
  total: number;
  currentPage: number;
};

export function UsersTable({ users, total, currentPage }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.ceil(total / ADMIN_PAGE_SIZE);

  function handleSearch(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set("q", value);
          else next.delete("q");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, 400);
  }

  async function handleImpersonate(userId: string) {
    setImpersonating(userId);
    setError(null);
    const { error } = await authClient.admin.impersonateUser({ userId });
    if (error) {
      console.error("[admin] impersonation failed", error);
      setError(error.message ?? "Impersonation failed — is your user ID in PLATFORM_ADMIN_USER_IDS?");
      setImpersonating(null);
      return;
    }
    window.location.href = "/";
  }

  function handlePage(page: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(page));
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["User", "Role", "Joined", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {u.role ?? "user"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Banned</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={!!impersonating}
                    onClick={() => handleImpersonate(u.id)}
                    className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {impersonating === u.id ? "Starting…" : "Impersonate"}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total.toLocaleString()} users · page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}
              className="rounded border px-3 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}
              className="rounded border px-3 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
