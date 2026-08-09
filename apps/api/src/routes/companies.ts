import {
  addCompanyMember,
  deleteCompany,
  getCompany,
  listCompanies,
  listCompanyMembers,
  removeCompanyMember,
  updateCompany,
  upsertCompany,
} from "@feeduro/data-access/users/companies";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import {
  ErrorSchema,
  PaginationMeta,
  Res400,
  Res401,
  Res404,
  Res422,
  Res429,
  Res500,
} from "../schemas/common";

// ── Response schemas ──────────────────────────────────────────────────────────

const CompanySchema = z
  .object({
    id: z.string().openapi({
      example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
      description: "Feeduro-assigned internal ID. Use this in `PATCH /v1/companies/:id`, `DELETE /v1/companies/:id`, and `GET /v1/companies/:id/members`.",
    }),
    externalId: z.string().openapi({
      example: "acme_corp",
      description: "Your system's canonical identifier for this company. Unique within your organization. Immutable after creation — use `PATCH` to update other fields.",
    }),
    name: z.string().nullable().openapi({
      example: "Acme Corp",
      description: "Display name. `null` if not set.",
    }),
    monthlySpend: z.number().int().nullable().openapi({
      example: 499,
      description:
        "The company's MRR in whole US dollars. Feeduro uses this to weight feedback by revenue impact in dashboards. `null` if not set.",
    }),
    plan: z.string().nullable().openapi({
      example: "pro",
      description:
        "Billing plan slug (e.g. `free`, `starter`, `pro`, `enterprise`). Feeduro surfaces this in filters to help you segment feedback by plan tier. `null` if not set.",
    }),
    customAttributes: z.record(z.string(), z.unknown()).nullable().openapi({
      description:
        "Arbitrary key-value metadata you can use to store anything that doesn't fit the standard fields (e.g. `{ industry: 'fintech', employees: 200 }`). Values can be strings, numbers, booleans, or `null`. `null` if no custom attributes were provided.",
      example: { industry: "fintech", employees: 200, region: "us-west" },
    }),
    createdAt: z.string().datetime().openapi({
      example: "2024-03-15T09:00:00.000Z",
      description: "ISO 8601 timestamp (UTC) of when the company was first created.",
    }),
    updatedAt: z.string().datetime().openapi({
      example: "2024-06-01T14:32:00.000Z",
      description: "ISO 8601 timestamp (UTC) of the most recent update.",
    }),
  })
  .openapi("Company");

const CompanyListSchema = z
  .object({ data: z.array(CompanySchema), ...PaginationMeta })
  .openapi("CompanyList");

const CompanyMemberSchema = z
  .object({
    id: z.string().openapi({
      example: "up_01j8h2k3m4n5p6q7r8s9t0u1v",
      description: "Feeduro internal ID for this user profile.",
    }),
    externalId: z.string().nullable().openapi({
      example: "usr_12345",
      description: "Your system's identifier for this user, as supplied via `POST /v1/users/identify`. `null` if not provided.",
    }),
    email: z.string().email().openapi({
      example: "alice@acme.com",
      description: "The user's email address.",
    }),
    name: z.string().nullable().openapi({
      example: "Alice Johnson",
      description: "The user's display name. `null` if not provided.",
    }),
    createdAt: z.string().datetime().openapi({
      example: "2024-02-10T08:00:00.000Z",
      description: "ISO 8601 timestamp (UTC) of when this user profile was first created.",
    }),
  })
  .openapi("CompanyMember");

// ── Request body schemas ──────────────────────────────────────────────────────

