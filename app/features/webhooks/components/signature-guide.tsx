export function SignatureGuide() {
  return (
    <section className="rounded-lg border border-border bg-muted/10 px-6 py-5 space-y-4 shadow-md">
      <p className="text-sm font-medium text-foreground">
        Verifying webhook signatures
      </p>
      <p className="text-sm text-muted-foreground">
        Every request includes a{" "}
        <code className="font-mono text-foreground text-xs">
          X-Webhook-Signature
        </code>{" "}
        header with value{" "}
        <code className="font-mono text-foreground text-xs">
          sha256=&lt;hex&gt;
        </code>
        . Compute HMAC-SHA256 of the raw request body with your signing secret
        and compare.
      </p>
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <code className="text-xs font-mono text-muted-foreground whitespace-pre">{`// Node.js
const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
const expected = \`sha256=\${sig}\`;

// Edge / browser (Web Crypto)
const key = await crypto.subtle.importKey('raw', enc.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const buf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
const expected = 'sha256=' + [...new Uint8Array(buf)]
  .map(b => b.toString(16).padStart(2,'0')).join('');`}</code>
      </div>
    </section>
  );
}
