import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { createElement as h } from "react";
import satori, { init as initSatori } from "satori/standalone";
// Bundled via wrangler CompiledWasm rule — no CDN fetch at cold start
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import yogaWasm from "satori/yoga.wasm";
import { getInterFonts, type FontEntry } from "./fonts";

export type OgImageParams = {
  orgName: string;
  primaryColor: string;
  hidePoweredBy: boolean;
  postTitle?: string;
  voteCount?: number;
};

// Keep in sync with apps/web/app/features/branding/constants/branding-options.ts
const COLOR_MAP: Record<string, string> = {
  indigo: "#6366f1",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  emerald: "#10b981",
  green: "#22c55e",
  lime: "#84cc16",
  yellow: "#eab308",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  rose: "#f43f5e",
  pink: "#ec4899",
  fuchsia: "#d946ef",
  purple: "#a855f7",
  violet: "#8b5cf6",
  zinc: "#71717a",
};

let fonts: FontEntry[] | null = null;
let wasmReady = false;
let bootPromise: Promise<void> | null = null;

function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      await Promise.all([
        (async () => {
          if (fonts) return;
          fonts = getInterFonts();
        })(),
        (async () => {
          if (wasmReady) return;
          await Promise.all([
            initWasm(resvgWasm),
            initSatori(yogaWasm),
          ]);
          wasmReady = true;
        })(),
      ]);
    })().catch((err) => {
      // Reset so the next request can retry rather than failing permanently.
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

function brandHex(v: string): string {
  return COLOR_MAP[v] ?? "#6366f1";
}

function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}

export async function generateOgPng(p: OgImageParams): Promise<Uint8Array> {
  await boot();

  if (!fonts) throw new Error("Fonts failed to initialise");

  // Clamp inputs so satori never gets runaway-length strings that overflow the layout.
  const orgName = p.orgName.slice(0, 60) || "Untitled";
  const postTitle = p.postTitle?.slice(0, 160);
  const hex = brandHex(p.primaryColor);
  const rgb = hexRgb(hex);
  const initial = orgName.charAt(0).toUpperCase();

  const bodyContent = postTitle
    ? h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 20 } },
        h(
          "div",
          { style: { fontSize: 52, fontWeight: 700, color: "#111827", lineHeight: 1.25, maxWidth: 1000 } },
          postTitle,
        ),
        (p.voteCount ?? 0) > 0 &&
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                background: `rgba(${rgb}, 0.12)`,
                color: hex,
                fontSize: 20,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 8,
                width: "fit-content",
              },
            },
            `▲ ${p.voteCount} votes`,
          ),
      )
    : h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 12 } },
        h("div", { style: { fontSize: 44, fontWeight: 700, color: "#111827" } }, orgName),
        h(
          "div",
          { style: { fontSize: 26, fontWeight: 400, color: "#6B7280", maxWidth: 800 } },
          "Share your feedback and help shape what we build next.",
        ),
      );

  const tree = h(
    "div",
    { style: { display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#fff", padding: "56px 72px 48px", position: "relative" } },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 48 } },
      h(
        "div",
        { style: { width: 44, height: 44, borderRadius: 10, background: hex, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff" } },
        initial,
      ),
      h("span", { style: { fontSize: 24, fontWeight: 500, color: "#374151" } }, orgName),
    ),
    h("div", { style: { display: "flex", flex: 1, alignItems: "center" } }, bodyContent),
    !p.hidePoweredBy &&
      h("div", { style: { marginTop: 32 } },
        h("span", { style: { fontSize: 18, color: "#9CA3AF" } }, "Powered by Feeduro"),
      ),
    h("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: hex } }),
  );

  const svg = await satori(tree, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
