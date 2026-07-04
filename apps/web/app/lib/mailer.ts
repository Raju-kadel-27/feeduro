import { createTransport } from "nodemailer";

// TODO: replace with env vars before going to production
const _transport = createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "3b4ebb487b5d37",
    pass: "b77d416b6aab07",
  },
});

function getFrom() {
  return "Feeduro <noreply@feeduro.com>";
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  await _transport.sendMail({ from: getFrom(), to, subject, html });
}
