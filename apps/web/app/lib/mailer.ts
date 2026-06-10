import { createTransport } from "nodemailer";

let _transport: ReturnType<typeof createTransport> | null = null;

function getTransport() {
  if (_transport) return _transport;
  const server = process.env.EMAIL_SERVER;
  if (!server) throw new Error("EMAIL_SERVER env var is not set");
  _transport = createTransport(server);
  return _transport;
}

function getFrom() {
  return process.env.EMAIL_FROM ?? "Feeduro <noreply@feeduro.com>";
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const transport = getTransport();
  await transport.sendMail({ from: getFrom(), to, subject, html });
}
