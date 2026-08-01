import { PageHeader } from "@components/common/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { LayoutPanelLeft } from "lucide-react";
import { useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import type { WidgetSettingsLoaderData } from "../../types";
import { SettingsConfigSection } from "./settings-config-section";
import { SettingsDangerSection } from "./settings-danger-section";
import { SettingsEmbedSection } from "./settings-embed-section";
import { SettingsIdentitySection } from "./settings-identity-section";
import { SettingsOriginsSection } from "./settings-origins-section";

export type { WidgetSettingsLoaderData };

type Props = { loaderData: WidgetSettingsLoaderData };

const TABS = ["general", "install", "security"] as const;
type Tab = (typeof TABS)[number];

function isTab(v: string | null): v is Tab {
  return TABS.includes(v as Tab);
}

export function WidgetSettingsPage({ loaderData }: Props) {
  const { config, boards } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: Tab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "general";

  const saveFetcher = useFetcher<{ ok: boolean }>();
  const toggleFetcher = useFetcher<{ ok: boolean }>();
  const regenFetcher = useFetcher<{ ok: boolean; newToken?: string }>();
  const secretFetcher = useFetcher<{ ok: boolean; newSecret?: string }>();
  const revealFetcher = useFetcher<{ ok: boolean; secret?: string }>();

  const [enabled, setEnabled] = useState(config.enabled);
  const [boardId, setBoardId] = useState(config.boardId ?? "");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(config.theme);
  const [inlineBoardId, setInlineBoardId] = useState(
    boards.find((b) => b.isDefault)?.id ?? boards[0]?.id ?? "",
  );
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmRotateSecret, setConfirmRotateSecret] = useState(false);
  const [isSecretVisible, setIsSecretVisible] = useState(false);

  // Use the latest regenerated token if available, otherwise the loaded one
  const orgToken = regenFetcher.data?.newToken ?? config.token;
  const currentSecret = revealFetcher.data?.secret ?? secretFetcher.data?.newSecret ?? "";

  function handleTabChange(tab: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

  function handleToggle(v: boolean) {
    setEnabled(v);
    const form = new FormData();
    form.set("intent", "toggle-enabled");
    form.set("enabled", String(v));
    toggleFetcher.submit(form, { method: "POST" });
  }

  function handleSave() {
    const form = new FormData();
    form.set("intent", "save");
    form.set("enabled", String(enabled));
    form.set("boardId", boardId);
    form.set("theme", theme);
    saveFetcher.submit(form, { method: "POST" });
  }

  function handleRegenerate() {
    if (!confirmRegen) { setConfirmRegen(true); return; }
    setConfirmRegen(false);
    const form = new FormData();
    form.set("intent", "regenerate");
    regenFetcher.submit(form, { method: "POST" });
  }

  function handleRotateSecret() {
    if (!confirmRotateSecret) { setConfirmRotateSecret(true); return; }
    setConfirmRotateSecret(false);
    setIsSecretVisible(true);
    const form = new FormData();
    form.set("intent", "rotate-secret");
    secretFetcher.submit(form, { method: "POST" });
  }

  function handleRevealSecret() {
    setIsSecretVisible(true);
    if (!currentSecret) {
      const form = new FormData();
      form.set("intent", "reveal-secret");
      revealFetcher.submit(form, { method: "POST" });
    }
  }

  return (
    <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
      <PageHeader
        title="Widget"
        icon={LayoutPanelLeft}
        description="Embed your feedback board directly into any page on your site."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <SettingsConfigSection
            enabled={enabled}
            onToggle={handleToggle}
            isTogglingEnabled={toggleFetcher.state !== "idle"}
            boards={boards}
            boardId={boardId}
            setBoardId={setBoardId}
            theme={theme}
            setTheme={setTheme}
            onSave={handleSave}
            isSaving={saveFetcher.state !== "idle"}
            savedOk={(saveFetcher.data as { ok?: boolean } | undefined)?.ok}
            hasError={(saveFetcher.data as { ok?: boolean } | undefined)?.ok === false}
          />
        </TabsContent>

        <TabsContent value="install" className="space-y-6 mt-6">
          <SettingsEmbedSection
            orgToken={orgToken}
            boards={boards}
            theme={theme}
            inlineBoardId={inlineBoardId}
            setInlineBoardId={setInlineBoardId}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <SettingsIdentitySection
            currentSecret={currentSecret}
            isSecretVisible={isSecretVisible}
            isRevealLoading={revealFetcher.state !== "idle"}
            isRotating={secretFetcher.state !== "idle"}
            confirmRotateSecret={confirmRotateSecret}
            setConfirmRotateSecret={setConfirmRotateSecret}
            onReveal={handleRevealSecret}
            onHide={() => setIsSecretVisible(false)}
            onRotateSecret={handleRotateSecret}
            theme={theme}
            orgToken={orgToken}
            boards={boards}
            inlineBoardId={inlineBoardId}
            setInlineBoardId={setInlineBoardId}
          />
          <SettingsOriginsSection initialAllowedOrigins={config.allowedOrigins} />
          <SettingsDangerSection
            confirmRegen={confirmRegen}
            setConfirmRegen={setConfirmRegen}
            onRegenerate={handleRegenerate}
            isRegenerating={regenFetcher.state !== "idle"}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
