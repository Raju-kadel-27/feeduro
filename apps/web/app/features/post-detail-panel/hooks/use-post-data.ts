import {
  ActivitiesResponseSchema,
  CommentsResponseSchema,
  DetailDataSchema,
} from "@features/feedback/schemas/admin";
import { useQuery } from "@tanstack/react-query";

export function usePostData(postId: string) {
  const { data: detailData, isLoading } = useQuery({
    queryKey: ["post-detail", postId],
    queryFn: async () => {
      const res = await fetch(`/api/feedback?postId=${postId}`);
      const parsed = DetailDataSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Invalid response");
      return parsed.data;
    },
    enabled: !!postId,
  });

  const { data: commentsData } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?postId=${postId}`);
      const parsed = CommentsResponseSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Invalid comments");
      return parsed.data;
    },
    enabled: !!postId,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ["activities", postId],
    queryFn: async () => {
      const res = await fetch(`/api/activities?postId=${postId}`);
      const parsed = ActivitiesResponseSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Invalid activities");
      return parsed.data;
    },
    enabled: !!postId,
  });

  return {
    detailData,
    isLoading,
    comments: commentsData?.comments ?? [],
    activities: activitiesData?.activities ?? [],
  };
}
