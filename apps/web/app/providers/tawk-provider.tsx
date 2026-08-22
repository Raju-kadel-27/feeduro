import { useAppConfig } from "@providers/app-config-provider";
import { useEffect } from "react";

export function TawkProvider({ children }: { children: React.ReactNode }) {
  const { tawk } = useAppConfig();

  useEffect(() => {
    if (!tawk) return;
    // Guard against React Strict Mode's double-invoke and HMR re-runs — both
    // would otherwise inject a second script tag and boot the widget twice.
    if (document.querySelector('script[src*="embed.tawk.to"]')) return;

    // Initialize the pre-load API object so that any identify() calls made
    // before the script finishes loading are queued and replayed on init.
    window.Tawk_API ??= {} as TawkAPI;
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.src = `https://embed.tawk.to/${tawk.propertyId}/${tawk.widgetId}`;
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.head.appendChild(script);

    // No cleanup: removing the script element after the widget has booted
    // leaves the DOM in a broken state. The widget is session-persistent.
  }, [tawk]);

  return <>{children}</>;
}
