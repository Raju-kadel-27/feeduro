// Server-side helper that generates everything needed for the @feediyo/react
// `user` prop in a single call — both the widget HMAC signature and the
// clientToken that enables automatic login on the public board.

export interface FeediyoAuth {
  signature: string;
  clientToken: string;
}

interface TokenPayload {
  id: string;
  email: string;
  name?: string;
  sig: string;
}

async function hmacHex(input: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function encodeToken(payload: TokenPayload): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    return JSON.parse(atob(padded + padding)) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generate both the HMAC signature (for widget identity verification) and the
 * clientToken (for automatic login on the public board) in a single server call.
 *
 * @example
 * // In your Remix / React Router loader:
 * const auth = user
 *   ? await createFeediyoAuth(user.id, user.email, user.name, process.env.FEEDIYO_SIGNING_SECRET!)
 *   : null;
 *
 * // Then pass to the provider:
 * <FeediyoProvider projectId="..." user={auth ? { id: user.id, email: user.email, ...auth } : null}>
 */
export async function createFeediyoAuth(
  userId: string,
  email: string,
  name: string | undefined,
  signingSecret: string,
): Promise<FeediyoAuth> {
  const signature = await hmacHex(userId, signingSecret);
  const clientToken = encodeToken({
    id: userId,
    email,
    ...(name ? { name } : {}),
    sig: signature,
  });
  return { signature, clientToken };
}

/**
 * Validate a clientToken from the `_fdy` URL parameter on the public board.
 * Returns the decoded user identity if the embedded HMAC signature is valid.
 */
export async function validateClientToken(
  token: string,
  signingSecret: string,
): Promise<{ id: string; email: string; name?: string } | null> {
  const payload = decodeToken(token);
  if (!payload?.id || !payload.email || !payload.sig) return null;

  const expected = await hmacHex(payload.id, signingSecret);
  if (expected !== payload.sig) return null;

  return { id: payload.id, email: payload.email, name: payload.name };
}
