import { type CSSProperties, useEffect, useRef } from "react";
import type { IdentifyPayload, Theme } from "./types";

const WIDGET_ORIGIN = "https://feediyo.com";

export interface FeediyoBoardProps {
  /** Widget token for this board from your Feediyo settings. */
  token: string;
  theme?: Theme;
  /**
   * Identified user — include `signature` for verified identity.
   * Pass `null` to clear identity (logout). Omit for anonymous use.
   */
  user?: Pick<IdentifyPayload, "id" | "email" | "name" | "signature"> | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a Feediyo feedback board inline — no floating button, no SDK needed.
 * Give the component a defined height via `style` or `className`.
 *
 * @example
 * // Standalone (no provider needed)
 * <FeediyoBoard token="your-token" style={{ height: 600 }} />
 *
 * // With identity
 * <FeediyoBoard token="your-token" user={currentUser} style={{ height: 600 }} />
 *
 * // Multi-board tabs — developers control the tab UI themselves
 * const boards = { bugs: "tok-1", features: "tok-2" };
 * <FeediyoBoard token={boards[activeTab]} style={{ height: 600 }} />
 */
export function FeediyoBoard({ token, theme = "auto", user, className, style }: FeediyoBoardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send identity whenever user changes or iframe (re)loads.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendIdentity() {
      iframe!.contentWindow?.postMessage(
        { type: "fdy:identify", data: user ?? null },
        WIDGET_ORIGIN,
      );
    }

    // Try immediately (covers the case where iframe is already loaded),
    // then re-send on every subsequent load (covers navigation / reloads).
    sendIdentity();
    iframe.addEventListener("load", sendIdentity);
    return () => iframe.removeEventListener("load", sendIdentity);
  }, [user]);

  return (
    <iframe
      ref={iframeRef}
      src={`${WIDGET_ORIGIN}/widget/${token}?mode=inline&theme=${encodeURIComponent(theme)}`}
      title="Feedback"
      loading="lazy"
      allow="clipboard-write"
      className={className}
      style={{ border: "none", display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
