export interface SalesforceUserInfo {
  user_id: string;
  display_name: string;
  email: string;
  organization_id: string;
}

export async function getSalesforceUserInfo(
  idUrl: string,
  accessToken: string,
): Promise<SalesforceUserInfo | null> {
  try {
    const res = await fetch(idUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<SalesforceUserInfo>;
  } catch {
    return null;
  }
}

export async function createSalesforceOpportunity(
  accessToken: string,
  instanceUrl: string,
  name: string,
  description?: string,
): Promise<string | null> {
  try {
    const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const res = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Opportunity`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: name,
        StageName: "Prospecting",
        CloseDate: closeDate,
        Description: description ?? "",
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}
