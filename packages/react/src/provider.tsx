import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import type { FeeduroContextValue, IdentifyPayload, Position, Theme } from "./types";

const SCRIPT_ID = "fdy-sdk";

// ─── Internal helpers ────────────────────────────────────────────────────────

function setupQueue() {
  window.$fdyq = window.$fdyq || [];
  window.feeduro =
    window.feeduro ||
    // Proxy queues calls made before the SDK script loads
    (new Proxy({} as Window["feeduro"], {
      get: (_, method: string) =>
        (...args: unknown[]) =>
          window.$fdyq.push([method, ...args]),
    }) as Window["feeduro"]);
}

function injectScript(src: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = Object.assign(document.createElement("script"), {
    id: SCRIPT_ID,
    src,
    async: true,
  });
  document.head.appendChild(s);
}

function removeScript() {
  document.getElementById(SCRIPT_ID)?.remove();
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const FeeduroContext = createContext<FeeduroContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export interface FeeduroProviderProps {
  /** Widget token from your Feeduro settings. */
  token: string;
  position?: Position;
  theme?: Theme;
  /**
   * Logged-in user to auto-identify. Include `signature` + `clientToken`
   * from `createFeeduroAuth()` for verified identity and auto-login links.
   * Pass `null` on logout. Omit entirely for anonymous-only use.
   */
  user?: IdentifyPayload | null;
  /**
   * Base URL of the Feeduro server. Defaults to `https://feeduro.com`.
   * Override in development to point at your local dev server or ngrok tunnel.
   */
  baseUrl?: string;
  children: ReactNode;
}

export function FeeduroProvider({
  token,
  position = "right",
  theme = "auto",
  user,
  baseUrl = "https://feeduro.com",
  children,
}: FeeduroProviderProps) {
  // Stable ref — lets createAutoLoginUrl read the latest token without
  // needing to recreate the context value object.
  const clientTokenRef = useRef<string | null>(null);

  // Context value is created once and never recreated. All methods are
  // stable function references that read from refs at call time.
  const valueRef = useRef<FeeduroContextValue | null>(null);
  if (!valueRef.current) {
    valueRef.current = {
      identify: (u) => {
        clientTokenRef.current = u?.clientToken ?? null;
        window.feeduro?.identify(u);
      },
      showWidget: () => window.feeduro?.showWidget(),
      hideWidget: () => window.feeduro?.hideWidget(),
      setTheme: (t) => window.feeduro?.setTheme(t),
      createAutoLoginUrl: (href) => {
        const t = clientTokenRef.current;
        if (!t) return href;
        try {
          const url = new URL(href);
          url.searchParams.set("_fdy", t);
          return url.toString();
        } catch {
          return href;
        }
      },
    };
  }

  // Init + load SDK on mount; tear down on unmount.
  useEffect(() => {
    setupQueue();
    window.feeduro.init(token, { position, theme, baseUrl });
    injectScript(`${baseUrl}/sdk/v1/fdy.js`);
    return () => {
      window.feeduro?.destroy?.();
      removeScript();
    };
  }, [token, position, theme, baseUrl]);

  // Keep identity in sync with the user prop.
  // Deliberately skipped when `user` is omitted (undefined = anonymous mode).
  useEffect(() => {
    if (user === undefined) return;
    clientTokenRef.current = user?.clientToken ?? null;
    window.feeduro?.identify(user);
  }, [user]);

  return (
    <FeeduroContext.Provider value={valueRef.current}>
      {children}
    </FeeduroContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFeeduro(): FeeduroContextValue {
  const ctx = useContext(FeeduroContext);
  if (!ctx) throw new Error("useFeeduro must be called inside <FeeduroProvider>.");
  return ctx;
}
