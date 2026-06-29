interface Props {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderInvitationEmail({
  inviterName,
  inviterEmail,
  workspaceName,
  role,
  acceptUrl,
}: Props): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type">
    <meta name="x-apple-disable-message-reformatting">
  </head>
  <body style="background-color:#f4f4f5;margin:0;padding-top:2.5rem;padding-bottom:2.5rem;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${esc(inviterName)} invited you to join ${esc(workspaceName)} on Feeduro</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <table align="center" width="100%" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:0.75rem;padding:2.5rem;border:1px solid #e4e4e7" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="margin:0;margin-bottom:0.5rem;font-size:22px;font-weight:600;color:#18181b;line-height:1.25">You've been invited to ${esc(workspaceName)}</p>
                <p style="margin:0;margin-bottom:1.75rem;font-size:0.875rem;color:#71717a;line-height:1.625">
                  <strong style="color:#3f3f46">${esc(inviterName)}</strong> <span style="color:#a1a1aa">(${esc(inviterEmail)})</span> invited you to join <strong style="color:#3f3f46">${esc(workspaceName)}</strong> as a <strong style="color:#3f3f46">${esc(role)}</strong>.
                </p>
                <table style="margin-bottom:1.75rem" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td>
                      <a href="${esc(acceptUrl)}" style="background-color:#18181b;color:#ffffff;font-size:0.875rem;font-weight:500;padding:0.625rem 1.5rem;border-radius:0.5rem;text-decoration:none;display:inline-block">Accept invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;margin-bottom:1.75rem;font-size:0.75rem;color:#a1a1aa;line-height:1.625">Or copy this link into your browser:<br><a href="${esc(acceptUrl)}" style="color:#71717a;word-break:break-all">${esc(acceptUrl)}</a></p>
                <hr style="margin-top:1.75rem;margin-bottom:1.75rem;border:none;border-top:1px solid #e4e4e7">
                <p style="margin:0;font-size:0.75rem;color:#a1a1aa">If you weren't expecting this invitation you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
