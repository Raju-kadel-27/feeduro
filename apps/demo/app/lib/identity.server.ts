// Port of apps/web/app/lib/identity-token.ts — same signing scheme.
// signature = HMAC-SHA256(userId, signingSecret) as hex
// clientToken = base64url({ id, email, name?, sig })

async function hmacHex(input: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlEncode(payload: unknown): string {
  return btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export interface IdentityToken {
  signature: string;
  clientToken: string;
}

export async function createIdentityToken(
  userId: string,
  email: string,
  name: string | undefined,
  signingSecret: string,
): Promise<IdentityToken> {
  const signature = await hmacHex(userId, signingSecret);
  const clientToken = b64urlEncode({ id: userId, email, ...(name ? { name } : {}), sig: signature });
  return { signature, clientToken };
}

// Smoke-test helper: sign + verify a round-trip
export async function verifySignature(userId: string, signature: string, signingSecret: string): Promise<boolean> {
  const expected = await hmacHex(userId, signingSecret);
  return expected === signature;
}
