import type { DetailData, PostDetail } from "@features/feedback/schemas/admin";
import type { CompanyVoter, Segment } from "@features/internal/segmentation/types";
import { cn } from "@lib/utils";
import { formatMrr } from "@utils/format-mrr";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import { PostCompanyList } from "./post-company-list";
import { IntegrationSections } from "./post-integration-sidebar";

type Integrations = ReturnType<typeof useIntegrationLinks>;

type Slice = { name: string; color: string; count: number; pct: number; mrr: number };

function DonutChart({ slices }: { slices: Slice[] }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <PieChart width={200} height={200}>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as Slice;
            return (
              <div className="rounded border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-1 tabular-nums text-muted-foreground">{d.count} ({d.pct}%)</span>
                </div>
                {d.mrr > 0 && (
                  <div className="mt-0.5 pl-3.5 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMrr(d.mrr)}/mo
                  </div>
                )}
              </div>
            );
          }}
        />
        <Pie data={slices} dataKey="count" innerRadius={58} outerRadius={92} paddingAngle={2} strokeWidth={0}>
          {slices.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
      </PieChart>

      <div className="w-full space-y-2.5">
        {slices.map(({ name, color, count, pct, mrr }) => (
          <div key={name} className="flex items-center gap-2 text-xs min-w-0">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="flex-1 text-muted-foreground truncate">{name}</span>
            {mrr > 0 && (
              <span className="tabular-nums text-[11px] text-emerald-600 dark:text-emerald-400">
                {formatMrr(mrr)}
              </span>
            )}
            <span className="tabular-nums font-medium">{count}</span>
            <span className="text-[10px] text-muted-foreground">({pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonDonut() {
  return (
    <div className="flex flex-col items-center gap-5 animate-pulse">
      <div className="w-[200px] h-[200px] rounded-full bg-muted" />
      <div className="w-full space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-muted shrink-0" />
            <div className="flex-1 h-2.5 bg-muted rounded" />
            <div className="h-2.5 w-6 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostSegmentSidebar({
  segmentCounts,
  otherCount,
  profiledCount,
  mrrBySegment,
  otherMrr,
  totalMrr,
  companies,
  voteCount,
  segments,
  isLoading,
  post,
  detailData,
  integrations,
  isAdmin,
  fullPage,
}: {
  segmentCounts: Record<string, number>;
  otherCount: number;
  profiledCount: number;
  mrrBySegment: Record<string, number>;
  otherMrr: number;
  totalMrr: number;
  companies: CompanyVoter[];
  voteCount: number;
  segments: Segment[];
  isLoading: boolean;
  post: PostDetail;
  detailData: DetailData;
  integrations: Integrations;
  isAdmin: boolean;
  fullPage?: boolean;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const hasAnyIntegration =
    detailData.linearConnected || detailData.jiraConnected || detailData.asanaConnected || detailData.githubConnected || detailData.clickupConnected || detailData.shortcutConnected;

  const slices = useMemo<Slice[]>(() => {
    if (!segments.length || !profiledCount) return [];

    const total = voteCount || 1;
    const anonymousCount = Math.max(0, voteCount - profiledCount);
    const result: Slice[] = [];

    for (const seg of segments) {
      const count = segmentCounts[seg.id] ?? 0;
      if (count > 0) {
        result.push({ name: seg.name, color: seg.color, count, pct: Math.round((count / total) * 100), mrr: mrrBySegment[seg.id] ?? 0 });
      }
    }
    if (otherCount > 0) {
      result.push({ name: "Other", color: "hsl(215 14% 65%)", count: otherCount, pct: Math.round((otherCount / total) * 100), mrr: otherMrr });
    }
    if (anonymousCount > 0) {
      result.push({ name: "Anonymous", color: "hsl(215 14% 83%)", count: anonymousCount, pct: Math.round((anonymousCount / total) * 100), mrr: 0 });
    }

    return result;
  }, [segmentCounts, otherCount, profiledCount, voteCount, segments, mrrBySegment, otherMrr]);

  return (
    <aside className={cn(fullPage ? "w-[480px]" : "w-[400px]", "shrink-0 border-l overflow-y-auto")}>
      {isAdmin && hasAnyIntegration && (
        <div className="px-4 pt-4 pb-5 space-y-5 border-b">
          <IntegrationSections post={post} detailData={detailData} integrations={integrations} isAdmin={isAdmin} />
        </div>
      )}

      <div className="px-5 pt-4 pb-6">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Segment Breakdown
        </h3>

        {!isLoading && totalMrr > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/15 px-3 py-2.5">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                MRR impact
              </p>
              <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatMrr(totalMrr)}/mo
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <SkeletonDonut />
        ) : segments.length === 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">No segments defined yet.</p>
            {orgSlug && (
              <Link to={`/${orgSlug}/settings/segments`} className="text-xs text-primary hover:underline">
                Create segments →
              </Link>
            )}
          </div>
        ) : slices.length === 0 ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            No voter profile data available. Identify users via the widget SDK to see how voters map to your segments.
          </p>
        ) : (
          <DonutChart slices={slices} />
        )}
      </div>

      <PostCompanyList companies={companies} isLoading={isLoading} />
    </aside>
  );
}
