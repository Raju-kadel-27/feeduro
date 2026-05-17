import { hmacHex } from "@lib/crypto";
import { decode, encode } from "@lib/base64url";

export interface IdentityToken {
  signature: string;
  clientToken: string;
}

interface TokenPayload {
  id: string;
  email: string;
  name?: string;
  sig: string;
}

export async function createIdentityToken(
  userId: string,
  email: string,
  name: string | undefined,
  signingSecret: string,
): Promise<IdentityToken> {
  const signature = await hmacHex(userId, signingSecret);
  const clientToken = encode<TokenPayload>({
    id: userId,
    email,
    ...(name ? { name } : {}),
    sig: signature,
  });
  return { signature, clientToken };
}

export async function verifyIdentityToken(
  token: string,
  signingSecret: string,
): Promise<{ id: string; email: string; name?: string } | null> {
  const payload = decode<TokenPayload>(token);
  if (!payload?.id || !payload.email || !payload.sig) return null;

  const expected = await hmacHex(payload.id, signingSecret);
  if (expected !== payload.sig) return null;

  return { id: payload.id, email: payload.email, name: payload.name };
}
