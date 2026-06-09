import { data, Form, useNavigation } from "react-router";
import { runChecks } from "@lib/smoke-checks.server";
import type { Status, Check } from "@lib/smoke-checks.server";
import type { Route } from "./+types/smoke-tests";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Smoke Tests · Feediyo Demo" }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div className="p-8 text-sm text-red-600">{error instanceof Error ? error.message : "Error."}</div>;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const checks = await runChecks(request, context);
  return data({ checks, ranAt: new Date().toISOString() });
}

const ICON: Record<Status, { icon: string; cls: string }> = {
  pass: { icon: "✓", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  fail: { icon: "✗", cls: "text-red-600 bg-red-50 border-red-200" },
  warn: { icon: "⚠", cls: "text-amber-600 bg-amber-50 border-amber-200" },
  skip: { icon: "–", cls: "text-gray-400 bg-gray-50 border-gray-200" },
};

const GROUPS = [
  { label: "Environment", ids: ["env-token", "env-apikey", "env-url", "env-wh", "env-sign"] },
  { label: "API — Boards", ids: ["api-boards", "api-noauth"] },
  { label: "API — Post lifecycle", ids: ["api-post-create", "api-post-patch", "api-post-get", "api-post-delete"] },
  { label: "API — Users", ids: ["api-user-identify", "api-users-list"] },
  { label: "Webhooks", ids: ["wh-sig-valid", "wh-sig-tamper", "wh-sig-missing", "wh-e2e"] },
  { label: "Connectivity", ids: ["conn-widget", "conn-board-feature", "conn-board-integrations", "conn-board-bugs", "conn-board-url"] },
];

function CheckRow({ c }: { c: Check }) {
  const { icon, cls } = ICON[c.status];
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${cls}`}>{icon}</span>
      <span className="w-52 shrink-0 text-sm font-medium text-gray-800">{c.label}</span>
      <span className="flex-1 text-sm text-gray-500">{c.detail}</span>
      {c.durationMs !== undefined && <span className="shrink-0 font-mono text-xs text-gray-400">{c.durationMs}ms</span>}
    </div>
  );
}

export default function SmokeTests({ loaderData }: Route.ComponentProps) {
  const nav = useNavigation();
  const loading = nav.state === "loading";
  const checks = loaderData.checks;
  const passed = checks.filter(c => c.status === "pass").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const skipped = checks.filter(c => c.status === "skip").length;

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Smoke Tests</h1>
            <p className="mt-1 text-sm text-gray-500">Run before every deploy. All checks must pass.</p>
          </div>
          <Form method="get" reloadDocument>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {loading ? "Running…" : "Re-run"}
            </button>
          </Form>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="font-medium text-emerald-600">{passed} passed</span>
          {failed > 0 && <span className="font-medium text-red-600">{failed} failed</span>}
          {skipped > 0 && <span className="text-gray-400">{skipped} skipped</span>}
          <span className="text-gray-400">· {new Date(loaderData.ranAt).toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="space-y-6 p-8">
        {GROUPS.map(({ label, ids }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {checks.filter(c => ids.includes(c.id)).map(c => <CheckRow key={c.id} c={c} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
