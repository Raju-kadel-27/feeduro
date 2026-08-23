import type { PortalOutletContext } from "@features/feedback/components/public/portal-layout";
import { PostDetailPage } from "@features/feedback/components/public/post-detail-page";
import { useOutletContext, useParams } from "react-router";

export default function PublicPostDetailRoute() {
  const { postId } = useParams<{ postId: string }>();
  const context = useOutletContext<PortalOutletContext>();
  return <PostDetailPage postId={postId ?? ""} context={context} />;
}
