import { useEffect } from "react";
import { useFetcher } from "react-router";

export type Voter = {
  name: string | null;
  email: string;
  plan: string | null;
  role: string | null;
  industry: string | null;
  location: string | null;
  mrr: number | null;
  votedAt: string;
  companyId: string | null;
  companyName: string | null;
  companyMrr: number | null;
};

export function useVoterData(postId: string, enabled = true) {
  const fetcher = useFetcher<{ voters: Voter[] }>();

  useEffect(() => {
    if (enabled) fetcher.load(`/api/post-voters?postId=${postId}`);
  }, [postId, enabled]);

  return {
    voters: (fetcher.data?.voters ?? []) as Voter[],
    isLoading: enabled && (fetcher.state === "loading" || !fetcher.data),
  };
}
