import type { PlanLimits } from "@features/internal/billing/server/plan-limits";
import {
  AppWindow,
  Building2,
  Code,
  CreditCard,
  Database,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutDashboard,
  LayoutPanelLeft,
  Lock,
  MessageSquare,
  Palette,
  Puzzle,
  ScrollText,
  Shield,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Users2,
  Webhook,
} from "lucide-react";
import type { ElementType } from "react";

export type SettingsItem = { title: string; url: string; icon: ElementType; locked?: boolean };
export type SettingsSection = { label: string; items: SettingsItem[] };

export function makeSettingsSections(
  base: string,
  planLimits?: PlanLimits | null,
): SettingsSection[] {
  const isLocked = (feature: keyof PlanLimits): boolean => {
    if (!planLimits) return false;
    const v = planLimits[feature];
    return v === false || v === 0;
  };

  return [
    {
      label: "General",
      items: [
        { title: "Workspace", url: `${base}/settings/workspace`, icon: Building2 },
        { title: "Branding", url: `${base}/settings/branding`, icon: Palette, locked: isLocked("hidePoweredBy") },
        { title: "Domain", url: `${base}/settings/domain`, icon: Globe, locked: isLocked("customDomain") },
      ],
    },
    {
      label: "People",
      items: [
        { title: "Team", url: `${base}/settings/team`, icon: Users, locked: isLocked("team") },
        { title: "Roles", url: `${base}/settings/roles`, icon: UserCog, locked: isLocked("customRoles") },
      ],
    },
    {
      label: "Product",
      items: [
        { title: "Feedback", url: `${base}/settings/feedback`, icon: MessageSquare },
        { title: "Changelog", url: `${base}/settings/changelog`, icon: FileText },
        { title: "Segments", url: `${base}/settings/segments`, icon: Users2, locked: isLocked("segments") },
        { title: "Views", url: `${base}/settings/views`, icon: LayoutDashboard },
        { title: "Widget", url: `${base}/settings/widget`, icon: LayoutPanelLeft },
      ],
    },
    {
      label: "Security",
      items: [
        { title: "Privacy & Access", url: `${base}/settings/privacy`, icon: Shield },
        { title: "Login & SSO", url: `${base}/settings/sso`, icon: KeyRound, locked: isLocked("sso") },
        { title: "Two-Factor Auth", url: `${base}/settings/two-factor`, icon: Smartphone },
        { title: "Passkeys", url: `${base}/settings/passkeys`, icon: Fingerprint },
        { title: "Password", url: `${base}/settings/password`, icon: Lock },
        { title: "Audit Log", url: `${base}/settings/audit-log`, icon: ScrollText, locked: isLocked("auditLog") },
      ],
    },
    {
      label: "Developer",
      items: [
        { title: "Integrations", url: `${base}/settings/integrations`, icon: Puzzle, locked: isLocked("integrations") },
        { title: "Webhooks", url: `${base}/settings/webhooks`, icon: Webhook, locked: isLocked("webhooks") },
        { title: "API Tokens", url: `${base}/settings/api-tokens`, icon: Code },
        { title: "OAuth Apps", url: `${base}/settings/oauth-clients`, icon: AppWindow },
      ],
    },
    {
      label: "Billing",
      items: [
        { title: "Billing & Plans", url: `${base}/settings/billing`, icon: CreditCard },
        { title: "Data & Import", url: `${base}/settings/data`, icon: Database },
      ],
    },
  ];
}
