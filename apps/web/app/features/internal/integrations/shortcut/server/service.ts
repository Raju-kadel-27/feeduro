import { requireOrganization } from "@features/auth/server/guards";
import { getBaseUrl } from "@utils/base-url";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import type { Db } from "@/db";
import { feedbackPosts, integrations, postExternalLinks } from "@/db/schema";
import {
  deleteIntegration,
  deletePostExternalLink,
  insertPostExternalLink,
  updateIntegrationSettings,
  upsertPostExternalLink,
} from "../../server/mutations";
import { requireAdminRole } from "../../server/permissions";
import { getIntegration, parseSettings } from "../../server/queries";
import {
  createShortcutStory,
  deleteShortcutWebhook,
  getShortcutMember,
  getShortcutStory,
  getShortcutWorkflows,
  registerShortcutWebhook,
} from "./client";
import { ShortcutActionSchema, type ShortcutSettings } from "./schemas";

// ─── Action (Shortcut uses API-token auth — no OAuth loader) ─────────────────

export async function handleShortcutAction(db: Db, request: Request) {
  const { session, organizationId } = await requireOrganization(db, request);
  await requireAdminRole(db, organizationId, session.user.id);

  const body = await request.json();
  const parsed = ShortcutActionSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  if (input.intent === "connect") {
    try {
      const sc = await getShortcutMember(input.apiToken);

      const webhookUrl = `${getBaseUrl()}/api/shortcut/webhook?orgId=${organizationId}`;
      const isLocal = webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1");

      const existing = await getIntegration(db, organizationId, "shortcut");
      const existingSettings = parseSettings<ShortcutSettings>(existing?.settings ?? null);

      let webhookId = existingSettings?.webhookId;
      let webhookSecret = existingSettings?.webhookSecret;

      if (!isLocal) {
        try {
          if (existingSettings?.webhookId) {
            await deleteShortcutWebhook(input.apiToken, existingSettings.webhookId).catch(() => {});
          }
          const hook = await registerShortcutWebhook(input.apiToken, webhookUrl);
          webhookId = hook.id;
          webhookSecret = hook.secret;
        } catch {
          /* Non-fatal — integration works without webhook */
        }
      }

      const settings: ShortcutSettings = {
        memberId: sc.id,
        memberName: sc.profile.name,
        mentionName: sc.profile.mention_name,
        defaultWorkflowId: existingSettings?.defaultWorkflowId,
        defaultWorkflowName: existingSettings?.defaultWorkflowName,
        defaultWorkflowStateId: existingSettings?.defaultWorkflowStateId,
        autoCreateStories: existingSettings?.autoCreateStories ?? false,
        statusMappings: existingSettings?.statusMappings,
        webhookId,
        webhookSecret,
      };

      await db
        .insert(integrations)
        .values({
          organizationId,
          provider: "shortcut",
          accessToken: input.apiToken,
          settings: JSON.stringify(settings),
        })
        .onConflictDoUpdate({
          target: [integrations.organizationId, integrations.provider],
          set: {
            accessToken: input.apiToken,
            settings: JSON.stringify(settings),
            updatedAt: new Date(),
          },
        });

      return data({ success: true, memberName: sc.profile.name });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Invalid API token" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "list_workflows") {
    const accessToken = (await getIntegration(db, organizationId, "shortcut"))?.accessToken;
    if (!accessToken) return data({ error: "Shortcut not connected" }, { status: 400 });
    try {
      const workflows = await getShortcutWorkflows(accessToken);
      return data({ workflows });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to fetch workflows" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "update_settings") {
    const integration = await getIntegration(db, organizationId, "shortcut");
    if (!integration) return data({ error: "No Shortcut integration found" }, { status: 400 });
    const settings =
      parseSettings<ShortcutSettings>(integration.settings) ?? ({} as ShortcutSettings);
    await updateIntegrationSettings(
      db,
      organizationId,
      "shortcut",
      {
        ...settings,
        defaultWorkflowId: input.defaultWorkflowId,
        defaultWorkflowName: input.defaultWorkflowName,
        defaultWorkflowStateId: input.defaultWorkflowStateId,
        autoCreateStories: input.autoCreateStories,
        statusMappings: input.statusMappings,
      },
      session.user.id,
    );
    return data({ success: true });
  }

  if (input.intent === "disconnect") {
    const integration = await getIntegration(db, organizationId, "shortcut");
    if (integration?.accessToken) {
      const settings = parseSettings<ShortcutSettings>(integration.settings);
      if (settings?.webhookId) {
        await deleteShortcutWebhook(integration.accessToken, settings.webhookId).catch(() => {});
      }
    }
    await deleteIntegration(db, organizationId, "shortcut");
    return data({ success: true });
  }

  if (input.intent === "create_story") {
    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "shortcut"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true, title: true, description: true },
      }),
    ]);

    if (!integration?.accessToken)
      return data({ error: "Shortcut not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    const settings = parseSettings<ShortcutSettings>(integration.settings);
    const workflowStateId = input.workflowStateId ?? settings?.defaultWorkflowStateId;
    if (!workflowStateId) {
      return data(
        { error: "No workflow state selected — set a default workflow in Shortcut settings" },
        { status: 400 },
      );
    }

    const existingLink = await db.query.postExternalLinks.findFirst({
      where: and(
        eq(postExternalLinks.postId, input.postId),
        eq(postExternalLinks.provider, "shortcut"),
      ),
      columns: { id: true },
    });
    if (existingLink)
      return data({ error: "Post already linked to a Shortcut story" }, { status: 400 });

    try {
      const description = post.description
        ? `${post.description}\n\n---\n*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`
        : `*Created from [Feeduro](https://feeduro.com) feedback #${post.id}*`;
      const story = await createShortcutStory(
        integration.accessToken,
        workflowStateId,
        post.title,
        description,
      );
      await insertPostExternalLink(db, {
        postId: input.postId,
        organizationId,
        provider: "shortcut",
        externalId: String(story.id),
        externalUrl: story.app_url,
        identifier: `SC-${story.id}`,
        externalTitle: story.name,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, story });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to create Shortcut story" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "link_story") {
    const numericId = Number(input.storyId.replace(/[^0-9]/g, ""));
    if (!numericId || Number.isNaN(numericId)) {
      return data(
        { error: "Invalid story ID — enter a numeric Shortcut story ID" },
        { status: 400 },
      );
    }

    const [integration, post] = await Promise.all([
      getIntegration(db, organizationId, "shortcut"),
      db.query.feedbackPosts.findFirst({
        where: and(
          eq(feedbackPosts.id, input.postId),
          eq(feedbackPosts.organizationId, organizationId),
        ),
        columns: { id: true },
      }),
    ]);

    if (!integration?.accessToken)
      return data({ error: "Shortcut not connected" }, { status: 400 });
    if (!post) return data({ error: "Post not found" }, { status: 404 });

    try {
      const story = await getShortcutStory(integration.accessToken, numericId);
      await upsertPostExternalLink(db, {
        postId: input.postId,
        organizationId,
        provider: "shortcut",
        externalId: String(story.id),
        externalUrl: story.app_url,
        identifier: `SC-${story.id}`,
        externalTitle: story.name,
        linkedByUserId: session.user.id,
      });
      return data({ success: true, story });
    } catch (err) {
      return data(
        { error: err instanceof Error ? err.message : "Failed to link Shortcut story" },
        { status: 400 },
      );
    }
  }

  if (input.intent === "unlink_story") {
    await deletePostExternalLink(db, input.postId, "shortcut", organizationId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}
