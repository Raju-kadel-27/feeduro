import { PageHeader } from "@components/common/page-header";
import { Badge } from "@components/ui/badge";
import { Switch } from "@components/ui/switch";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { eq } from "drizzle-orm";
import { EyeOff, Shield, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import {
  type PrivacySettings,
  parsePrivacySettings,
} from "../../api+/_workspace+/privacy-settings";
import type { Route } from "./+types/privacy";

export function meta() {
  return [{ title: "Board Access Controls — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [org, planLimits] = await Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId) }),
    getOrgPlanLimits(db, organizationId),
  ]);

  return {
    ...parsePrivacySettings(org?.metadata ?? null),
    canGuestPost: planLimits.guestPosting,
    canMaskIdentities: planLimits.boards === -1,
  };
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface SettingRowProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  lockedPlan?: string;
  saving?: boolean;
  saved?: boolean;
}

function SettingRow({
  id,
  icon,
  label,
  description,
  hint,
  checked,
  onCheckedChange,
  disabled,
  lockedPlan,
  saving,
  saved,
}: SettingRowProps) {
  const locked = !!lockedPlan && disabled;

  return (
    <div className={`flex items-start gap-3.5 px-5 py-4 relative ${locked ? "opacity-60" : ""}`}>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <label
            htmlFor={id}
            className={`text-sm font-medium leading-none ${locked ? "cursor-default" : "cursor-pointer"}`}
          >
            {label}
          </label>
          {lockedPlan && (
            <Badge
              variant="secondary"
              className="text-[10px] font-semibold tracking-wide"
              aria-label={`Requires ${lockedPlan} plan`}
            >
              {lockedPlan}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground/60 italic">{hint}</p>}
        {locked && (
          <a href="./billing" className="mt-2 block text-xs font-semibold text-primary hover:underline w-fit">
            Upgrade to {lockedPlan} →
          </a>
        )}
      </div>
      {saved && (
        <span className="absolute right-14 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 animate-in fade-in duration-150 pointer-events-none">
          Saved ✓
        </span>
      )}
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || saving}
        title={lockedPlan ? `Requires ${lockedPlan} plan` : undefined}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}

// ─── SettingGroup ─────────────────────────────────────────────────────────────

interface SettingGroupProps {
  sectionLabel: string;
  children: React.ReactNode;
}

function SettingGroup({ sectionLabel, children }: SettingGroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
        {sectionLabel}
      </p>
      <div className="rounded-xl border bg-card divide-y">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacySettings({ loaderData }: Route.ComponentProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    allowGuestSubmissions: loaderData.allowGuestSubmissions,
    moderateSubmissions: loaderData.moderateSubmissions,
    maskPublicIdentities: loaderData.maskPublicIdentities,
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  async function update(key: keyof PrivacySettings, value: boolean) {
    const prev = settings;
    setSettings((s) => ({ ...s, [key]: value }));
    setSavingId(key);
    try {
      const res = await fetch("/api/privacy-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, [key]: value }),
      });
      if (!res.ok) throw new Error();
      setSavedId(key);
      toast.success("Settings saved");
      setTimeout(() => setSavedId((cur) => (cur === key ? null : cur)), 1800);
    } catch {
      setSettings(prev);
      toast.error("Failed to save settings");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
        <PageHeader
          title="Board Access Controls"
          description="Control how visitors interact with your public feedback boards."
          icon={Shield}
        />

        <SettingGroup sectionLabel="Submission Access">
          <SettingRow
            id="allowGuestSubmissions"
            icon={<Users className="h-4 w-4" />}
            label="Allow Guest Submissions"
            description="Let visitors submit feedback and vote without creating an account."
            hint={`When on: visitors see a "Submit as guest" option — no sign-up required.`}
            checked={settings.allowGuestSubmissions}
            onCheckedChange={(v) => update("allowGuestSubmissions", v)}
            disabled={!loaderData.canGuestPost}
            lockedPlan={!loaderData.canGuestPost ? "Starter" : undefined}
            saving={savingId === "allowGuestSubmissions"}
            saved={savedId === "allowGuestSubmissions"}
          />
          <SettingRow
            id="moderateSubmissions"
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Moderate Submissions"
            description="New submissions are held for review before appearing publicly."
            hint="When on: new posts enter a private queue — invisible until you approve them."
            checked={settings.moderateSubmissions}
            onCheckedChange={(v) => update("moderateSubmissions", v)}
            saving={savingId === "moderateSubmissions"}
            saved={savedId === "moderateSubmissions"}
          />
        </SettingGroup>

        <SettingGroup sectionLabel="Public Visibility">
          <SettingRow
            id="maskPublicIdentities"
            icon={<EyeOff className="h-4 w-4" />}
            label="Mask Public Identities"
            description="Hide member names and avatars on public-facing pages."
            hint={`When on: public boards show "Team member" instead of real names and photos.`}
            checked={settings.maskPublicIdentities}
            onCheckedChange={(v) => update("maskPublicIdentities", v)}
            disabled={!loaderData.canMaskIdentities}
            lockedPlan={!loaderData.canMaskIdentities ? "Professional" : undefined}
            saving={savingId === "maskPublicIdentities"}
            saved={savedId === "maskPublicIdentities"}
          />
        </SettingGroup>
      </main>
    </>
  );
}
