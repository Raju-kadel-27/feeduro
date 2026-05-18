import { createTransport } from "nodemailer";

const EMAIL_FROM = "'Feediyo' <support@feediyo.com>";
const EMAIL_SERVER = "smtp://feediyo:password@localhost:1025";

const _transport: ReturnType<typeof createTransport> | null = null;

function getTransport() {
  if (_transport) return _transport;
  return createTransport(EMAIL_SERVER);
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const transport = getTransport();
  await transport.sendMail({ from: EMAIL_FROM, to, subject, html });
}
