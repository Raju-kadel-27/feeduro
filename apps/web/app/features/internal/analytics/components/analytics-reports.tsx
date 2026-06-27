import type { loadAnalyticsOverview } from "../server/overview";
import { ChangelogEngagementList } from "./changelog-engagement";
import { CompanyEngagementTable } from "./company-engagement-table";
import { SubscriberMetricsCard } from "./subscriber-metrics-card";

type ReportData = Pick<
  Awaited<ReturnType<typeof loadAnalyticsOverview>>,
  "changelogEngagement" | "companyEngagement" | "range" | "subscriberMetrics"
>;

const RANGE_LABEL: Record<string, string | undefined> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: undefined,
};

export function AnalyticsReports({ data }: { data: ReportData }) {
  const { changelogEngagement, companyEngagement, range, subscriberMetrics } = data;
  const rangeLabel = RANGE_LABEL[range];

  return (
    <div className="space-y-6">
      {/* Changelog engagement + subscribers side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Changelog Engagement</h2>
          <ChangelogEngagementList entries={changelogEngagement} />
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Changelog Subscribers</h2>
          <SubscriberMetricsCard metrics={subscriberMetrics} rangeLabel={rangeLabel} />
        </div>
      </div>

      {/* Company engagement — full width */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Company Engagement</h2>
        <CompanyEngagementTable companies={companyEngagement} />
      </div>
    </div>
  );
}
