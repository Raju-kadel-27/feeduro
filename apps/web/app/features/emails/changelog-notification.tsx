interface Props {
  orgName: string;
  changelogTitle: string;
  excerpt: string;
  changelogUrl: string;
  unsubscribeUrl: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderChangelogNotificationEmail({
  orgName,
  changelogTitle,
  excerpt,
  changelogUrl,
  unsubscribeUrl,
}: Props): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type">
    <meta name="x-apple-disable-message-reformatting">
  </head>
  <body style="background-color:#f4f4f5;margin:0;padding-top:2.5rem;padding-bottom:2.5rem;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${esc(orgName)} published a new update: ${esc(changelogTitle)}</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <table align="center" width="100%" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:0.75rem;padding:2.5rem;border:1px solid #e4e4e7" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="margin:0;margin-bottom:0.25rem;font-size:0.75rem;font-weight:500;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.025em">${esc(orgName)} · New Update</p>
                <p style="margin:0;margin-bottom:1rem;font-size:22px;font-weight:600;color:#18181b;line-height:1.25">${esc(changelogTitle)}</p>
                ${excerpt ? `<p style="margin:0;margin-bottom:1.75rem;font-size:0.875rem;color:#52525b;line-height:1.625">${esc(excerpt)}</p>` : ""}
                <table style="margin-bottom:1.75rem" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td>
                      <a href="${esc(changelogUrl)}" style="background-color:#18181b;color:#ffffff;font-size:0.875rem;font-weight:500;padding:0.625rem 1.5rem;border-radius:0.5rem;text-decoration:none;display:inline-block">Read the full update</a>
                    </td>
                  </tr>
                </table>
                <hr style="margin-top:1.75rem;margin-bottom:1.75rem;border:none;border-top:1px solid #e4e4e7">
                <p style="margin:0;font-size:0.75rem;color:#a1a1aa">You received this because you subscribed to changelog updates from <strong style="color:#71717a">${esc(orgName)}</strong>. <a href="${esc(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline">Unsubscribe</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
