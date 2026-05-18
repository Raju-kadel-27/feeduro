import { ResetPasswordEmail } from "@emails/reset-password";
import { sendEmail } from "@lib/mailer";
import { render } from "@react-email/render";

export async function sendResetPasswordEmail({
  userName,
  resetUrl,
  recipientEmail,
}: {
  userName: string;
  resetUrl: string;
  recipientEmail: string;
}) {
  const html = await render(ResetPasswordEmail({ userName, resetUrl }));
  return sendEmail({
    to: recipientEmail,
    subject: "Reset your Feediyo password",
    html,
  });
}
