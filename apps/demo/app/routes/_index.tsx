import { useEffect } from "react";
import { data } from "react-router";
import { useFeediyo } from "@feediyo/react";
import { createIdentityToken } from "@lib/identity.server";
import { getEnv } from "@lib/env.server";
import type { Route } from "./+types/_index";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Widget · Feediyo Demo" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = getEnv(context);
  const userId = "demo-user-1";
  const hasSigningSecret = env.FEEDIYO_WIDGET_SIGNING_SECRET.length > 0;

  const identity = hasSigningSecret
    ? await createIdentityToken(userId, "demo@example.com", "Demo User", env.FEEDIYO_WIDGET_SIGNING_SECRET)
    : null;

  return data({ userId, identity, boardPublicUrl: env.FEEDIYO_BOARD_PUBLIC_URL, hasSigningSecret });
}

function Section({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 mb-4 text-sm text-gray-600">{description}</p>
      {children}
    </div>
  );
}

function Btn({ onClick, variant = "primary", children }: { onClick: () => void; variant?: "primary" | "outline"; children: React.ReactNode }) {
  const base = "rounded-lg px-4 py-2 text-sm font-medium transition-colors";
  return (
    <button type="button" onClick={onClick} className={variant === "primary" ? `${base} bg-indigo-600 text-white hover:bg-indigo-700` : `${base} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
      {children}
    </button>
  );
}

export default function WidgetDemo({ loaderData }: Route.ComponentProps) {
  const { userId, identity, boardPublicUrl, hasSigningSecret } = loaderData;
  const { showWidget, hideWidget, setTheme, identify } = useFeediyo();

  useEffect(() => {
    if (identity) {
      identify({ id: userId, email: "demo@example.com", name: "Demo User", signature: identity.signature, clientToken: identity.clientToken });
    }
  }, [userId, identity, identify]);

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Floating Widget</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${hasSigningSecret ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${hasSigningSecret ? "bg-emerald-500" : "bg-amber-500"}`} />
            {hasSigningSecret ? "Identity verified" : "Anonymous mode"}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Widget button injected at bottom-right. Identity is {hasSigningSecret ? "HMAC-signed server-side" : "unsigned — set FEEDIYO_WIDGET_SIGNING_SECRET to enable verification"}.</p>
      </div>

      <div className="space-y-4 p-8">
        <Section label="Visibility" description="Programmatically show or hide the widget.">
          <div className="flex flex-wrap gap-3">
            <Btn onClick={showWidget}>Show Widget</Btn>
            <Btn variant="outline" onClick={hideWidget}>Hide Widget</Btn>
          </div>
        </Section>

        <Section label="Identity" description={hasSigningSecret ? "User is auto-identified with a server-signed HMAC token." : "No signing secret — identity is unverified. Set FEEDIYO_WIDGET_SIGNING_SECRET to enable."}>
          {identity ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-900 p-3 font-mono text-xs text-emerald-300">
                <div className="text-gray-500">// Server-generated tokens (safe to pass to client)</div>
                <div>signature: "{identity.signature.slice(0, 16)}…"</div>
                <div>clientToken: "{identity.clientToken.slice(0, 20)}…"</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Btn onClick={() => identify({ id: userId, email: "demo@example.com", name: "Demo User", signature: identity!.signature, clientToken: identity!.clientToken })}>Re-identify</Btn>
                <Btn variant="outline" onClick={() => identify(null)}>Clear Identity</Btn>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Btn onClick={() => identify({ id: userId, email: "demo@example.com", name: "Demo User" })}>Identify (unsigned)</Btn>
              <Btn variant="outline" onClick={() => identify(null)}>Clear Identity</Btn>
            </div>
          )}
        </Section>

        {boardPublicUrl && (
          <Section label="Auto-Login URL" description="createAutoLoginUrl() embeds the clientToken so users land on the public board already signed in.">
            <div className="flex items-center gap-3">
              <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{boardPublicUrl}</code>
              <a href={boardPublicUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                Open →
              </a>
            </div>
          </Section>
        )}

        <Section label="Theme" description="Switch the widget color scheme at runtime.">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(["light", "dark", "auto"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTheme(t)} className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
