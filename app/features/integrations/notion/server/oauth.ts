export function notionAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user",
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

export async function exchangeNotionCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<{ accessToken: string; workspaceId: string; workspaceName: string }> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    workspace_id?: string;
    workspace_name?: string;
    error?: string;
  };
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error ?? "Notion token exchange failed");
  }
  return {
    accessToken: data.access_token,
    workspaceId: data.workspace_id ?? "",
    workspaceName: data.workspace_name ?? "Notion Workspace",
  };
}
