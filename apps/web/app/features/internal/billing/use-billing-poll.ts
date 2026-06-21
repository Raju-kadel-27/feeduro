import { useCallback, useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";

export function useBillingPoll({
  subState,
  fetcherState,
}: {
  subState: string;
  fetcherState: string;
}) {
  const { revalidate, state } = useRevalidator();
  const pollCountRef = useRef(0);
  const initialStateRef = useRef<string | null>(null);
  const prevFetcherState = useRef(fetcherState);
  const [polling, setPolling] = useState(false);

  const startPoll = useCallback(() => {
    pollCountRef.current = 0;
    initialStateRef.current = null;
    setPolling(true);
  }, []);

  // Same-page mutations (change-plan, cancel, resume): revalidate immediately
  // and kick off a fresh poll cycle.
  useEffect(() => {
    if (prevFetcherState.current !== "idle" && fetcherState === "idle") {
      revalidate();
      startPoll();
    }
    prevFetcherState.current = fetcherState;
  }, [fetcherState, revalidate, startPoll]);

  // Fallback poll — 25 retries × 2s = 50s max, stops when subState changes.
  useEffect(() => {
    if (!polling) return;
    if (initialStateRef.current === null) initialStateRef.current = subState;
    if (subState !== initialStateRef.current) {
      setPolling(false);
      return;
    }
    if (state === "loading") return;
    if (pollCountRef.current >= 25) {
      setPolling(false);
      return;
    }
    pollCountRef.current++;
    const id = setTimeout(revalidate, 2000);
    return () => clearTimeout(id);
  }, [polling, state, revalidate, subState]);

  return { startPoll };
}
