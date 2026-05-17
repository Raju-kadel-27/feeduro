import { InvitationEmail } from "@emails/invitation";
import { sendEmail } from "@lib/mailer";
import { render } from "@react-email/render";

interface SendInvitationEmailProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
  recipientEmail: string;
}

export async function sendInvitationEmail({
  inviterName,
  inviterEmail,
  workspaceName,
  role,
  acceptUrl,
  recipientEmail,
}: SendInvitationEmailProps) {
  const html = await render(
    InvitationEmail({
      inviterName,
      inviterEmail,
      workspaceName,
      role,
      acceptUrl,
    }),
  );

  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} invited you to ${workspaceName} on Feediyo`,
    html,
  });
}
