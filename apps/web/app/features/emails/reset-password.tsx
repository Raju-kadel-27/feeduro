interface Props {
  userName: string;
  resetUrl: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderResetPasswordEmail({ userName, resetUrl }: Props): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type">
    <meta name="x-apple-disable-message-reformatting">
  </head>
  <body style="background-color:#f4f4f5;margin:0;padding-top:2.5rem;padding-bottom:2.5rem;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Reset your Feeduro password</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <table align="center" width="100%" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:0.75rem;padding:2.5rem;border:1px solid #e4e4e7" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td>
                <p style="margin:0;margin-bottom:0.5rem;font-size:22px;font-weight:600;color:#18181b;line-height:1.25">Reset your password</p>
                <p style="margin:0;margin-bottom:1.75rem;font-size:0.875rem;color:#71717a;line-height:1.625">Hi <strong style="color:#3f3f46">${esc(userName)}</strong>, we received a request to reset your Feeduro account password. Click the button below to choose a new one.</p>
                <table style="margin-bottom:1.75rem" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td>
                      <a href="${esc(resetUrl)}" style="background-color:#18181b;color:#ffffff;font-size:0.875rem;font-weight:500;padding:0.625rem 1.5rem;border-radius:0.5rem;text-decoration:none;display:inline-block">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;margin-bottom:1.75rem;font-size:0.75rem;color:#a1a1aa;line-height:1.625">Or copy this link into your browser:<br><a href="${esc(resetUrl)}" style="color:#71717a;word-break:break-all">${esc(resetUrl)}</a></p>
                <hr style="margin-top:1.75rem;margin-bottom:1.75rem;border:none;border-top:1px solid #e4e4e7">
                <p style="margin:0;font-size:0.75rem;color:#a1a1aa">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
