const MAILTRAP_SEND_URL = "https://send.api.mailtrap.io/api/send";

export async function sendEmailProd({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.MAILTRAP_API_KEY;
  if (!apiKey) throw new Error("MAILTRAP_API_KEY env var is not set");

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const res = await fetch(MAILTRAP_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: "noreply@feeduro.com", name: "Feeduro" },
      to: recipients,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mailtrap send failed (${res.status}): ${body}`);
  }
}
