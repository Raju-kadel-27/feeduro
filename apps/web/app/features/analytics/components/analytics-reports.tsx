import type { loadAnalyticsOverview } from "../server/overview.server";
import { AdminActivityTable } from "./admin-activity-table";
import { ChangelogEngagementList } from "./changelog-engagement";
import { CompanyEngagementTable } from "./company-engagement-table";

type ReportData = Pick<
  Awaited<ReturnType<typeof loadAnalyticsOverview>>,
  "changelogEngagement" | "adminActivity" | "companyEngagement" | "range"
>;

const RANGE_LABEL: Record<string, string | undefined> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: undefined,
};

export function AnalyticsReports({ data }: { data: ReportData }) {
  const { changelogEngagement, adminActivity, companyEngagement, range } = data;
  const rangeLabel = RANGE_LABEL[range];

  return (
    <div className="space-y-6">
      {/* Changelog engagement */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">Changelog Engagement</h2>
          <p className="text-xs text-muted-foreground">views · unique readers</p>
        </div>
        <ChangelogEngagementList entries={changelogEngagement} />
      </div>

      {/* Admin activity + company engagement side-by-side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Team Activity</h2>
            <p className="text-xs text-muted-foreground">
              {rangeLabel ? rangeLabel : "all time"} · posts · votes · comments
            </p>
          </div>
          <AdminActivityTable activity={adminActivity} />
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">Company Engagement</h2>
            <p className="text-xs text-muted-foreground">external customers by domain</p>
          </div>
          <CompanyEngagementTable companies={companyEngagement} />
        </div>
      </div>
    </div>
  );
}
