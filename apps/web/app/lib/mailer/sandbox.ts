import { MailtrapClient } from "mailtrap";

// TODO: move to env var before production
const client = new MailtrapClient({
  token: "267ecfa00157b245a63e402feda3edf7",
  sandbox: true,
  testInboxId: 4757242,
});

export async function sendEmailSandbox({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  await client.send({
    from: { email: "noreply@feeduro.com", name: "Feeduro" },
    to: recipients,
    subject,
    html,
  });
}
