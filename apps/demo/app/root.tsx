import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { FeeduroProvider } from "@feeduro/react";

import type { Route } from "./+types/root";
import { SidebarNav } from "./components/sidebar-nav";
import { getActiveApiUrl, getActiveEnv } from "./lib/env-override.server";
import { getEnv } from "./lib/env.server";
import "./app.css";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  return {
    widgetToken: env.FEEDURO_WIDGET_TOKEN,
    widgetBaseUrl: getActiveApiUrl(request, env),
    activeEnv: getActiveEnv(request),
    hasStaging: env.FEEDURO_STAGING_API_URL.length > 0,
    hasProd: env.FEEDURO_PROD_API_URL.length > 0,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <FeeduroProvider token={loaderData.widgetToken} baseUrl={loaderData.widgetBaseUrl}>
      <div className="flex h-screen overflow-hidden">
        <SidebarNav activeEnv={loaderData.activeEnv} hasStaging={loaderData.hasStaging} hasProd={loaderData.hasProd} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </FeeduroProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5 text-red-600" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="mb-1 text-base font-semibold text-gray-900">Configuration Error</h1>
        <p className="mb-4 text-sm text-gray-500">Check your <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.dev.vars</code> file.</p>
        <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-red-300">{message}</pre>
      </div>
    </div>
  );
}
