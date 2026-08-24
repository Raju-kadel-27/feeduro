import { CheckIcon, MinusIcon } from "lucide-react";
import { Fragment } from "react";

type CellValue = boolean | string;

const ROWS: {
  section: string;
  items: { label: string; free: CellValue; starter: CellValue; pro: CellValue }[];
}[] = [
  {
    section: "Feedback",
    items: [
      { label: "Feedback boards", free: "2", starter: "5", pro: "Unlimited" },
      { label: "Voting & comments", free: true, starter: true, pro: true },
      { label: "Unlimited feedback posts", free: true, starter: true, pro: true },
      { label: "Private boards", free: false, starter: true, pro: true },
      { label: "Guest posting", free: false, starter: true, pro: true },
    ],
  },
  {
    section: "Changelog & Roadmap",
    items: [
      { label: "Public changelog", free: true, starter: true, pro: true },
      { label: "Public roadmap", free: true, starter: true, pro: true },
    ],
  },
  {
    section: "Customization",
    items: [
      { label: "Custom domain", free: false, starter: false, pro: true },
      { label: "White-label portal", free: false, starter: false, pro: true },
    ],
  },
  {
    section: "Team & Access",
    items: [
      { label: "Unlimited voters & users", free: true, starter: true, pro: true },
      { label: "Admin roles", free: "1", starter: "3", pro: "Unlimited" },
      { label: "Single Sign-On (SSO)", free: false, starter: false, pro: true },
    ],
  },
  {
    section: "Integrations",
    items: [
      { label: "Integrations (Linear, Jira, GitHub…)", free: false, starter: true, pro: "Unlimited" },
      { label: "Advanced search & filters", free: false, starter: false, pro: true },
    ],
  },
  {
    section: "AI Features",
    items: [
      { label: "Comment summaries", free: false, starter: true, pro: true },
      { label: "AI-assisted insights", free: false, starter: true, pro: true },
    ],
  },
];

function Cell({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium">{value}</span>;
  }
  if (value) {
    return <CheckIcon className="mx-auto h-4 w-4 text-primary" />;
  }
  return <MinusIcon className="mx-auto h-4 w-4 text-muted-foreground/30" />;
}

export function PricingComparison() {
  return (
    <section className="mx-auto max-w-[1080px] px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Everything, compared</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-1/2 px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Feature
              </th>
              <th className="w-1/6 px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Free
              </th>
              <th className="w-1/6 px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                Starter
              </th>
              <th className="w-1/6 px-4 py-3 text-center text-sm font-semibold text-primary">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((group) => (
              <Fragment key={group.section}>
                <tr className="bg-muted/20">
                  <td
                    colSpan={4}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {group.section}
                  </td>
                </tr>
                {group.items.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-border/40 transition-colors hover:bg-muted/10"
                  >
                    <td className="px-4 py-3 text-sm">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      <Cell value={row.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Cell value={row.starter} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Cell value={row.pro} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
