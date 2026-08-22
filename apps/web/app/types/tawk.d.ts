// Ambient declarations for tawk.to's global JavaScript API.
// Set before the embed script loads to pre-configure visitor identity.
// https://developer.tawk.to/jsapi/
interface TawkVisitor {
  name?: string;
  email?: string;
}

interface TawkAPI {
  // Pre-load config — readable/writable before the script executes.
  visitor?: TawkVisitor;
  onLoad?: () => void;
  onStatusChange?: (status: "online" | "away" | "offline") => void;
  // Post-load API — only available after the embed script has fully initialised.
  // Typed as optional so `typeof api.setAttributes === "function"` properly
  // narrows the type rather than being a no-op check against a "required" field.
  setAttributes?: (
    attributes: Record<string, string | number>,
    callback?: (error: unknown) => void,
  ) => void;
  hideWidget?: () => void;
  showWidget?: () => void;
  toggle?: () => void;
  maximize?: () => void;
  minimize?: () => void;
  getStatus?: () => "online" | "away" | "offline";
  isChatHidden?: () => boolean;
  isChatMinimized?: () => boolean;
  isChatOngoing?: () => boolean;
}

interface Window {
  Tawk_API?: TawkAPI;
  // Must be set before the embed script runs — tawk uses it to calculate
  // how long the page was viewed before the widget finished loading.
  Tawk_LoadStart?: Date;
}
