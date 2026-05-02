import { AppSidebar } from "@components/layout/app-sidebar";
import { Badge } from "@components/ui/badge";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Switch } from "@components/ui/switch";
import { getOrgPlanLimits } from "@lib/plan-limits.server";
import { requireOrgBySlug } from "@lib/session.server";
import { type PrivacySettings, parsePrivacySettings } from "@routes/api+/privacy-settings";
import { eq } from "drizzle-orm";
import { EyeOff, Lock, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getDb } from "@/db";
import { organization } from "@/db/schema";
import type { Route } from "./+types/privacy";

export function meta() {
  return [{ title: "Privacy & Access — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [org, planLimits] = await Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId) }),
    getOrgPlanLimits(organizationId),
  ]);

  return {
    ...parsePrivacySettings(org?.metadata ?? null),
    canGuestPost: planLimits.guestPosting,
    canMaskIdentities: planLimits.boards === -1,
  };
}

// ─── Setting card ─────────────────────────────────────────────────────────────

interface SettingCardProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  lockedPlan?: string;
}

function SettingCard({
  id,
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  lockedPlan,
}: SettingCardProps) {
  const locked = !!lockedPlan && disabled;

  return (
    <section
      className={`rounded-xl border bg-card p-5 transition-opacity ${locked ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-3 min-w-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <label
                htmlFor={id}
                className={`text-sm font-medium leading-none ${locked ? "text-muted-foreground" : "cursor-pointer"}`}
              >
                {label}
              </label>
              {lockedPlan && (
                <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
                  <Lock className="h-2.5 w-2.5" />
                  {lockedPlan}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            {locked && (
              <p className="mt-2 text-xs text-primary font-medium">
                Upgrade to {lockedPlan} to unlock this setting.
              </p>
            )}
          </div>
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="shrink-0 mt-0.5"
        />
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacySettings({ loaderData }: Route.ComponentProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    allowGuestSubmissions: loaderData.allowGuestSubmissions,
    moderateSubmissions: loaderData.moderateSubmissions,
    maskPublicIdentities: loaderData.maskPublicIdentities,
  });
  const [saving, setSaving] = useState(false);

  async function update(patch: Partial<PrivacySettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const res = await fetch("/api/privacy-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      setSettings(settings);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Privacy & Access</span>
        </header>

        <main className="p-6 max-w-2xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Privacy & Access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Control who can submit feedback and what's visible on your public pages.
            </p>
          </div>

          <SettingCard
            id="allowGuestSubmissions"
            icon={<Users className="h-4 w-4" />}
            label="Allow Guest Submissions"
            description="Let visitors submit feedback and vote without creating an account. Useful for public-facing products where friction matters."
            checked={settings.allowGuestSubmissions}
            onCheckedChange={(v) => update({ allowGuestSubmissions: v })}
            disabled={saving || !loaderData.canGuestPost}
            lockedPlan={!loaderData.canGuestPost ? "Starter" : undefined}
          />

          <SettingCard
            id="moderateSubmissions"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Moderate Submissions"
            description="New submissions are held for review before appearing publicly. Use this to filter spam or off-topic feedback before it reaches your board."
            checked={settings.moderateSubmissions}
            onCheckedChange={(v) => update({ moderateSubmissions: v })}
            disabled={saving}
          />

          <SettingCard
            id="maskPublicIdentities"
            icon={<EyeOff className="h-4 w-4" />}
            label="Mask Public Identities"
            description="Hide member names and avatars on public-facing pages. Your team still sees full identities inside the dashboard."
            checked={settings.maskPublicIdentities}
            onCheckedChange={(v) => update({ maskPublicIdentities: v })}
            disabled={saving || !loaderData.canMaskIdentities}
            lockedPlan={!loaderData.canMaskIdentities ? "Professional" : undefined}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
