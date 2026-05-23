import { SidebarFooter } from "@components/ui/sidebar";
import { AccountModal } from "@features/layout/components/account-modal";
import { LanguageSwitcher } from "@features/layout/components/language-switcher";
import { ThemeToggle } from "@features/layout/components/theme-toggle";
import { NotificationsBell } from "@features/notifications/components/notifications-bell";
import { authClient } from "@lib/auth/client";
import { LogOut, Palette, Settings } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

export function SidebarUserFooter() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"profile" | "appearance" | "settings">("profile");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openAccount(tab: "profile" | "appearance" | "settings") {
    setAccountTab(tab);
    setAccountOpen(true);
    setPopoverOpen(false);
  }

  return (
    <SidebarFooter>
      <div ref={popoverRef} className="relative px-2 py-1">
        {popoverOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-popover shadow-xl z-50">
            <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
              {session?.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {session?.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate leading-tight">
                  {session?.user.name ?? ""}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                  {session?.user.email ?? ""}
                </p>
              </div>
            </div>
            <div className="p-1">
              <button
                type="button"
                onClick={() => openAccount("profile")}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Profile settings
              </button>
              <button
                type="button"
                onClick={() => openAccount("appearance")}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
              >
                <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                Appearance
              </button>
              <div className="px-1 py-0.5">
                <LanguageSwitcher variant="full" className="w-full [&>button]:w-full" />
              </div>
            </div>
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  navigate("/sign-in");
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPopoverOpen((p) => !p)}
            className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-1 hover:bg-sidebar-accent transition-colors text-left group"
          >
            {session?.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold group-hover:bg-primary/20 transition-colors">
                {session?.user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="text-xs text-sidebar-foreground truncate">
              {session?.user.name ?? session?.user.email ?? ""}
            </span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {accountOpen && session?.user && (
        <AccountModal
          user={{
            name: session.user.name ?? "",
            email: session.user.email ?? "",
            image: session.user.image ?? null,
          }}
          initialTab={accountTab}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </SidebarFooter>
  );
}
