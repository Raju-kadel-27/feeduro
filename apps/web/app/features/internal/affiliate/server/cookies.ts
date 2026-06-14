// Robust cookie parser — handles values that contain "=" (e.g. base64 tokens).
// A naïve split("=")[1] truncates anything after the first "=" in the value.
export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return [pair.trim(), ""];
      return [pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim()];
    }),
  );
}

export function getAffiliateCodeFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies["aff_ref"] ?? null;
}

// Builds the Set-Cookie header value that expires / clears a cookie.
export function clearCookieHeader(name: string, isProduction: boolean): string {
  const secure = isProduction ? "; Secure" : "";
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}
