import { AlertTriangle } from "lucide-react";
import type { UnrespondedPosts } from "../schemas/analytics";

interface Props {
  posts: UnrespondedPosts;
}

export function UnrespondedPostsCard({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {posts.length} unresponded post{posts.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Open for 30+ days with no status change — sorted by votes
          </p>
        </div>
      </div>

      <table className="w-full text-sm">
        <colgroup>
          <col />
          <col className="w-20" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="border-b border-amber-200/60 dark:border-amber-500/20">
            <th className="pb-2 text-left text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Post</th>
            <th className="pb-2 text-right text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Votes</th>
            <th className="pb-2 text-right text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Open For</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-200/60 dark:divide-amber-500/20">
          {posts.map((post) => (
            <tr key={post.id}>
              <td className="py-2 pr-6 text-amber-900 dark:text-amber-100 max-w-0">
                <span className="block truncate" title={post.title}>{post.title}</span>
              </td>
              <td className="py-2 text-right tabular-nums text-xs text-amber-700 dark:text-amber-400">
                {post.voteCount}
              </td>
              <td className="py-2 text-right tabular-nums text-xs text-amber-700 dark:text-amber-400 whitespace-nowrap">
                {post.daysOpen}d
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
