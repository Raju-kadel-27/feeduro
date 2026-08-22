import { useCallback } from "react";

type TawkVisitorInfo = {
  name: string;
  email: string;
};

/**
 * Returns an `identify` callback that pre-fills the visitor's name and email
 * in the tawk.to widget. Covers three timing scenarios:
 *
 * 1. Script not yet loaded  → sets `Tawk_API.visitor` (tawk reads on init)
 *                             + chains `onLoad` as belt-and-suspenders in case
 *                             init already ran before this effect fired.
 * 2. Script loading/loaded  → calls `setAttributes` directly (widget API ready).
 * 3. tawk disabled (no env) → `Tawk_API` is never set, call is a no-op.
 */
export function useTawk() {
  const identify = useCallback(({ name, email }: TawkVisitorInfo) => {
    if (typeof window === "undefined" || !email) return;

    window.Tawk_API ??= {} as TawkAPI;
    const api = window.Tawk_API;

    if (typeof api.setAttributes === "function") {
      // Widget API is fully initialised — set immediately.
      api.setAttributes({ name, email }, () => {});
    } else {
      // Script hasn't finished executing yet.
      // Path A: visitor pre-config — tawk reads this object during init.
      api.visitor = { name, email };
      // Path B: onLoad hook — fires after the chat bubble renders, covers the
      // narrow race where tawk copied its init snapshot before Path A ran.
      const prev = api.onLoad;
      api.onLoad = () => {
        prev?.();
        api.setAttributes?.({ name, email }, () => {});
      };
    }
  }, []);

  return { identify };
}
