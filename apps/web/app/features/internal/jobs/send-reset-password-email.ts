import { renderResetPasswordEmail } from "@emails/reset-password";
import { sendEmail } from "@lib/mailer";

export async function sendResetPasswordEmail({
  userName,
  resetUrl,
  recipientEmail,
}: {
  userName: string;
  resetUrl: string;
  recipientEmail: string;
}) {
  const html = renderResetPasswordEmail({ userName, resetUrl });
  return sendEmail({
    to: recipientEmail,
    subject: "Reset your Feeduro password",
    html,
  });
}
