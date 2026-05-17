# Backend Rules

## Layer Responsibilities

### `queries.ts` — reads only
```ts
export async function getFeedbackById(db: DrizzleD1, id: string) {
  return db.select().from(feedback).where(eq(feedback.id, id)).get()
}
```
- Never mutates data
- Always accepts `db` as first arg (no global db imports in functions)
- Returns typed results — avoid `any`

### `mutations.ts` — writes only
```ts
export async function insertFeedback(db: DrizzleD1, data: NewFeedback) {
  return db.insert(feedback).values(data).returning().get()
}
```
- Never contains auth checks or business rules
- Pure data operations

### `permissions.ts` — authorization only
```ts
export function assertMemberOfOrg(user: User, orgId: string) {
  if (user.orgId !== orgId) throw new ForbiddenError()
}
```
- No DB calls — accept pre-loaded data
- Throw typed errors on failure
- Keep functions small and composable

### `service.ts` — orchestration
```ts
export async function createFeedbackAction(args: Route.ActionArgs) {
  const { request } = args
  const user = await requireUser(request)
  const body = await parseBody(request, CreateFeedbackSchema)
  assertMemberOfOrg(user, body.orgId)
  const post = await insertFeedback(db, { ...body, authorId: user.id })
  await notifySubscribers(post)
  return json({ post })
}
```
- Composes queries + mutations + permissions
- Handles side effects (emails, webhooks, external calls)
- This is the only layer routes should call

## Error Handling

Use typed errors:
```ts
class ForbiddenError extends Error { status = 403 }
class NotFoundError extends Error { status = 404 }
```

Catch at the route level or in a global error boundary — don't swallow errors in service functions.

## DB Access Pattern

Always pass `db` into functions rather than importing a singleton at module level.
Get `db` from the Cloudflare context in route loaders/actions, then thread it down.

```ts
// route
export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB
  return getFeedbackList(db, orgId)
}
```

## Validation

Use Zod at the service boundary (not inside queries/mutations):
```ts
// features/feedback/schemas/create-feedback.ts
export const CreateFeedbackSchema = z.object({
  title: z.string().min(1).max(200),
  boardId: z.string().ulid(),
})
```

Parse early, pass typed data down.