const UpsertCompanyBody = z
  .object({
    externalId: z.string().min(1).max(255).openapi({
      example: "acme_corp",
      description:
        "**Required.** Your system's canonical identifier for this company (e.g. a database UUID, Stripe customer ID, or Salesforce account ID). Must be unique within your organization. If a company with this `externalId` already exists, the request **updates** it — otherwise a new company is created. Max 255 characters.",
    }),
    name: z.string().max(255).optional().openapi({
      example: "Acme Corp",
      description: "Human-readable display name shown in the Feeduro dashboard. Max 255 characters. Omit to leave unchanged on updates.",
    }),
    monthlySpend: z.number().int().nonnegative().optional().openapi({
      example: 499,
      description:
        "The company's MRR in whole US dollars. Feeduro uses this to weight feedback by revenue impact. Pass `0` for free-plan customers. Omit to leave unchanged on updates.",
    }),
    plan: z.string().max(100).optional().openapi({
      example: "pro",
      description:
        "Billing plan slug (e.g. `free`, `starter`, `pro`, `enterprise`). Lowercase recommended for consistency. Max 100 characters. Omit to leave unchanged on updates.",
    }),
    customFields: z.record(z.string(), z.unknown()).optional().openapi({
      description:
        "Arbitrary key-value metadata. Values can be strings, numbers, booleans, or `null`. Existing keys are merged — passing `{ industry: 'saas' }` on an update does **not** remove other custom fields. Omit to leave unchanged on updates.",
      example: { industry: "saas", employees: 120, region: "us-west" },
    }),
  })
  .openapi("UpsertCompanyRequest");

const UpdateCompanyBody = z
  .object({
    name: z.string().max(255).optional().openapi({
      example: "Acme Corporation",
      description: "New display name. Max 255 characters. Omit to leave unchanged.",
    }),
    monthlySpend: z.number().int().nonnegative().optional().openapi({
      example: 999,
      description: "Updated MRR in whole US dollars. Omit to leave unchanged.",
    }),
    plan: z.string().max(100).optional().openapi({
      example: "enterprise",
      description: "Updated billing plan slug. Max 100 characters. Omit to leave unchanged.",
    }),
    customFields: z.record(z.string(), z.unknown()).optional().openapi({
      description:
        "Replaces the stored `customAttributes` object entirely. Pass the full merged object if you want to preserve existing keys.",
      example: { industry: "fintech", employees: 250, region: "eu-west" },
    }),
  })
  .openapi("UpdateCompanyRequest");

// ── Shared route config ───────────────────────────────────────────────────────

const security = [{ apiKey: [] }];

const sharedErrors = {
  401: Res401,
  429: Res429,
  500: Res500,
} as const;

// ── Route definitions ─────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Companies"],
  summary: "List companies",
  description: `Returns a paginated list of companies in your organization, ordered by creation date (newest first).

**Pagination** uses an opaque keyset cursor — not page numbers. On each response, check \`hasMore\`. If \`true\`, pass the returned \`cursor\` as a query parameter to fetch the next page. Repeat until \`hasMore\` is \`false\`.

\`\`\`
GET /v1/companies?limit=25
→ { data: [...], hasMore: true, cursor: "eyJ..." }

GET /v1/companies?limit=25&cursor=eyJ...
→ { data: [...], hasMore: false }
\`\`\``,
  security,
  request: {
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(25)
        .openapi({
          example: 25,
          description: "Number of results per page. Min `1`, max `100`. Defaults to `25`.",
        }),
      cursor: z.string().optional().openapi({
        description:
          "Pagination cursor returned by the previous response. Omit for the first page.",
        example: "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTIzVDEyOjAwOjAwWiJ9",
      }),
    }),
  },
  responses: {
    200: {
      description: "Paginated list of companies.",
      content: { "application/json": { schema: CompanyListSchema } },
    },
    400: Res400,
    ...sharedErrors,
  },
});

const upsertRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Companies"],
  summary: "Upsert a company",
  description: `Creates a new company, or updates an existing one if a company with the same \`externalId\` already exists in your organization.

This endpoint is **idempotent**: calling it multiple times with the same \`externalId\` is safe and will not create duplicates. Use it to keep company data in sync with your billing system on every event (subscription upgraded, MRR changed, plan changed, etc.).

**On create** — all supplied fields are set; unset optional fields default to \`null\`.

**On update** — only the supplied fields are changed; omitted optional fields are left as-is. \`externalId\` cannot be changed after creation.

Returns the internal Feeduro \`id\` which you can use to make subsequent \`PATCH\` or \`DELETE\` calls.`,
  security,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpsertCompanyBody } },
    },
  },
  responses: {
    200: {
      description:
        "Company was created or updated successfully. The `id` is the Feeduro internal ID — store it if you need to make targeted `PATCH` / `DELETE` calls.",
      content: {
        "application/json": {
          schema: z
            .object({
              data: z.object({
                id: z.string().openapi({
                  example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
                  description: "Internal Feeduro ID for the upserted company.",
                }),
              }),
            })
            .openapi("UpsertCompanyResponse"),
        },
      },
    },
    400: Res400,
    422: Res422,
    ...sharedErrors,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Companies"],
  summary: "Get a company",
  description:
    "Retrieves a single company by its Feeduro internal `id`. To look up a company by your own `externalId`, use `GET /v1/companies` and filter client-side, or store the `id` returned by `POST /v1/companies` when you first upsert the company.",
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
    }),
  },
  responses: {
    200: {
      description: "The requested company.",
      content: { "application/json": { schema: z.object({ data: CompanySchema }).openapi("GetCompanyResponse") } },
    },
    404: Res404,
    ...sharedErrors,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Companies"],
  summary: "Update a company",
  description: `Partially updates a company by its Feeduro internal \`id\`. Only the fields you include in the request body are changed — omitted fields are left as-is.

**Note:** \`externalId\` is immutable and cannot be changed via this endpoint. To update a company by \`externalId\` (without storing the internal \`id\`), use \`POST /v1/companies\` — it acts as an upsert.`,
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
    }),
    body: {
      required: true,
      content: { "application/json": { schema: UpdateCompanyBody } },
    },
  },
  responses: {
    200: {
      description: "The company after the update was applied.",
      content: {
        "application/json": {
          schema: z.object({ data: CompanySchema }).openapi("UpdateCompanyResponse"),
        },
      },
    },
    404: Res404,
    422: Res422,
    ...sharedErrors,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Companies"],
  summary: "Delete a company",
  description: `Permanently deletes a company and **all associated member links** (rows in \`company_members\`). This does **not** delete the user profiles themselves — only the association between users and this company.

> ⚠️ This action is **irreversible**. The company and its member associations cannot be recovered after deletion.`,
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
    }),
  },
  responses: {
    200: {
      description: "Company and all its member associations were permanently deleted.",
      content: {
        "application/json": {
          schema: z
            .object({ success: z.literal(true) })
            .openapi("DeleteCompanyResponse"),
        },
      },
    },
    404: Res404,
    ...sharedErrors,
  },
});

const addMemberRoute = createRoute({
  method: "post",
  path: "/:id/members",
  tags: ["Companies"],
  summary: "Add a member to a company",
  description: `Links an existing user profile to a company. Both the company and the user profile must already exist in your organization.

Use this endpoint when you want to associate a user with a company without going through \`POST /v1/users/identify\` — for example when backfilling associations or managing memberships directly.

Returns **409** if the user is already a member of this company.`,
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z
            .object({
              userId: z.string().openapi({
                example: "up_01j8h2k3m4n5p6q7r8s9t0u1v",
                description: "The Feeduro internal user profile ID (returned by `POST /v1/users/identify`).",
              }),
            })
            .openapi("AddCompanyMemberRequest"),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User was successfully added to the company.",
      content: {
        "application/json": {
          schema: z
            .object({
              data: z.object({
                companyId: z.string().openapi({ example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w" }),
                userId: z.string().openapi({ example: "up_01j8h2k3m4n5p6q7r8s9t0u1v" }),
              }),
            })
            .openapi("AddCompanyMemberResponse"),
        },
      },
    },
    404: Res404,
    409: {
      description: "User is already a member of this company.",
      content: { "application/json": { schema: ErrorSchema } },
    },
    ...sharedErrors,
  },
});

