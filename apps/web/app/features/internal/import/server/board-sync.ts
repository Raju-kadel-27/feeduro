import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { feedbackBoards } from "@/db/schema";
import type { CannyBoard } from "../schemas/canny";
import { slugifyBoardName } from "./canny-adapter";

// Resolves or creates a feedbackBoard for each Canny board.
// Returns Map<cannyBoardId, ourBoardId>.
export async function syncBoards(
  db: Db,
  organizationId: string,
  cannyBoards: CannyBoard[],
  createdBy: string,
): Promise<Map<string, string>> {
  const boardMap = new Map<string, string>();

  for (const cannyBoard of cannyBoards) {
    const slug = slugifyBoardName(cannyBoard.name);

    const existing = await db.query.feedbackBoards.findFirst({
      where: and(
        eq(feedbackBoards.organizationId, organizationId),
        eq(feedbackBoards.slug, slug),
      ),
      columns: { id: true },
    });

    if (existing) {
      boardMap.set(cannyBoard.id, existing.id);
      continue;
    }

    const [row] = await db
      .insert(feedbackBoards)
      .values({ organizationId, name: cannyBoard.name, slug, createdBy })
      .returning({ id: feedbackBoards.id });
    boardMap.set(cannyBoard.id, row.id);
  }

  return boardMap;
}
