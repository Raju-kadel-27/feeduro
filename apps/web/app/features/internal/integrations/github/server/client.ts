import { type GithubIssue, GithubIssueSchema, type GithubRepo, GithubRepoSchema } from "./schemas";

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
      "User-Agent": "Feeduro/1.0",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    let message: string | undefined;
    try {
      const err = JSON.parse(rawText) as { message?: string };
      message = err.message;
    } catch {
      // non-JSON body (e.g. CDN/WAF HTML response)
    }
    console.error(`[github-client] ${res.status} on ${path}: message="${message}" body="${rawText.slice(0, 200)}"`);
    if (res.status === 401 || res.status === 403) {
      throw new Error(message ?? `GitHub returned ${res.status} — the stored token may be revoked or require SAML SSO authorization. Please disconnect and reconnect GitHub.`);
    }
    throw new Error(message ?? `GitHub API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getGithubUser(
  accessToken: string,
): Promise<{ login: string; avatarUrl: string }> {
  const user = await githubFetch<{ login: string; avatar_url: string }>(accessToken, "/user");
  return { login: user.login, avatarUrl: user.avatar_url };
}

export async function validateGithubToken(accessToken: string): Promise<void> {
  await getGithubUser(accessToken);
}

export async function listGithubRepos(accessToken: string): Promise<GithubRepo[]> {
  await getGithubUser(accessToken);
  const results: GithubRepo[] = [];
  let page = 1;
  while (true) {
    const batch = await githubFetch<unknown[]>(
      accessToken,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );
    const parsed: GithubRepo[] = [];
    for (const raw of batch) {
      const result = GithubRepoSchema.safeParse(raw);
      if (result.success) parsed.push(result.data);
    }
    results.push(...parsed);
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
