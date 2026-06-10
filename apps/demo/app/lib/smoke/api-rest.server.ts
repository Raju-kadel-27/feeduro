import { z } from "zod";
import type { createApiClient } from "../api-client.server";
import type { Check } from "./env.server";

const BoardSchema = z.object({ id: z.string(), name: z.string(), embedToken: z.string().optional() });
export const BoardsSchema = z.object({ data: z.array(BoardSchema) });
export type Board = z.infer<typeof BoardSchema>;

const PostSchema = z.object({ id: z.string(), title: z.string(), status: z.string().optional() });
const PostWrapSchema = z.object({ data: PostSchema });
const CreatePostSchema = z.object({ data: z.object({ id: z.string() }) });
const DeleteSchema = z.object({ success: z.boolean() });
const IdentifySchema = z.object({ data: z.object({ id: z.string() }) });
const UsersSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

type Api = ReturnType<typeof createApiClient>;

export async function runApiRestChecks(
  api: Api,
  apiUrl: string,
): Promise<{ checks: Check[]; boards: Board[] }> {
  const checks: Check[] = [];
  const start = Date.now();

  // GET /v1/boards — needed for all post tests
  const boards = await api.get("/v1/boards", BoardsSchema);
  checks.push({
    id: "api-boards",
    label: "GET /v1/boards",
    status: boards.error ? "fail" : "pass",
    durationMs: boards.durationMs,
    detail: boards.error ?? `${boards.data?.data.length ?? 0} board(s) returned`,
  });

  // Auth rejection probe — no key should return 401
  const noAuthRes = await fetch(`${apiUrl}/v1/boards`).then(r => ({ status: r.status })).catch(() => ({ status: 0 }));
  checks.push({
    id: "api-noauth",
    label: "Auth rejection (no key → 401)",
    status: noAuthRes.status === 401 ? "pass" : "fail",
    detail: noAuthRes.status === 401 ? "No key → 401 ✓" : `Expected 401, got ${noAuthRes.status}`,
  });

  const boardList = boards.data?.data ?? [];
  const firstBoard = boardList[0];

  if (!firstBoard) {
    for (const id of ["api-post-create", "api-post-patch", "api-post-get", "api-post-delete"]) {
      checks.push({ id, label: id, status: "skip", detail: "Skipped — no boards returned" });
    }
  } else {
    // POST /v1/posts
    const created = await api.post("/v1/posts", { boardId: firstBoard.id, title: "Smoke test post (safe to delete)" }, CreatePostSchema);
    checks.push({
      id: "api-post-create",
      label: "POST /v1/posts",
      status: created.status === 201 ? "pass" : "fail",
      durationMs: created.durationMs,
      detail: created.error ?? `Created ${created.data?.data.id.slice(0, 10)}… on "${firstBoard.name}"`,
    });

    const postId = created.data?.data.id;

    // PATCH /v1/posts/:id
    if (postId) {
      const patched = await api.patch(`/v1/posts/${postId}`, { status: "reviewing" }, PostWrapSchema);
      checks.push({
        id: "api-post-patch",
        label: "PATCH /v1/posts/:id",
        status: patched.error ? "fail" : "pass",
        durationMs: patched.durationMs,
        detail: patched.error ?? `Status set to "${patched.data?.data.status}"`,
      });

      // GET /v1/posts/:id
      const fetched = await api.get(`/v1/posts/${postId}`, PostWrapSchema);
      checks.push({
        id: "api-post-get",
        label: "GET /v1/posts/:id",
        status: fetched.error ? "fail" : "pass",
        durationMs: fetched.durationMs,
        detail: fetched.error ?? `Retrieved "${fetched.data?.data.title}"`,
      });

      // DELETE /v1/posts/:id
      const deleted = await api.delete(`/v1/posts/${postId}`, DeleteSchema);
      checks.push({
        id: "api-post-delete",
        label: "DELETE /v1/posts/:id",
        status: deleted.error ? "fail" : "pass",
        durationMs: deleted.durationMs,
        detail: deleted.error ?? "Deleted ✓",
      });
    } else {
      for (const id of ["api-post-patch", "api-post-get", "api-post-delete"]) {
        checks.push({ id, label: id, status: "skip", detail: "Skipped — post creation failed" });
      }
    }
  }

  // POST /v1/users/identify
  const identified = await api.post("/v1/users/identify", { email: "smoke@feeduro-demo.local", externalId: "smoke-user-1", name: "Smoke Test User" }, IdentifySchema);
  checks.push({
    id: "api-user-identify",
    label: "POST /v1/users/identify",
    status: identified.error ? "fail" : "pass",
    durationMs: identified.durationMs,
    detail: identified.error ?? `User id: ${identified.data?.data.id.slice(0, 10)}…`,
  });

  // GET /v1/users
  const users = await api.get("/v1/users", UsersSchema);
  checks.push({
    id: "api-users-list",
    label: "GET /v1/users",
    status: users.error ? "fail" : "pass",
    durationMs: users.durationMs,
    detail: users.error ?? `${users.data?.data.length ?? 0} user(s) returned`,
  });

  const totalMs = Date.now() - start;
  console.log(`[smoke] api-rest: ${checks.filter(c => c.status === "pass").length}/${checks.length} passed (${totalMs}ms)`);

  return { checks, boards: boardList };
}
