/**
 * Verifies X-Webhook-Signature: sha256=<hex> against the raw request body.
 * Matches the signing scheme used by the Feeduro webhook dispatcher.
 */
export async function verifyWebhookSignature(
  body: string,
  secret: string,
  signatureHeader: string,
): Promise<boolean> {
  const expected = signatureHeader.replace(/^sha256=/, "");
  if (!expected) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const actual = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return actual === expected;
}
