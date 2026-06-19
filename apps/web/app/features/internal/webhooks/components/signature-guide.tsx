import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { CodeBlock } from "./code-block";

const EXAMPLES = [
  {
    id: "node",
    label: "Node.js",
    code: `import { createHmac, timingSafeEqual } from 'crypto';

const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
const expected = Buffer.from(\`sha256=\${sig}\`);
const received = Buffer.from(req.headers['x-webhook-signature'] ?? '');
if (!timingSafeEqual(expected, received)) {
  return res.status(401).end();
}`,
  },
  {
    id: "edge",
    label: "Edge / Browser",
    code: `const enc = new TextEncoder();
const key = await crypto.subtle.importKey(
  'raw', enc.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const buf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
const expected = 'sha256=' + [...new Uint8Array(buf)]
  .map(b => b.toString(16).padStart(2, '0')).join('');`,
  },
  {
    id: "python",
    label: "Python",
    code: `import hmac, hashlib

digest = hmac.new(secret.encode(), msg=raw_body, digestmod=hashlib.sha256).hexdigest()
expected = f"sha256={digest}"
received = request.headers.get("X-Webhook-Signature", "")
if not hmac.compare_digest(expected, received):
    return HttpResponse(status=401)`,
  },
  {
    id: "rails",
    label: "Ruby on Rails",
    code: `require 'openssl'

digest  = OpenSSL::HMAC.hexdigest('SHA256', secret, request.raw_post)
expected = "sha256=#{digest}"
received = request.headers['X-Webhook-Signature'].to_s
unless ActiveSupport::SecurityUtils.secure_compare(expected, received)
  head :unauthorized
end`,
  },
] as const;

export function SignatureGuide() {
  return (
    <section className="rounded-lg border border-border bg-muted/10 px-6 py-5 space-y-4 shadow-md">
      <p className="text-sm font-medium text-foreground">Verifying webhook signatures</p>
      <p className="text-sm text-muted-foreground">
        Every request includes a{" "}
        <code className="font-mono text-foreground text-xs">X-Webhook-Signature</code> header with
        value <code className="font-mono text-foreground text-xs">sha256=&lt;hex&gt;</code>. Compute
        HMAC-SHA256 of the raw request body with your signing secret and compare.
      </p>
      <Tabs defaultValue="node">
        <TabsList>
          {EXAMPLES.map((ex) => (
            <TabsTrigger key={ex.id} value={ex.id}>
              {ex.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {EXAMPLES.map((ex) => (
          <TabsContent key={ex.id} value={ex.id} className="mt-3">
            <CodeBlock code={ex.code} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
