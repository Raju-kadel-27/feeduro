import { Dialog, DialogContent, DialogTitle } from "@components/ui/dialog";
import { authClient } from "@lib/auth/client";
import { cn } from "@lib/utils";
import { useTheme } from "@providers/theme-provider";
import {
  Camera,
  Globe,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Sun,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { LanguageTab } from "./language-tab";

type Tab = "profile" | "appearance" | "language";
type Theme = "light" | "dark" | "system";

interface AccountUser {
  name: string;
  email: string;
  image?: string | null;
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: AccountUser }) {
  const parts = (user.name ?? "").split(" ");
  const [firstName, setFirstName] = useState(parts[0] ?? "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" "));
  const [avatarSrc, setAvatarSrc] = useState<string | null>(user.image ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (user.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after an error
    e.target.value = "";

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/avatar/upload", { method: "POST", body: fd });
      const text = await res.text();
      let json: { url?: string; error?: string };
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setAvatarSrc(json.url!);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setAvatarSrc(user.image ?? null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const imageUpdate: { image?: string | null } = {};
      if (avatarSrc !== user.image) {
        if (avatarSrc === null) {
          imageUpdate.image = null;
        } else if (avatarSrc.startsWith("http://") || avatarSrc.startsWith("https://")) {
          imageUpdate.image = avatarSrc;
        }
        // data: / blob: URLs are skipped — no storage backend yet
      }
      await authClient.updateUser({
        name: `${firstName} ${lastName}`.trim(),
        ...imageUpdate,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold">Manage Profile</h2>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Change your profile picture, email, full name, and username.
        </p>
      </div>

      <div>
        <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Profile Picture
        </p>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary text-xl font-semibold flex items-center justify-center border-2 border-border">
                {initials}
              </div>
            )}
            {uploading ? (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 h-9 rounded-md border border-border text-[13.5px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Change picture"}
            </button>
            {avatarSrc && !uploading && (
              <button
                type="button"
                onClick={() => setAvatarSrc(null)}
                className="block text-[12.5px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            )}
            {uploadError ? (
              <p className="text-[12px] text-destructive">{uploadError}</p>
            ) : (
              <p className="text-[12px] text-muted-foreground/60">JPG or PNG, max 2 MB</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFile}
          />
        </div>
      </div>

      <div>
        <label className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">
          Email
        </label>
        <input
          type="email"
          value={user.email}
          readOnly
          className="mt-1 w-full h-10 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground cursor-not-allowed outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
          />
        </div>
        <div>
          <label className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || uploading}
        className="px-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
      </button>
    </div>
  );
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ElementType; preview: string }[] = [
    { value: "light", label: "Light", icon: Sun, preview: "bg-white border-gray-200" },
    { value: "dark", label: "Dark", icon: Moon, preview: "bg-zinc-900 border-zinc-700" },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      preview: "bg-gradient-to-br from-white to-zinc-900 border-gray-300",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[17px] font-semibold">Appearance</h2>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Choose how Feeduro looks to you.
        </p>
      </div>

      <div>
        <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-medium mb-3">
          Interface Theme
        </p>
        <div className="grid grid-cols-3 gap-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all",
                theme === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/20 hover:bg-muted/40",
              )}
            >
              <div className={cn("h-12 w-full rounded-lg border", opt.preview)} />
              <div className="flex items-center gap-1.5">
                <opt.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13.5px] font-medium">{opt.label}</span>
              </div>
              {theme === opt.value && (
                <span className="text-[11px] text-primary font-medium">Active</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "language", label: "Language", icon: Globe },
];

export function AccountModal({
  user,
  initialTab = "profile",
  onClose,
}: {
  user: AccountUser;
  initialTab?: Tab | "settings";
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(
    initialTab === "settings" ? "profile" : (initialTab as Tab),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[820px] max-w-[94vw] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:hidden shadow-xl"
        style={{ height: "clamp(560px, 82vh, 700px)" }}
      >
        <DialogTitle className="sr-only">Account settings</DialogTitle>

        <div className="flex h-full">
          {/* Left sidebar */}
          <div className="w-56 shrink-0 border-r border-border bg-muted/30 p-5 flex flex-col">
            <div className="mb-6">
              <p className="text-[15px] font-semibold tracking-tight">Account</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                View and manage your account.
              </p>
            </div>

            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 h-9 rounded-md text-sm transition-colors text-left",
                    tab === item.id
                      ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-8">
            {tab === "profile" && <ProfileTab user={user} />}
            {tab === "appearance" && <AppearanceTab />}
            {tab === "language" && <LanguageTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
