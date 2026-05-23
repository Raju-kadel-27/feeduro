import {
  Code,
  CreditCard,
  Database,
  FileText,
  Fingerprint,
  Globe,
  KeyRound,
  LayoutPanelLeft,
  Lock,
  MessageSquare,
  Palette,
  Puzzle,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Users2,
  Webhook,
} from "lucide-react";
import type { ElementType } from "react";

type SettingsItem = { title: string; url: string; icon: ElementType };
export type SettingsSection = { label: string; items: SettingsItem[] };

export function makeSettingsSections(base: string): SettingsSection[] {
  return [
    {
      label: "General",
      items: [
        { title: "Workspace", url: `${base}/settings/workspace`, icon: Settings },
        { title: "Branding", url: `${base}/settings/branding`, icon: Palette },
        { title: "Domain", url: `${base}/settings/domain`, icon: Globe },
      ],
    },
    {
      label: "People",
      items: [
        { title: "Team", url: `${base}/settings/team`, icon: Users },
        { title: "Roles & Permissions", url: `${base}/settings/roles`, icon: ShieldCheck },
      ],
    },
    {
      label: "Product",
      items: [
        { title: "Feedback", url: `${base}/settings/feedback`, icon: MessageSquare },
        { title: "Changelog", url: `${base}/settings/changelog`, icon: FileText },
        { title: "Segments", url: `${base}/settings/segments`, icon: Users2 },
        { title: "Widget", url: `${base}/settings/widget`, icon: LayoutPanelLeft },
      ],
    },
    {
      label: "Security",
      items: [
        { title: "Privacy & Access", url: `${base}/settings/privacy`, icon: Shield },
        { title: "Login & SSO", url: `${base}/settings/sso`, icon: KeyRound },
        { title: "Two-Factor Auth", url: `${base}/settings/two-factor`, icon: ShieldCheck },
        { title: "Passkeys", url: `${base}/settings/passkeys`, icon: Fingerprint },
        { title: "Password", url: `${base}/settings/password`, icon: Lock },
      ],
    },
    {
      label: "Developer",
      items: [
        { title: "Integrations", url: `${base}/settings/integrations`, icon: Puzzle },
        { title: "Webhooks", url: `${base}/settings/webhooks`, icon: Webhook },
        { title: "API Tokens", url: `${base}/settings/api-tokens`, icon: Code },
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
