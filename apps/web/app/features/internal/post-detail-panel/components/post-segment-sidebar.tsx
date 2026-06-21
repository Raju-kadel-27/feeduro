import type { DetailData, PostDetail } from "@features/feedback/schemas/admin";
import type { Segment, SegmentFilters } from "@features/internal/segmentation/types";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { useIntegrationLinks } from "../hooks/use-integration-links";
import type { Voter } from "../hooks/use-voter-data";
import { IntegrationSections } from "./post-integration-sidebar";

type Integrations = ReturnType<typeof useIntegrationLinks>;

function voterMatchesSegment(voter: Voter, filters: SegmentFilters): boolean {
  if (filters.plan?.length && !filters.plan.includes(voter.plan ?? "")) return false;
  if (filters.role?.length && !filters.role.includes(voter.role ?? "")) return false;
  if (filters.industry?.length && !filters.industry.includes(voter.industry ?? "")) return false;
  if (filters.location?.length && !filters.location.includes(voter.location ?? "")) return false;
  return true;
}

type Slice = { name: string; color: string; count: number; pct: number };

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
        {slices.map(({ name, color, count, pct }) => (
          <div key={name} className="flex items-center gap-2 text-xs min-w-0">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="flex-1 text-muted-foreground truncate">{name}</span>
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
  voters,
  voteCount,
  segments,
  isLoading,
  post,
  detailData,
  integrations,
  isAdmin,
}: {
  voters: Voter[];
  voteCount: number;
  segments: Segment[];
  isLoading: boolean;
  post: PostDetail;
  detailData: DetailData;
  integrations: Integrations;
  isAdmin: boolean;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const hasAnyIntegration =
    detailData.linearConnected || detailData.jiraConnected || detailData.asanaConnected;

  const slices = useMemo<Slice[]>(() => {
    if (!segments.length || !voters.length) return [];

    const counts = new Map<string, { name: string; color: string; count: number }>();
    let otherCount = 0;
    const anonymousCount = Math.max(0, voteCount - voters.length);

    for (const voter of voters) {
      let matched = false;
      for (const seg of segments) {
        if (voterMatchesSegment(voter, seg.filters)) {
          const prev = counts.get(seg.id) ?? { name: seg.name, color: seg.color, count: 0 };
          counts.set(seg.id, { ...prev, count: prev.count + 1 });
          matched = true;
          break;
        }
      }
      if (!matched) otherCount++;
    }

    const total = voteCount || 1;
    const result: Slice[] = [];

    for (const seg of segments) {
      const s = counts.get(seg.id);
      if (s?.count) {
        result.push({ name: s.name, color: s.color, count: s.count, pct: Math.round((s.count / total) * 100) });
      }
    }
    if (otherCount > 0) {
      result.push({ name: "Other", color: "hsl(215 14% 65%)", count: otherCount, pct: Math.round((otherCount / total) * 100) });
    }
    if (anonymousCount > 0) {
      result.push({ name: "Anonymous", color: "hsl(215 14% 83%)", count: anonymousCount, pct: Math.round((anonymousCount / total) * 100) });
    }

    return result;
  }, [voters, segments, voteCount]);

  return (
    <aside className="w-[400px] shrink-0 border-l overflow-y-auto">
      {/* Integration links at top */}
      {isAdmin && hasAnyIntegration && (
        <div className="px-4 pt-4 pb-5 space-y-5 border-b">
          <IntegrationSections post={post} detailData={detailData} integrations={integrations} isAdmin={isAdmin} />
        </div>
      )}

      {/* Segment breakdown below */}
      <div className="px-5 pt-4 pb-6">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Segment Breakdown
        </h3>

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
    </aside>
  );
}
