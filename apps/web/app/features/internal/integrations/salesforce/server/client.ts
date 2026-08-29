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

export function parseSalesforceOpportunityInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/Opportunity\/([a-zA-Z0-9]+)\/view/);
  return urlMatch?.[1] ?? trimmed;
}

export async function getSalesforceOpportunityById(
  accessToken: string,
  instanceUrl: string,
  opportunityId: string,
): Promise<{ id: string; name: string; stageName: string; opportunityUrl: string }> {
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/sobjects/Opportunity/${opportunityId}?fields=Id,Name,StageName`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Salesforce opportunity ${opportunityId} not found`);
  const json = (await res.json()) as { Id: string; Name: string; StageName: string };
  return {
    id: json.Id,
    name: json.Name,
    stageName: json.StageName,
    opportunityUrl: `${instanceUrl}/lightning/r/Opportunity/${json.Id}/view`,
  };
}

export async function createSalesforceOpportunity(
  accessToken: string,
  instanceUrl: string,
  name: string,
  description?: string,
): Promise<string | null> {
  try {
    const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
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
