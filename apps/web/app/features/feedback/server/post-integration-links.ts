import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { integrations, postExternalLinks } from "@/db/schema";

const LINK_COLUMNS = {
  identifier: true,
  externalTitle: true,
  externalStatus: true,
  externalUrl: true,
} as const;

type LinkRow =
  | {
      identifier: string | null;
      externalTitle: string | null;
      externalStatus: string | null;
      externalUrl: string | null;
    }
  | undefined;

function shapeLink(row: LinkRow) {
  if (!row) return null;
  return {
    identifier: row.identifier ?? null,
    externalTitle: row.externalTitle ?? null,
    externalStatus: row.externalStatus ?? null,
    externalUrl: row.externalUrl ?? null,
  };
}

export async function getPostIntegrationLinks(db: Db, organizationId: string, postId: string) {
  const [
    linearLinkRow,
    linearIntegration,
    jiraLinkRow,
    jiraIntegration,
    asanaLinkRow,
    asanaIntegration,
  ] = await Promise.all([
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "linear")),
      columns: LINK_COLUMNS,
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "linear"),
      ),
      columns: { id: true },
    }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "jira")),
      columns: LINK_COLUMNS,
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "jira"),
      ),
      columns: { id: true },
    }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, postId), eq(postExternalLinks.provider, "asana")),
      columns: LINK_COLUMNS,
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "asana"),
      ),
      columns: { id: true },
    }),
  ]);

  return {
    linearLink: shapeLink(linearLinkRow),
    linearConnected: !!linearIntegration,
    jiraLink: shapeLink(jiraLinkRow),
    jiraConnected: !!jiraIntegration,
    asanaLink: shapeLink(asanaLinkRow),
    asanaConnected: !!asanaIntegration,
  };
}
