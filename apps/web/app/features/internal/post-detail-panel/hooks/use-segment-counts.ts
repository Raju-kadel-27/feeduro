import type { CompanyVoter } from "@features/internal/segmentation/types";
import { useEffect } from "react";
import { useFetcher } from "react-router";

type SegmentCountsData = {
  segmentCounts: Record<string, number>;
  otherCount: number;
  profiledCount: number;
  mrrBySegment: Record<string, number>;
  otherMrr: number;
  totalMrr: number;
  companies: CompanyVoter[];
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
    mrrBySegment: fetcher.data?.mrrBySegment ?? {},
    otherMrr: fetcher.data?.otherMrr ?? 0,
    totalMrr: fetcher.data?.totalMrr ?? 0,
    companies: fetcher.data?.companies ?? [],
    isLoading: enabled && (fetcher.state === "loading" || !fetcher.data),
  };
}
