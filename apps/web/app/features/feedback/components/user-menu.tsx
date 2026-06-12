import { AccountModal } from "@features/layout/components/account-modal";
import { authClient } from "@lib/auth/client";
import { cn } from "@lib/utils";
import { useTheme } from "@providers/theme-provider";
import {
  ChevronRight,
  Globe,
  LogOut,
  Megaphone,
  Monitor,
  Moon,
  Palette,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "../schemas/public";
import { avatarColor, getInitials } from "../utils";

type AccountTab = "profile" | "appearance";
type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function UserMenu({ user, onSubmitPost }: { user: SessionUser; onSubmitPost: () => void }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [accountModal, setAccountModal] = useState<AccountTab | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setThemeOpen(false);
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
          onClick={() => {
            setOpen((v) => !v);
            setThemeOpen(false);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-transparent hover:ring-border transition-all"
          aria-label="User menu"
        >
          {user.image ? (
            <img src={user.image} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: avatarColor(displayName) }}
            >
              {getInitials(displayName)}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-50 py-1.5 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border mb-1">
              <p className="text-[13px] font-semibold truncate">{displayName}</p>
              <p className="text-[11.5px] text-muted-foreground truncate">{user.email}</p>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                onSubmitPost();
              }}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
              Submit a Post
            </button>

            <button
              onClick={() => {
                setOpen(false);
                setAccountModal("profile");
              }}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Profile
            </button>

            <div className="my-1 border-t border-border" />

            <div className="relative">
              <button
                onClick={() => setThemeOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-left">Theme</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {themeOpen && (
                <div className="absolute right-full top-0 mr-1 w-36 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 h-8 text-[12.5px] transition-colors",
                        theme === opt.value
                          ? "text-foreground font-medium bg-muted"
                          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-left">Language</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="my-1 border-t border-border" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
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
