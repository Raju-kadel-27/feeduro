export function WebhooksDescription() {
  return (
    <div>
      <h2 className="text-base font-bold text-foreground">Webhooks</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Receive HTTP POST notifications when events happen in your workspace. Every delivery is signed with{" "}
        <code className="font-mono text-foreground">X-Webhook-Signature</code> so you can verify authenticity.
      </p>
    </div>
  );
}