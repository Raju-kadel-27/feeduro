import { data, useFetcher } from "react-router";
import { z } from "zod";
import { createApiClient } from "@lib/api-client.server";
import { getEnv } from "@lib/env.server";
import { getActiveApiUrl } from "@lib/env-override.server";
import type { Route } from "./+types/changelog";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Changelog · Feediyo Demo" }];
}

const EntrySchema = z.object({ id: z.string(), title: z.string(), slug: z.string(), status: z.string(), publishedAt: z.string().nullable() });
const ListSchema = z.object({ data: z.array(EntrySchema) });
const CreateSchema = z.object({ data: EntrySchema });

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const api = createApiClient(getActiveApiUrl(request, env), env.FEEDIYO_API_KEY);
  const res = await api.get("/v1/changelog", ListSchema);
  return data({ entries: res.data?.data ?? [], fetchError: res.error });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);
  const api = createApiClient(getActiveApiUrl(request, env), env.FEEDIYO_API_KEY);
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const status = form.get("status") === "published" ? "published" : "draft";
  if (!title) return data({ entry: null, error: "Title is required." }, { status: 400 });
  const res = await api.post("/v1/changelog", { title, status }, CreateSchema);
  return data({ entry: res.data?.data ?? null, error: res.error });
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div className="p-8 text-sm text-red-600">{error instanceof Error ? error.message : "Error."}</div>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

export default function ChangelogPage({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-gray-900">Changelog</h1>
        <p className="mt-1 text-sm text-gray-500">Create and manage changelog entries via the REST API. Publishing triggers <code className="rounded bg-gray-100 px-1 font-mono text-xs">changelog.published</code> webhook.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 p-8">
        {/* Entries list */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">GET</span>
            <span className="font-mono text-sm text-gray-700">/v1/changelog</span>
          </div>
          {loaderData.fetchError ? (
            <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{loaderData.fetchError}</p>
          ) : loaderData.entries.length === 0 ? (
            <p className="text-sm text-gray-400">No changelog entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {loaderData.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                  <span className="truncate text-sm font-medium text-gray-800">{e.title}</span>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create entry */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-700">POST</span>
            <span className="font-mono text-sm text-gray-700">/v1/changelog</span>
          </div>
          <fetcher.Form method="post" className="space-y-3">
            <input name="title" required placeholder="Entry title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="radio" name="status" value="draft" defaultChecked className="accent-indigo-600" />
                Draft
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="radio" name="status" value="published" className="accent-indigo-600" />
                Published <span className="text-xs text-gray-400">(fires webhook)</span>
              </label>
            </div>
            <button type="submit" disabled={fetcher.state !== "idle"} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {fetcher.state !== "idle" ? "Creating…" : "Create Entry →"}
            </button>
          </fetcher.Form>
          {(fetcher.data?.entry || fetcher.data?.error) && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-gray-400">Response</p>
              <pre className={`overflow-auto rounded-lg p-3 text-xs leading-relaxed ${fetcher.data.error ? "bg-red-50 text-red-700" : "bg-gray-900 text-emerald-300"}`}>
                {fetcher.data.error ?? JSON.stringify(fetcher.data.entry, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
