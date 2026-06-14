import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CopyButton } from "./shared";

const REVEAL_DURATION = 30;

async function callApi(body: object) {
  const res = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error as string) ?? "Request failed");
  return json;
}

export function SecretRevealRow({ endpointId }: { endpointId: string }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function hide() {
    setSecret(null);
    setCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function reveal() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await callApi({ intent: "reveal_secret", id: endpointId });
      setSecret(result.secret as string);
      setCountdown(REVEAL_DURATION);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            hide();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const isRevealed = secret !== null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-xs">
      <KeyRound size={12} className="shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground shrink-0">Signing secret</span>

      {isRevealed ? (
        <>
          <code
            aria-live="polite"
            className="font-mono text-foreground flex-1 break-all min-w-0"
          >
            {secret}
          </code>
          <CopyButton value={secret} />
          <span className="text-muted-foreground tabular-nums shrink-0">{countdown}s</span>
          <button
            type="button"
            onClick={hide}
            title="Hide secret"
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <EyeOff size={14} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 font-mono text-muted-foreground/40 tracking-widest select-none">
            ••••••••••••••••
          </span>
          <button
            type="button"
            onClick={reveal}
            disabled={loading}
            title="Reveal signing secret"
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
          >
            <Eye size={14} />
          </button>
        </>
      )}
    </div>
  );
}
