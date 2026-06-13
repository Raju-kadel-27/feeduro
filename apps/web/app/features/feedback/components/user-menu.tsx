import { AccountModal } from "@features/layout/components/account-modal";
import { authClient } from "@lib/auth/client";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "../schemas/public";
import { getInitials } from "../utils";

type AccountTab = "profile" | "appearance" | "language";

export function UserMenu({ user, onSubmitPost }: { user: SessionUser; onSubmitPost: () => void }) {
  const [open, setOpen] = useState(false);
  const [accountModal, setAccountModal] = useState<AccountTab | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleClose() {
    setAccountModal(null);
  }

  async function handleLogout() {
    await authClient.signOut();
    window.location.reload();
  }

  const displayName = user.name ?? user.email;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-transparent hover:ring-border transition-all"
          aria-label="User menu"
        >
          {user.image ? (
            <img src={user.image} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {getInitials(displayName)}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
              {user.image ? (
                <img
                  src={user.image}
                  alt={displayName}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {getInitials(displayName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="p-1">
              <button
                type="button"
                onClick={() => { setOpen(false); setAccountModal("profile"); }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Settings
              </button>
            </div>

            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {accountModal && (
        <AccountModal
          user={{ name: user.name ?? "", email: user.email, image: user.image }}
          initialTab={accountModal}
          onClose={handleClose}
        />
      )}
    </>
  );
}
