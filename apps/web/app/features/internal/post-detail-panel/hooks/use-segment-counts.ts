import { useEffect } from "react";
import { useFetcher } from "react-router";

type SegmentCountsData = {
  segmentCounts: Record<string, number>;
  otherCount: number;
  profiledCount: number;
};

export function useSegmentCounts(postId: string, enabled = true) {
  const fetcher = useFetcher<SegmentCountsData>();

  useEffect(() => {
    if (enabled) fetcher.load(`/api/post-segment-counts?postId=${postId}`);
  }, [postId, enabled]);

  return {
    segmentCounts: fetcher.data?.segmentCounts ?? {},
    otherCount: fetcher.data?.otherCount ?? 0,
    profiledCount: fetcher.data?.profiledCount ?? 0,
    isLoading: enabled && (fetcher.state === "loading" || !fetcher.data),
  };
}
