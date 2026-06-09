import { useState } from "react";
import { data } from "react-router";
import { FeediyoBoard } from "@feediyo/react";

type Theme = "auto" | "light" | "dark";
const THEMES: Theme[] = ["auto", "light", "dark"];

import type { Route } from "./+types/board";
import { getActiveApiUrl } from "@lib/env-override.server";
import { getEnv } from "@lib/env.server";

const BOARD_TABS = [
  { key: "feature", label: "Feature Requests" },
  { key: "integrations", label: "Integrations" },
  { key: "bugs", label: "Bugs" },
] as const;

type BoardKey = (typeof BOARD_TABS)[number]["key"];

export function meta(): Route.MetaDescriptors {
  return [{ title: "Board Embed · Feediyo Demo" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  return data({
    baseUrl: getActiveApiUrl(request, env),
    tokens: {
      feature: env.FEEDIYO_WIDGET_TOKEN_FEATURE,
      integrations: env.FEEDIYO_WIDGET_TOKEN_INTEGRATIONS,
      bugs: env.FEEDIYO_WIDGET_TOKEN_BUGS,
    } satisfies Record<BoardKey, string>,
  });
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="p-8">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Failed to load board."}
      </div>
    </div>
  );
}

export default function BoardEmbed({ loaderData }: Route.ComponentProps) {
  const { tokens, baseUrl } = loaderData;
  const tabs = BOARD_TABS.filter((t) => tokens[t.key]);
  const [active, setActive] = useState<BoardKey>(tabs[0]?.key ?? "feature");
  const [theme, setTheme] = useState<Theme>("auto");

  if (!tabs.length) {
    return (
      <p className="p-8 text-sm text-gray-500">
        No boards configured. Set FEEDIYO_WIDGET_TOKEN in .dev.vars.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between border-b border-gray-200 mb-2">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={[
                "px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                active === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pr-1">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={[
                "px-2.5 py-1 text-xs rounded-md transition-colors capitalize",
                theme === t
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* All iframes stay mounted — switching tabs only toggles visibility, no reload */}
      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active}>
          <FeediyoBoard
            token={tokens[t.key]}
            baseUrl={baseUrl}
            theme={theme}
            style={{ height: 1200 }}
          />
        </div>
      ))}
    </div>
  );
}
