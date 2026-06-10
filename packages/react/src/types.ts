export type Position = "left" | "right";
export type Theme = "light" | "dark" | "auto";

export interface IdentifyPayload {
  id: string;
  email?: string;
  name?: string;
  /** HMAC-SHA256 signature generated server-side for verified identity. */
  signature?: string;
  /**
   * Opaque token from `createFeeduroAuth()` on your server.
   * When present, `createAutoLoginUrl()` embeds it so the user lands
   * on the public board already signed in.
   */
  clientToken?: string;
}

export interface FeeduroContextValue {
  identify(user: IdentifyPayload | null): void;
  showWidget(): void;
  hideWidget(): void;
  setTheme(theme: Theme): void;
  /**
   * Wraps a public board URL with the current user's clientToken so they land
   * already signed in. Falls back to the original href if no token is present.
   *
   * @example
   * const { createAutoLoginUrl } = useFeeduro();
   * <a href={createAutoLoginUrl("https://feedback.acme.com")}>View roadmap</a>
   */
  createAutoLoginUrl(href: string): string;
}

/** Shape of window.feeduro after the SDK script loads. */
export interface FeeduroSDK {
  init(token: string, options?: { position?: Position; theme?: Theme; baseUrl?: string }): void;
  identify(user: IdentifyPayload | null): void;
  embed(token: string, target: string | Element, options?: { theme?: Theme }): void;
  showWidget(): void;
  hideWidget(): void;
  setTheme(theme: Theme): void;
  destroy(): void;
}

declare global {
  interface Window {
    feeduro: FeeduroSDK;
    $fdyq: [string, ...unknown[]][];
  }
}
