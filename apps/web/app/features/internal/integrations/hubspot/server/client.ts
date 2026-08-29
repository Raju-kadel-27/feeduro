export interface HubSpotPortalInfo {
  portalId: string;
  hubDomain?: string;
  user?: string;
}

export async function getHubSpotPortalInfo(accessToken: string): Promise<HubSpotPortalInfo | null> {
  try {
    const res = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      hub_id?: number;
      hub_domain?: string;
      user?: string;
    };
    if (!json.hub_id) return null;
    return {
      portalId: String(json.hub_id),
      hubDomain: json.hub_domain,
      user: json.user,
    };
  } catch {
    return null;
  }
}

export function parseHubSpotDealInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/deal\/(\d+)/);
  return urlMatch?.[1] ?? trimmed;
}

export async function getHubSpotDealById(
  accessToken: string,
  dealId: string,
  portalId?: string,
): Promise<{ id: string; dealname: string; dealstage: string; dealUrl: string }> {
  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`HubSpot deal ${dealId} not found`);
  const json = (await res.json()) as { id: string; properties: { dealname?: string; dealstage?: string } };
  return {
    id: json.id,
    dealname: json.properties.dealname ?? `Deal ${json.id}`,
    dealstage: json.properties.dealstage ?? "",
    dealUrl: portalId
      ? `https://app.hubspot.com/contacts/${portalId}/deal/${json.id}`
      : `https://app.hubspot.com/crm/deals/${json.id}`,
  };
}

export async function createHubSpotDeal(
  accessToken: string,
  dealName: string,
  description?: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          dealname: dealName,
          dealstage: "appointmentscheduled",
          pipeline: "default",
          description: description ?? "",
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}
