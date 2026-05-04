import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { account } from "@/db/schema";

export interface GithubRepo {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  private: boolean;
  html_url: string;
}

export interface GithubIssue {
  number: number;
  html_url: string;
  title: string;
  state: string;
}

export async function getGithubAccessToken(userId: string): Promise<string | null> {
  const db = getDb();
  const row = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "github")),
    columns: { accessToken: true },
  });
  return row?.accessToken ?? null;
}

export async function listGithubRepos(accessToken: string): Promise<GithubRepo[]> {
  const results: GithubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );
    if (!res.ok) throw new Error(`GitHub repos fetch failed: ${res.status}`);
    const batch = (await res.json()) as GithubRepo[];
    results.push(...batch);
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
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? `GitHub issue creation failed: ${res.status}`);
  }
  return res.json() as Promise<GithubIssue>;
}

export async function getGithubIssueByUrl(
  accessToken: string,
  issueUrl: string,
): Promise<GithubIssue> {
  // Convert html URL to API URL: https://github.com/owner/repo/issues/123
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) throw new Error("Invalid GitHub issue URL");
  const [, owner, repo, number] = match;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub issue fetch failed: ${res.status}`);
  return res.json() as Promise<GithubIssue>;
}
