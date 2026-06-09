import type { Check } from "./env.server";

async function hmacSignature(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}`;
}

export async function runWebhookChecks(secret: string, request: Request): Promise<Check[]> {
  const checks: Check[] = [];

  if (!secret) {
    const skip = { status: "skip" as const, detail: "Skipped — FEEDIYO_WEBHOOK_SECRET not set" };
    return [
      { id: "wh-sig-valid",   label: "Valid webhook signature",    ...skip },
      { id: "wh-sig-tamper",  label: "Tampered signature → reject",...skip },
      { id: "wh-sig-missing", label: "Missing signature → reject",  ...skip },
      { id: "wh-e2e",         label: "Webhook e2e (POST /webhooks)",...skip },
    ];
  }

  const testPayload = JSON.stringify({ event: "smoke.test", ts: "2026-01-01T00:00:00Z" });
  const validSig = await hmacSignature(testPayload, secret).catch(e => { console.error("[smoke] hmac sign error:", e); return ""; });

  // Valid signature check (compute + verify locally, no HTTP needed)
  if (validSig) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const hexPart = validSig.replace("sha256=", "");
    const sigBytes = Uint8Array.from(hexPart.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const ok = await crypto.subtle.verify("HMAC", keyMat, sigBytes, enc.encode(testPayload)).catch(() => false);
    checks.push({ id: "wh-sig-valid", label: "Valid webhook signature", status: ok ? "pass" : "fail", detail: ok ? "sha256=<hex> verified ✓" : "Signature verification mismatch" });
  } else {
    checks.push({ id: "wh-sig-valid", label: "Valid webhook signature", status: "fail", detail: "HMAC sign failed" });
  }

  // Tampered signature — flip one byte of the hex
  const tamperedSig = validSig ? `sha256=${validSig.slice(7, 9) === "ff" ? "00" : "ff"}${validSig.slice(9)}` : "";
  const enc2 = new TextEncoder();
  const keyMat2 = await crypto.subtle.importKey("raw", enc2.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const hexPart2 = tamperedSig.replace("sha256=", "");
  const sigBytes2 = Uint8Array.from(hexPart2.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const tamperedOk = await crypto.subtle.verify("HMAC", keyMat2, sigBytes2, enc2.encode(testPayload)).catch(() => false);
  checks.push({ id: "wh-sig-tamper", label: "Tampered signature → reject", status: tamperedOk ? "fail" : "pass", detail: tamperedOk ? "BUG: tampered sig passed!" : "Tampered sig correctly rejected ✓" });

  // Missing signature check — empty string should not verify
  const enc3 = new TextEncoder();
  const keyMat3 = await crypto.subtle.importKey("raw", enc3.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const missingOk = await crypto.subtle.verify("HMAC", keyMat3, new Uint8Array(32), enc3.encode(testPayload)).catch(() => false);
  checks.push({ id: "wh-sig-missing", label: "Missing signature → reject", status: missingOk ? "fail" : "pass", detail: missingOk ? "BUG: zero-sig passed!" : "Zero-sig correctly rejected ✓" });

  // E2E: POST to own /webhooks endpoint with valid signature
  const webhookUrl = new URL("/webhooks", request.url).href;
  const t0 = Date.now();
  const e2eRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-feediyo-signature": validSig },
    body: testPayload,
  }).then(r => ({ status: r.status, durationMs: Date.now() - t0 })).catch(e => ({ status: 0, durationMs: Date.now() - t0, err: String(e) }));

  const e2ePass = e2eRes.status === 200 || e2eRes.status === 204;
  checks.push({
    id: "wh-e2e",
    label: "Webhook e2e (POST /webhooks)",
    status: e2ePass ? "pass" : "warn",
    durationMs: e2eRes.durationMs,
    detail: e2ePass ? `POST /webhooks → ${e2eRes.status} ✓` : `POST /webhooks → ${"err" in e2eRes ? e2eRes.err : e2eRes.status} (expected 200/204)`,
  });

  console.log(`[smoke] webhooks: ${checks.filter(c => c.status === "pass").length}/${checks.length} passed`);
  return checks;
}
