import { authClient } from "@lib/auth/client";
import { UserX } from "lucide-react";

export function ImpersonateBanner() {
  const { data: session } = authClient.useSession();
  const impersonatedBy = session?.session?.impersonatedBy;

  if (!impersonatedBy) return null;

  async function handleStop() {
    const { error } = await authClient.admin.stopImpersonating();
    if (error) {
      console.error("[admin] stopImpersonating failed", error);
      return;
    }
    window.location.href = "/admin-users";
  }

  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <div className="flex items-center gap-2">
        <UserX className="h-4 w-4 shrink-0" />
        <span>
          Impersonating <strong>{session?.user.email}</strong> — actions are taken as this user
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        className="rounded border border-white/40 bg-white/10 px-3 py-0.5 text-xs font-semibold hover:bg-white/20 transition-colors"
      >
        Stop impersonating
      </button>
    </div>
  );
}
