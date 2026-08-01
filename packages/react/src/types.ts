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

/** Shape of window.feeduro after the SDK script loads. */
export interface FeeduroSDK {
  embed(token: string, target: string | Element, options?: { theme?: Theme; boardSlug?: string }): void;
  identify(user: IdentifyPayload | null): void;
  setTheme(theme: Theme): void;
  destroy(): void;
}

declare global {
  interface Window {
    feeduro: FeeduroSDK;
    $fdyq: [string, ...unknown[]][];
  }
}
