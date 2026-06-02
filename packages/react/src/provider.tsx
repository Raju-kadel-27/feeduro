import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import type { FeediyoContextValue, IdentifyPayload, Position, Theme } from "./types";

const CDN_URL = "https://feediyo.com/sdk/v1/fdy.js";
const SCRIPT_ID = "fdy-sdk";

// ─── Internal helpers ────────────────────────────────────────────────────────

function setupQueue() {
  window.$fdyq = window.$fdyq || [];
  window.feediyo =
    window.feediyo ||
    // Proxy queues calls made before the SDK script loads
    (new Proxy({} as Window["feediyo"], {
      get: (_, method: string) =>
        (...args: unknown[]) =>
          window.$fdyq.push([method, ...args]),
    }) as Window["feediyo"]);
}

function injectScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = Object.assign(document.createElement("script"), {
    id: SCRIPT_ID,
    src: CDN_URL,
    async: true,
  });
  document.head.appendChild(s);
}

function removeScript() {
  document.getElementById(SCRIPT_ID)?.remove();
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const FeediyoContext = createContext<FeediyoContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export interface FeediyoProviderProps {
  /** Widget token from your Feediyo settings. */
  token: string;
  position?: Position;
  theme?: Theme;
  /**
   * Logged-in user to auto-identify. Include `signature` + `clientToken`
   * from `createFeediyoAuth()` for verified identity and auto-login links.
   * Pass `null` on logout. Omit entirely for anonymous-only use.
   */
  user?: IdentifyPayload | null;
  children: ReactNode;
}

export function FeediyoProvider({
  token,
  position = "right",
  theme = "auto",
  user,
  children,
}: FeediyoProviderProps) {
  // Stable ref — lets createAutoLoginUrl read the latest token without
  // needing to recreate the context value object.
  const clientTokenRef = useRef<string | null>(null);

  // Context value is created once and never recreated. All methods are
  // stable function references that read from refs at call time.
  const valueRef = useRef<FeediyoContextValue | null>(null);
  if (!valueRef.current) {
    valueRef.current = {
      identify: (u) => {
        clientTokenRef.current = u?.clientToken ?? null;
        window.feediyo?.identify(u);
      },
      showWidget: () => window.feediyo?.showWidget(),
      hideWidget: () => window.feediyo?.hideWidget(),
      setTheme: (t) => window.feediyo?.setTheme(t),
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
    window.feediyo.init(token, { position, theme });
    injectScript();
    return () => {
      window.feediyo?.destroy?.();
      removeScript();
    };
  }, [token, position, theme]);

  // Keep identity in sync with the user prop.
  // Deliberately skipped when `user` is omitted (undefined = anonymous mode).
  useEffect(() => {
    if (user === undefined) return;
    clientTokenRef.current = user?.clientToken ?? null;
    window.feediyo?.identify(user);
  }, [user]);

  return (
    <FeediyoContext.Provider value={valueRef.current}>
      {children}
    </FeediyoContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFeediyo(): FeediyoContextValue {
  const ctx = useContext(FeediyoContext);
  if (!ctx) throw new Error("useFeediyo must be called inside <FeediyoProvider>.");
  return ctx;
}
