import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./styles/app.css";
import "./styles/sidebar.css";
import { ThemeProvider } from "@components/providers/theme-provider";
import { createI18nInstance, detectLocale } from "@lib/i18n";
import { Toaster } from "sonner";

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const locale = detectLocale(request);
  return data({ locale });
}

// ─── Links ────────────────────────────────────────────────────────────────────

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// ─── Document shell (no router hooks allowed here) ────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body className="flex w-full overflow-hidden h-screen">
          <ThemeProvider defaultTheme="system" storageKey="feediyo-theme">
            <div className="flex-1 overflow-y-auto">{children}</div>
          </ThemeProvider>
          <Toaster richColors position="top-right" />
          <ScrollRestoration />
          <Scripts />
          <ReactQueryDevtools initialIsOpen={false} />
        </body>
      </html>
    </QueryClientProvider>
  );
}

// ─── App root (has access to loader data + router context) ────────────────────

export default function App() {
  const { locale } = useLoaderData<typeof loader>();

  // Create once per mount (SSR: fresh per request; client: stable singleton)
  const [i18nInstance] = useState(() => createI18nInstance(locale));

  // Keep language in sync when the locale changes (e.g. user switches language
  // and React Router re-runs the root loader without a full page reload)
  useEffect(() => {
    if (i18nInstance.language !== locale) {
      i18nInstance.changeLanguage(locale);
    }
  }, [locale, i18nInstance]);

  return (
    <I18nextProvider i18n={i18nInstance} defaultNS="translation">
      <Outlet />
    </I18nextProvider>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
