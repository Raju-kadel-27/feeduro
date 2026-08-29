import { PageTransition } from "@components/page-transition";
import { createI18nInstance, detectLocale } from "@lib/i18n";
import { AppConfigProvider } from "@providers/app-config-provider";
import { TawkProvider } from "@providers/tawk-provider";
import { ThemeProvider } from "@providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getEnv } from "@utils/get-env";
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
} from "react-router";
import { Toaster } from "sonner";

import type { Route } from "./+types/root";
import "./styles/app.css";
import "./styles/sidebar.css";

export async function loader({ request }: Route.LoaderArgs) {
  const env = getEnv();
  const locale = detectLocale(request);
  return data({
    locale,
    appConfig: {
      baseUrl: env.BASE_URL,
      environment: env.ENVIRONMENT,
      tawk: env.TAWK_PROPERTY_ID
        ? { propertyId: env.TAWK_PROPERTY_ID, widgetId: env.TAWK_WIDGET_ID ?? "default" }
        : null,
    },
  });
}

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    type: "image/png",
    href: "https://res.cloudinary.com/dlimsxfkf/image/upload/v1787991786/hat_icon_1_bu11be.png",
  },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Roboto:wght@100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 3, refetchOnWindowFocus: false } },
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
        <body className="flex w-full h-screen overflow-hidden">
          <ThemeProvider defaultTheme="system" storageKey="feeduro-theme">
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </ThemeProvider>
          <Toaster richColors position="top-right" />
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { locale, appConfig } = loaderData;
  const [i18nInstance] = useState(() => createI18nInstance(locale));

  useEffect(() => {
    if (i18nInstance.language !== locale) {
      i18nInstance.changeLanguage(locale);
    }
  }, [locale, i18nInstance]);

  return (
    <AppConfigProvider config={appConfig}>
      <TawkProvider>
        <I18nextProvider i18n={i18nInstance} defaultNS="translation">
          <Outlet />
        </I18nextProvider>
      </TawkProvider>
    </AppConfigProvider>
  );
}

export function HydrateFallback() {
  return null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
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
