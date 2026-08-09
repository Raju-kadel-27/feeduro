import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { Env } from "./env";
import { boardsRouter } from "./routes/boards";
import { categoriesRouter } from "./routes/categories";
import { changelogRouter } from "./routes/changelog";
import { changelogSubRouter } from "./routes/changelog-sub";
import { commentsRouter } from "./routes/comments";
import { companiesRouter } from "./routes/companies";
import { postsRouter } from "./routes/posts";
import { postsSubRouter } from "./routes/posts-sub";
import { roadmapRouter } from "./routes/roadmap";
import { tagsRouter } from "./routes/tags";
import { usersRouter } from "./routes/users";
import { votesRouter } from "./routes/votes";
import { webhooksRouter } from "./routes/webhooks";

const app = new OpenAPIHono<Env>();

app.route("/v1/posts", postsSubRouter);
app.route("/v1/posts", postsRouter);
app.route("/v1/comments", commentsRouter);
app.route("/v1/boards", boardsRouter);
app.route("/v1/changelog", changelogSubRouter);
app.route("/v1/tags", tagsRouter);
app.route("/v1/votes", votesRouter);
app.route("/v1/categories", categoriesRouter);
app.route("/v1/changelog", changelogRouter);
app.route("/v1/webhooks", webhooksRouter);
app.route("/v1/users", usersRouter);
app.route("/v1/companies", companiesRouter);
app.route("/v1/roadmap", roadmapRouter);

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Feeduro API",
    version: "1.0.0",
    description: `Public REST API for managing your Feeduro workspace.

## Authentication
Every request must include your API key in the **\`x-api-key\`** header:
\`\`\`
x-api-key: YOUR_API_KEY
\`\`\`
Generate and manage keys in **Settings → API Keys**. Keys are org-scoped — all reads and writes are isolated to your organization automatically.

## Base URL
\`\`\`
https://api.feeduro.com
\`\`\`

## Pagination
List endpoints use **keyset (cursor) pagination** — not page numbers. On every paginated response, check \`hasMore\`. When \`true\`, pass the returned \`cursor\` as a query parameter on the next request. Repeat until \`hasMore\` is \`false\`.

## Rate limits
60 requests per minute per API key. Exceeded requests receive **429**. Respect the \`Retry-After\` header and implement exponential back-off.

## Error format
All errors follow a consistent envelope:
\`\`\`json
{
  "error": "Human-readable message",
  "code": "machine_readable_code",
  "details": { "fieldErrors": { "field": ["message"] } }
}
\`\`\`
\`details\` is present on **400** and **422** responses. Use \`code\` for programmatic handling.

## HTTP status codes
| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 400  | Bad request — query params or body failed validation |
| 401  | Unauthorized — missing or invalid API key |
| 404  | Not found — resource doesn't exist in your org |
| 409  | Conflict — duplicate resource (e.g. tag name) |
| 422  | Unprocessable — body is valid JSON but fails business rules |
| 429  | Rate limit exceeded |
| 500  | Server error — retry with back-off |`,
  },
  servers: [
    { url: "https://api.feeduro.com", description: "Production" },
    { url: "http://localhost:8787", description: "Local dev" },
  ],
  tags: [
    {
      name: "Posts",
      description:
        "Create, read, update, and delete feedback posts across your boards. Posts are the core unit of feedback — they carry a title, description, status, vote count, tags, and category.",
    },
    {
      name: "Boards",
      description:
        "Create, read, update, and delete feedback boards. Boards group related posts (e.g. 'Feature Requests', 'Bug Reports').",
    },
    {
      name: "Comments",
      description:
        "Create, read, update, delete, and pin public comments on feedback posts. `userId` must be a profile ID from `POST /v1/users/identify`. Replies are one level deep — you cannot reply to a reply.",
    },
    {
      name: "Categories",
      description:
        "Create, list, and delete post categories within a board. Categories provide a secondary axis of classification below the board level.",
    },
    {
      name: "Tags",
      description:
        "Create, list, and delete tags. Tags are org-wide labels you can attach to multiple posts for filtering and segmentation.",
    },
    {
      name: "Votes",
      description:
        "Cast and remove votes on posts on behalf of identified users. Each user can vote once per post. Votes drive the vote count shown on posts.",
    },
    {
      name: "Users",
      description:
        "Identify and manage end-user profiles. Call `POST /v1/users/identify` from your backend on login or signup to upsert a profile and optionally link the user to one or more companies.",
    },
    {
      name: "Companies",
      description:
        "Manage account-level company records and their user memberships. Companies let you segment feedback by account, filter by plan or MRR, and understand which customers are most affected by an issue. User–company associations are created via `POST /v1/users/identify`.",
    },
    {
      name: "Changelog",
      description:
        "Create, read, update, and delete changelog entries. Changelog entries are published announcements tied to shipped features or fixes.",
    },
    {
      name: "Roadmap",
      description:
        "Read the public roadmap and update post roadmap status. The roadmap is a curated view of planned, in-progress, and completed posts.",
    },
    {
      name: "Webhooks",
      description:
        "Register and manage webhook endpoints. Feeduro sends `POST` events to your endpoints when posts, votes, comments, or changelog entries change.",
    },
  ],
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key from Settings → API Keys",
      },
    },
  },
});

app.get(
  "/docs",
  apiReference({
    spec: { url: "/openapi.json" },
    theme: "default",
    defaultHttpClient: { targetKey: "node", clientKey: "fetch" },
    authentication: {
      preferredSecurityScheme: "apiKey",
    },
  }),
);

export default app;
