export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
}

export interface ZendeskAccount {
  name: string;
  subdomain: string;
}

export async function getZendeskCurrentUser(
  accessToken: string,
  subdomain: string,
): Promise<ZendeskUser | null> {
  try {
    const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user: ZendeskUser };
    return json.user;
  } catch {
    return null;
  }
}

export interface ZendeskTicket {
  id: number;
  url: string;
  subject: string;
  status: string;
}

export function parseZendeskTicketInput(input: string): string {
  const trimmed = input.replace(/^#/, "").trim();
  const urlMatch = trimmed.match(/\/tickets\/(\d+)/);
  return urlMatch?.[1] ?? trimmed;
}

export async function getZendeskTicketById(
  accessToken: string,
  subdomain: string,
  ticketId: string,
): Promise<ZendeskTicket> {
  const res = await fetch(
    `https://${subdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Zendesk ticket ${ticketId} not found`);
  const json = (await res.json()) as { ticket: ZendeskTicket };
  const t = json.ticket;
  return {
    id: t.id,
    url: `https://${subdomain}.zendesk.com/agent/tickets/${t.id}`,
    subject: t.subject,
    status: t.status,
  };
}

export async function createZendeskTicket(
  accessToken: string,
  subdomain: string,
  subject: string,
  description: string,
): Promise<ZendeskTicket> {
  const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticket: { subject, comment: { body: description }, type: "task" },
    }),
  });
  if (!res.ok) throw new Error("Failed to create Zendesk ticket");
  const json = (await res.json()) as { ticket: ZendeskTicket };
  return json.ticket;
}
