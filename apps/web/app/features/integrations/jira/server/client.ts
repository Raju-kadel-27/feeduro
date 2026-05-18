import type {
  JiraCloudResource,
  JiraIssueResult,
  JiraProject,
  JiraStatus,
  JiraWebhookRegistration,
} from "./schemas";

function jiraApiBase(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}

async function jiraFetch<T>(accessToken: string, url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Jira API error: ${res.status}`;
    try {
      const err = (await res.json()) as {
        errorMessages?: string[];
        errors?: Record<string, string>;
      };
      if (err.errorMessages?.length)
        message = `Jira API error: ${res.status} — ${err.errorMessages[0]}`;
      else if (err.errors && Object.keys(err.errors).length)
        message = `Jira API error: ${res.status} — ${Object.values(err.errors)[0]}`;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getJiraCloudResources(accessToken: string): Promise<JiraCloudResource[]> {
  return jiraFetch<JiraCloudResource[]>(
    accessToken,
    "https://api.atlassian.com/oauth/token/accessible-resources",
  );
}

export async function getJiraProjects(
  accessToken: string,
  cloudId: string,
): Promise<JiraProject[]> {
  const d = await jiraFetch<{ values: JiraProject[] }>(
    accessToken,
    `${jiraApiBase(cloudId)}/project/search?maxResults=50&orderBy=name`,
  );
  return d.values;
}

export async function getJiraProjectStatuses(
  accessToken: string,
  cloudId: string,
  projectKey: string,
): Promise<JiraStatus[]> {
  type IssueTypeStatuses = { statuses: JiraStatus[] };
  const d = await jiraFetch<IssueTypeStatuses[]>(
    accessToken,
    `${jiraApiBase(cloudId)}/project/${projectKey}/statuses`,
  );
  const seen = new Set<string>();
  const statuses: JiraStatus[] = [];
  for (const issueType of d) {
    for (const s of issueType.statuses) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        statuses.push(s);
      }
    }
  }
  return statuses;
}

function textToAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : [],
  };
}

export async function createJiraIssue(
  accessToken: string,
  cloudId: string,
  cloudUrl: string,
  projectKey: string,
  summary: string,
  description: string,
): Promise<JiraIssueResult> {
  const created = await jiraFetch<{ id: string; key: string }>(
    accessToken,
    `${jiraApiBase(cloudId)}/issue`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description: textToAdf(description),
          issuetype: { name: "Task" },
        },
      }),
    },
  );
  const issue = await jiraFetch<{
    id: string;
    key: string;
    fields: { summary: string; status: { name: string } };
  }>(accessToken, `${jiraApiBase(cloudId)}/issue/${created.key}?fields=summary,status`);
  return {
    id: issue.id,
    key: issue.key,
    url: `${cloudUrl}/browse/${issue.key}`,
    summary: issue.fields.summary,
    statusName: issue.fields.status.name,
  };
}

export async function getJiraIssueByKey(
  accessToken: string,
  cloudId: string,
  cloudUrl: string,
  issueKeyOrId: string,
): Promise<JiraIssueResult> {
  const issue = await jiraFetch<{
    id: string;
    key: string;
    fields: { summary: string; status: { name: string } };
  }>(accessToken, `${jiraApiBase(cloudId)}/issue/${issueKeyOrId}?fields=summary,status`);
  return {
    id: issue.id,
    key: issue.key,
    url: `${cloudUrl}/browse/${issue.key}`,
    summary: issue.fields.summary,
    statusName: issue.fields.status.name,
  };
}

export async function registerJiraWebhook(
  accessToken: string,
  cloudId: string,
  webhookUrl: string,
): Promise<JiraWebhookRegistration> {
  const d = await jiraFetch<{
    webhookRegistrationResult: Array<{
      createdWebhookId?: number;
      expirationDate?: string;
      errors?: string[];
    }>;
  }>(accessToken, `${jiraApiBase(cloudId)}/webhook`, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      webhooks: [{ events: ["jira:issue_created", "jira:issue_updated", "jira:issue_deleted"] }],
    }),
  });
  const ids: number[] = [];
  let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  for (const r of d.webhookRegistrationResult) {
    if (r.createdWebhookId) {
      ids.push(r.createdWebhookId);
      if (r.expirationDate) expiresAt = r.expirationDate;
    }
  }
  return { ids, expiresAt };
}

export async function deleteJiraWebhooks(
  accessToken: string,
  cloudId: string,
  webhookIds: number[],
): Promise<void> {
  if (!webhookIds.length) return;
  await jiraFetch(accessToken, `${jiraApiBase(cloudId)}/webhook`, {
    method: "DELETE",
    body: JSON.stringify({ webhookIds }),
  });
}
