import { NavLink, useFetcher } from "react-router";
import type { ActiveEnv } from "@lib/env-override.server";

const NAV = [
  { to: "/", label: "Widget", sub: "Floating button SDK", icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { to: "/board", label: "Board Embed", sub: "Inline iframe widget", icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> },
  { to: "/webhooks", label: "Webhooks", sub: "Live event receiver", icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> },
  { to: "/changelog", label: "Changelog", sub: "API CRUD + webhook", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></> },
  { to: "/api-demo", label: "API", sub: "REST playground + log", icon: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></> },
  { to: "/smoke-tests", label: "Smoke Tests", sub: "Pre-deploy health checks", icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
] as const;

const ENV_LABELS: Record<ActiveEnv, string> = { local: "Local", staging: "Staging", prod: "Prod" };

interface Props { activeEnv: ActiveEnv; hasStaging: boolean; hasProd: boolean }

export function SidebarNav({ activeEnv, hasStaging, hasProd }: Props) {
  const fetcher = useFetcher();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <svg viewBox="0 0 24 24" fill="white" className="size-4">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">Feeduro Demo</p>
          <p className="text-xs text-gray-400">Integration tester</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">Features</p>
        <ul className="space-y-px">
          {NAV.map(({ to, label, sub, icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === "/"} className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`
              }>
                {({ isActive }) => (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`size-4 shrink-0 ${isActive ? "text-indigo-500" : "text-gray-400"}`}>{icon}</svg>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium leading-none ${isActive ? "text-indigo-700" : "text-gray-700"}`}>{label}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{sub}</p>
                    </div>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 px-3 py-3 space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-gray-400">Environment</p>
        <fetcher.Form method="post" action="/api/set-env">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {(["local", "staging", "prod"] as ActiveEnv[]).map(env => {
              const disabled = (env === "staging" && !hasStaging) || (env === "prod" && !hasProd);
              return (
                <button key={env} type="submit" name="env" value={env} disabled={disabled}
                  className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${activeEnv === env ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  title={disabled ? `Set ${env === "staging" ? "FEEDURO_STAGING_API_URL" : "FEEDURO_PROD_API_URL"} to enable` : undefined}
                >
                  {ENV_LABELS[env]}
                </button>
              );
            })}
          </div>
        </fetcher.Form>
        <div className="flex items-center gap-2 px-1">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate text-xs text-gray-500">{activeEnv} · port 3001</span>
        </div>
      </div>
    </aside>
  );
}