const removeMemberRoute = createRoute({
  method: "delete",
  path: "/:id/members/:memberId",
  tags: ["Companies"],
  summary: "Remove a member from a company",
  description: `Removes the link between a user profile and a company. This does **not** delete the user profile itself — only the association.

Returns **404** if the company doesn't exist or the user is not a member of this company.`,
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
      memberId: z.string().openapi({
        example: "up_01j8h2k3m4n5p6q7r8s9t0u1v",
        description: "The Feeduro internal user profile ID of the member to remove.",
      }),
    }),
  },
  responses: {
    200: {
      description: "Member was successfully removed from the company.",
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }).openapi("RemoveCompanyMemberResponse"),
        },
      },
    },
    404: Res404,
    ...sharedErrors,
  },
});

const listMembersRoute = createRoute({
  method: "get",
  path: "/:id/members",
  tags: ["Companies"],
  summary: "List company members",
  description: `Returns all user profiles currently associated with this company. User–company associations are created when you call \`POST /v1/users/identify\` with a \`companies\` array that includes this company's \`externalId\`.

The list is **not paginated** — all members are returned in a single response. If you expect very large member counts, consider filtering in your own system after fetching.`,
  security,
  request: {
    params: z.object({
      id: z.string().openapi({
        example: "cmp_01j9k2m3n4p5q6r7s8t9u0v1w",
        description: "The Feeduro internal company ID.",
      }),
    }),
  },
  responses: {
    200: {
      description: "Array of user profiles linked to this company. Empty array if the company has no members yet.",
      content: {
        "application/json": {
          schema: z
            .object({ data: z.array(CompanyMemberSchema) })
            .openapi("ListCompanyMembersResponse"),
        },
      },
    },
    404: Res404,
    ...sharedErrors,
  },
});

// ── Router ────────────────────────────────────────────────────────────────────

export const companiesRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const result = await listCompanies(getDb(c), c.get("organizationId"), c.req.valid("query"));
    return c.json(result as never, 200);
  })
  .openapi(upsertRoute, async (c) => {
    const id = await upsertCompany(getDb(c), c.get("organizationId"), c.req.valid("json"));
    return c.json({ data: { id } }, 200);
  })
  .openapi(getRoute, async (c) => {
    const company = await getCompany(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!company) return c.json(apiError("not_found").body, 404);
    return c.json({ data: company } as never, 200);
  })
  .openapi(updateRoute, async (c) => {
    const company = await updateCompany(
      getDb(c),
      c.get("organizationId"),
      c.req.valid("param").id,
      c.req.valid("json"),
    );
    if (!company) return c.json(apiError("not_found").body, 404);
    return c.json({ data: company } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteCompany(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  .openapi(listMembersRoute, async (c) => {
    const members = await listCompanyMembers(
      getDb(c),
      c.get("organizationId"),
      c.req.valid("param").id,
    );
    if (!members) return c.json(apiError("not_found").body, 404);
    return c.json({ data: members } as never, 200);
  })
  .openapi(addMemberRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { userId } = c.req.valid("json");
    const result = await addCompanyMember(getDb(c), c.get("organizationId"), id, userId);
    if ("error" in result) {
      if (result.error === "already_member") return c.json(apiError("already_member").body, 409);
      return c.json(apiError("not_found").body, 404);
    }
    return c.json({ data: { companyId: result.data.companyId, userId: result.data.userProfileId } }, 200);
  })
  .openapi(removeMemberRoute, async (c) => {
    const { id, memberId } = c.req.valid("param");
    const result = await removeCompanyMember(getDb(c), c.get("organizationId"), id, memberId);
    if ("error" in result) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });
