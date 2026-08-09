import { useCallback, useEffect, useRef } from "react";

export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const stableCallback = useCallback(() => onLoadMoreRef.current(), []);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) stableCallback(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, stableCallback]);

  return sentinelRef;
}
