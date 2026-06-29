import { renderInvitationEmail } from "@emails/invitation";
import { sendEmail } from "@lib/mailer";

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
  const html = renderInvitationEmail({
    inviterName,
    inviterEmail,
    workspaceName,
    role,
    acceptUrl,
  });

  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} invited you to ${workspaceName} on Feeduro`,
    html,
  });
}
