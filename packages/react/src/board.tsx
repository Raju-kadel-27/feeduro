import { type CSSProperties, useEffect, useRef } from "react";
import type { IdentifyPayload, Theme } from "./types";

export interface FeeduroBoardProps {
  /** Org-level widget token from your Feeduro settings. */
  token: string;
  /**
   * Slug of the board to display (visible in the board URL).
   * Omit to show the default board configured in your Feeduro settings.
   */
  boardSlug?: string;
  theme?: Theme;
  /**
   * Identified user — include `signature` for verified identity.
   * Pass `null` to clear identity (logout). Omit for anonymous use.
   */
  user?: Pick<IdentifyPayload, "id" | "email" | "name" | "signature"> | null;
  /**
   * Base URL of the Feeduro server. Defaults to `https://feeduro.com`.
   * Override in development to point at your local dev server or ngrok tunnel.
   */
  baseUrl?: string;
  className?: string;
  style?: CSSProperties;
}

export function FeeduroBoard({
  token,
  boardSlug,
  theme = "auto",
  user,
  baseUrl = "https://feeduro.com",
  className,
  style,
}: FeeduroBoardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Lock the src to initial values — changes go via postMessage, not src reload.
  const initialThemeRef = useRef(theme);
  const initialBoardSlugRef = useRef(boardSlug);

  // Send identity whenever user changes or iframe (re)loads.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendIdentity() {
      iframe!.contentWindow?.postMessage({ type: "fdy:identify", data: user ?? null }, baseUrl);
    }

    sendIdentity();
    iframe.addEventListener("load", sendIdentity);
    return () => iframe.removeEventListener("load", sendIdentity);
  }, [user, baseUrl]);

  // Push theme changes via postMessage so the iframe doesn't reload.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "fdy:setTheme", theme }, baseUrl);
  }, [theme, baseUrl]);

  const boardParam = initialBoardSlugRef.current
    ? `&board=${encodeURIComponent(initialBoardSlugRef.current)}`
    : "";

  return (
    <iframe
      ref={iframeRef}
      src={`${baseUrl}/widget/${token}?mode=inline&theme=${encodeURIComponent(initialThemeRef.current)}${boardParam}`}
      title="Feedback"
      loading="lazy"
      allow="clipboard-write"
      className={className}
      style={{ border: "none", display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
