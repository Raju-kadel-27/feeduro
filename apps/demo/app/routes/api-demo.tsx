import { data, useFetcher } from "react-router";
import { z } from "zod";
import { createApiClient } from "@lib/api-client.server";
import { getEnv } from "@lib/env.server";
import { getActiveApiUrl } from "@lib/env-override.server";
import { getRequestLog } from "@lib/request-log.server";
import type { Route } from "./+types/api-demo";

const BoardSchema = z.object({ id: z.string(), name: z.string() });
const PostSchema = z.object({ id: z.string(), title: z.string(), status: z.string() });
const ListBoardsSchema = z.object({ data: z.array(BoardSchema) });
const ListPostsSchema = z.object({ data: z.array(PostSchema) });
const CreatePostSchema = z.object({ data: z.object({ id: z.string(), title: z.string(), boardId: z.string() }) });

export function meta(): Route.MetaDescriptors { return [{ title: "API · Feediyo Demo" }]; }
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div className="p-8 text-sm text-red-600">{error instanceof Error ? error.message : "Error."}</div>;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const api = createApiClient(getActiveApiUrl(request, env), env.FEEDIYO_API_KEY);
  const [boards, posts] = await Promise.all([
    api.get("/v1/boards", ListBoardsSchema),
    api.get("/v1/posts?limit=5", ListPostsSchema),
  ]);
  return data({ boards: boards.data?.data ?? [], boardsError: boards.error, posts: posts.data?.data ?? [], postsError: posts.error, requestLog: getRequestLog().slice(0, 8) });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);
  const api = createApiClient(getActiveApiUrl(request, env), env.FEEDIYO_API_KEY);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create-post");

  if (intent === "create-post") {
    const boardId = String(form.get("boardId") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!boardId || !title) return data({ result: null, error: "Board and title required." }, { status: 400 });
    const res = await api.post("/v1/posts", { boardId, title, ...(description ? { description } : {}) }, CreatePostSchema);
    return data({ result: res.data, error: res.error });
  }

  if (intent === "update-status") {
    const postId = String(form.get("postId") ?? "").trim();
    const status = String(form.get("status") ?? "").trim();
    if (!postId || !status) return data({ result: null, error: "Post ID and status required." }, { status: 400 });
    const res = await api.patch(`/v1/posts/${postId}`, { status }, z.object({ data: PostSchema }));
    return data({ result: res.data, error: res.error });
  }

  return data({ result: null, error: "Unknown intent" }, { status: 400 });
}

function MethodTag({ m }: { m: "GET" | "POST" | "PATCH" }) {
  const cls = { GET: "bg-emerald-100 text-emerald-700", POST: "bg-indigo-100 text-indigo-700", PATCH: "bg-amber-100 text-amber-700" }[m];
  return <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>{m}</span>;
}

export default function ApiDemo({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <h1 className="text-xl font-semibold text-gray-900">REST API</h1>
        <p className="mt-1 text-sm text-gray-500">All calls run server-side — the API key never reaches the browser.</p>
      </div>
      <div className="p-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Boards */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2"><MethodTag m="GET" /><span className="font-mono text-sm text-gray-700">/v1/boards</span></div>
            {loaderData.boardsError ? <p className="text-xs text-red-600">{loaderData.boardsError}</p> : (
              <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="pb-2 text-left text-xs font-medium text-gray-400">Name</th><th className="pb-2 text-right text-xs font-medium text-gray-400">ID</th></tr></thead>
                <tbody className="divide-y divide-gray-50">{loaderData.boards.map(b => (<tr key={b.id}><td className="py-2 font-medium text-gray-800">{b.name}</td><td className="py-2 text-right font-mono text-xs text-gray-400">{b.id.slice(0, 10)}…</td></tr>))}</tbody>
              </table>
            )}
          </div>
          {/* Posts list */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2"><MethodTag m="GET" /><span className="font-mono text-sm text-gray-700">/v1/posts?limit=5</span></div>
            {loaderData.postsError ? <p className="text-xs text-red-600">{loaderData.postsError}</p> : (
              <ul className="space-y-1.5">{loaderData.posts.length === 0 ? <li className="text-sm text-gray-400">No posts yet.</li> : loaderData.posts.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-gray-800">{p.title}</span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{p.status}</span>
                </li>
              ))}</ul>
            )}
          </div>
        </div>

        {/* Create post */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><MethodTag m="POST" /><span className="font-mono text-sm text-gray-700">/v1/posts</span></div>
          <fetcher.Form method="post" className="grid grid-cols-3 gap-3">
            <input type="hidden" name="intent" value="create-post" />
            <select name="boardId" required className="col-span-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              <option value="">Board…</option>{loaderData.boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <input name="title" required placeholder="Post title" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <textarea name="description" placeholder="Description (optional)" rows={2} className="col-span-3 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
            <button type="submit" disabled={fetcher.state !== "idle"} className="col-span-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {fetcher.state !== "idle" ? "Creating…" : "Create Post →"}
            </button>
          </fetcher.Form>
          {result && <pre className={`mt-3 overflow-auto rounded-lg p-3 text-xs leading-relaxed ${result.error ? "bg-red-50 text-red-700" : "bg-gray-900 text-emerald-300"}`}>{result.error ?? JSON.stringify(result.result, null, 2)}</pre>}
        </div>

        {/* Request log */}
        {loaderData.requestLog.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Request Log</p>
            <div className="space-y-1">
              {loaderData.requestLog.map(e => (
                <div key={e.id} className="flex items-center gap-3 font-mono text-xs">
                  <span className={`w-10 shrink-0 font-semibold ${e.status >= 200 && e.status < 300 ? "text-emerald-600" : "text-red-500"}`}>{e.status || "ERR"}</span>
                  <span className="text-gray-400">{e.method}</span>
                  <span className="flex-1 truncate text-gray-700">{e.path}</span>
                  <span className="shrink-0 text-gray-400">{e.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
