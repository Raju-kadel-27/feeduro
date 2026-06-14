import { useFetcher } from "react-router";

export function AffiliateJoinCard() {
  const fetcher = useFetcher();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Affiliate Program</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Refer teams to Feeduro. Earn recurring commissions, no cap.
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed p-10 text-center space-y-6">
        <div>
          <p className="text-6xl font-black tracking-tight">20%</p>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto leading-relaxed">
            Commission for 12 months on every team that subscribes through your link.
            Paid monthly, no minimum activity required.
          </p>
        </div>
        <div className="flex justify-center gap-8 text-sm">
          <div className="text-center">
            <p className="font-bold">
              $2.40<span className="text-muted-foreground font-normal">/mo</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">
              Starter
            </p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="font-bold">
              $3.60<span className="text-muted-foreground font-normal">/mo</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">Pro</p>
          </div>
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="join" />
          <button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="px-6 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            {fetcher.state !== "idle" ? "Joining…" : "Get my referral link →"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}
