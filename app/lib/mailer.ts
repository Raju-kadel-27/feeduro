import { getEnv } from "@utils/get-env";
import { createTransport } from "nodemailer";

const _transport: ReturnType<typeof createTransport> | null = null;

function getTransport() {
  if (_transport) return _transport;
  const server = getEnv().EMAIL_SERVER;
  return createTransport(server);
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const transport = getTransport();
  const from = getEnv().EMAIL_FROM;
  await transport.sendMail({ from, to, subject, html });
}
