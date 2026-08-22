import { createContext, useContext } from "react";

import type { TawkConfig } from "~/types/tawk";

export type { TawkConfig };

export type AppConfig = {
  baseUrl: string;
  environment: "development" | "staging" | "production";
  tawk: TawkConfig | null;
};

const AppConfigContext = createContext<AppConfig | null>(null);

export function AppConfigProvider({
  config,
  children,
}: {
  config: AppConfig;
  children: React.ReactNode;
}) {
  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfig {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
}
