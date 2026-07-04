import { createTransport } from "nodemailer";

// biome-ignore lint/suspicious/noExplicitAny: lazy singleton — typed at usage via nodemailer's sendMail
let _transport: any = null;

function getTransport() {
  if (_transport) return _transport;
  const server = process.env.EMAIL_SERVER;
  if (!server) throw new Error("EMAIL_SERVER env var is not set");
  const transport = createTransport(server);
  _transport = transport;
  return transport;
}

export function getFrom() {
  return process.env.EMAIL_FROM ?? "Feeduro <noreply@feeduro.com>";
}

export async function sendEmailDev({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const transport = getTransport();
  await transport.sendMail({ from: getFrom(), to, subject, html });
}
