import { TokenExpiredError } from "@services/oauth/flow.server";
import type {
  LinearIssue,
  LinearState,
  LinearTeam,
  LinearWebhookResult,
  LinearWorkspace,
} from "./schemas";

async function linearGql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new TokenExpiredError();
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { type?: string } }[];
  };
  if (json.errors?.length) {
    if (json.errors[0].extensions?.type === "AUTHENTICATION_ERROR") throw new TokenExpiredError();
    throw new Error(json.errors[0].message);
  }
  if (!json.data) throw new Error("Empty response from Linear");
  return json.data;
}

export async function getLinearWorkspace(accessToken: string): Promise<LinearWorkspace> {
  const d = await linearGql<{ viewer: { organization: LinearWorkspace } }>(
    accessToken,
    `query { viewer { organization { id name } } }`,
  );
  return d.viewer.organization;
}

export async function getLinearTeams(accessToken: string): Promise<LinearTeam[]> {
  const d = await linearGql<{ teams: { nodes: LinearTeam[] } }>(
    accessToken,
    `query { teams { nodes { id name key } } }`,
  );
  return d.teams.nodes;
}

export async function getLinearTeamStates(
  accessToken: string,
  teamId: string,
): Promise<LinearState[]> {
  const d = await linearGql<{ team: { states: { nodes: LinearState[] } } }>(
    accessToken,
    `query TeamStates($teamId: String!) { team(id: $teamId) { states { nodes { id name type color } } } }`,
    { teamId },
  );
  return d.team.states.nodes;
}

export async function createLinearIssue(
  accessToken: string,
  teamId: string,
  title: string,
  description: string,
): Promise<LinearIssue> {
  const d = await linearGql<{ issueCreate: { issue: LinearIssue } }>(
    accessToken,
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { issue { id identifier url title state { name } } }
    }`,
    { input: { teamId, title, description } },
  );
  return d.issueCreate.issue;
}

export async function searchLinearIssues(
  accessToken: string,
  query: string,
  teamId?: string,
): Promise<LinearIssue[]> {
  const d = await linearGql<{ issues: { nodes: LinearIssue[] } }>(
    accessToken,
    `query SearchIssues($filter: IssueFilter) {
      issues(filter: $filter, first: 10, orderBy: updatedAt) {
        nodes { id identifier url title state { name } }
      }
    }`,
    { filter: { title: { containsIgnoreCase: query }, ...(teamId ? { team: { id: { eq: teamId } } } : {}) } },
  );
  return d.issues.nodes;
}

// Extracts the issue identifier from a Linear URL (linear.app/org/issue/ENG-123) or returns unchanged.
export function parseLinearInput(input: string): string {
  const match = input.trim().match(/linear\.app\/[^/]+\/issue\/([A-Z][A-Z0-9_]*-\d+)/i);
  return match?.[1]?.toUpperCase() ?? input.trim();
}

export async function getLinearIssueById(
  accessToken: string,
  issueId: string,
): Promise<LinearIssue> {
  const d = await linearGql<{ issue: LinearIssue }>(
    accessToken,
    `query GetIssue($id: String!) { issue(id: $id) { id identifier url title state { name } } }`,
    { id: issueId },
  );
  return d.issue;
}

export async function registerLinearWebhook(
  accessToken: string,
  webhookUrl: string,
  teamId: string,
): Promise<LinearWebhookResult> {
  const d = await linearGql<{ webhookCreate: { success: boolean; webhook: LinearWebhookResult } }>(
    accessToken,
    `mutation WebhookCreate($input: WebhookCreateInput!) {
      webhookCreate(input: $input) { success webhook { id secret } }
    }`,
    { input: { url: webhookUrl, resourceTypes: ["Issue"], teamId } },
  );
  if (!d.webhookCreate.success) throw new Error("Failed to register Linear webhook");
  return d.webhookCreate.webhook;
}

export async function updateLinearIssueState(accessToken: string, issueId: string, stateId: string): Promise<void> {
  await linearGql(accessToken, `mutation UpdateState($id: String!, $stateId: String!) { issueUpdate(id: $id, input: { stateId: $stateId }) { success } }`, { id: issueId, stateId });
}

export async function deleteLinearWebhook(accessToken: string, webhookId: string): Promise<void> {
  await linearGql(
    accessToken,
    `mutation WebhookDelete($id: String!) { webhookDelete(id: $id) { success } }`,
    { id: webhookId },
  );
}

export async function verifyLinearWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === signature;
  } catch {
    return false;
  }
}
