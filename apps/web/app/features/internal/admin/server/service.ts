import { ADMIN_PAGE_SIZE } from "@features/internal/admin/constants";
import { count, desc, ilike, or } from "drizzle-orm";
import type { Db } from "@/db";
import { user } from "@/db/schema";

export { ADMIN_PAGE_SIZE };

export async function listUsers(
  db: Db,
  {
    search,
    limit = ADMIN_PAGE_SIZE,
    offset = 0,
  }: {
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const where = search
    ? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`))
    : undefined;

  const [users, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        role: user.role,
        banned: user.banned,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);

  return { users, total };
}
