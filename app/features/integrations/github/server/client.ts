import { GithubIssueSchema, GithubRepoSchema, type GithubIssue, type GithubRepo } from "./schemas";

const BASE = "https://api.github.com";

async function githubFetch<T>(
  accessToken: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `GitHub API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listGithubRepos(accessToken: string): Promise<GithubRepo[]> {
  const results: GithubRepo[] = [];
  let page = 1;
  while (true) {
    const batch = await githubFetch<unknown[]>(
      accessToken,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );
    results.push(...batch.map((r) => GithubRepoSchema.parse(r)));
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

export async function createGithubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
): Promise<GithubIssue> {
  const result = await githubFetch<unknown>(accessToken, `/repos/${owner}/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
  return GithubIssueSchema.parse(result);
}

export async function getGithubIssueByUrl(
  accessToken: string,
  issueUrl: string,
): Promise<GithubIssue> {
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) throw new Error("Invalid GitHub issue URL");
  const [, owner, repo, number] = match;
  const result = await githubFetch<unknown>(
    accessToken,
    `/repos/${owner}/${repo}/issues/${number}`,
  );
  return GithubIssueSchema.parse(result);
}

export async function registerGithubWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string,
): Promise<{ id: number }> {
  return githubFetch<{ id: number }>(accessToken, `/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    body: JSON.stringify({
      name: "web",
      events: ["issues"],
      active: true,
      config: { url: webhookUrl, content_type: "json", secret, insecure_ssl: "0" },
    }),
  });
}

export async function deleteGithubWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  hookId: string,
): Promise<void> {
  await githubFetch<unknown>(accessToken, `/repos/${owner}/${repo}/hooks/${hookId}`, {
    method: "DELETE",
  });
}

export async function verifyGithubWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  try {
    const expected = signatureHeader.replace(/^sha256=/, "");
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
    return hex === expected;
  } catch {
    return false;
  }
}
