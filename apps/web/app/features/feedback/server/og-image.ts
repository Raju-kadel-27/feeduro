import { createElement as h } from "react";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { COLOR_OPTIONS } from "@features/branding/constants/branding-options";

export type OgImageParams = {
  orgName: string;
  primaryColor: string;
  hidePoweredBy: boolean;
  postTitle?: string;
  voteCount?: number;
};

type FontEntry = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

const FONT_BASE = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2/index_bg.wasm";

// Per-worker-instance caches — initialized once, reused for every subsequent request
let fontCache: FontEntry[] | null = null;
let wasmReady = false;
let bootPromise: Promise<void> | null = null;

function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      await Promise.all([
        (async () => {
          if (fontCache) return;
          const [r400, r700] = await Promise.all([
            fetch(`${FONT_BASE}/inter-latin-400-normal.woff2`),
            fetch(`${FONT_BASE}/inter-latin-700-normal.woff2`),
          ]);
          fontCache = [
            { name: "Inter", data: await r400.arrayBuffer(), weight: 400, style: "normal" },
            { name: "Inter", data: await r700.arrayBuffer(), weight: 700, style: "normal" },
          ];
        })(),
        (async () => {
          if (wasmReady) return;
          await initWasm(fetch(WASM_URL));
          wasmReady = true;
        })(),
      ]);
    })();
  }
  return bootPromise;
}

function brandHex(v: string): string {
  return COLOR_OPTIONS.find((c) => c.value === v)?.hex ?? "#6366f1";
}

function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
}

export async function generateOgPng(p: OgImageParams): Promise<Uint8Array> {
  await boot();
  const hex = brandHex(p.primaryColor);
  const rgb = hexRgb(hex);
  const initial = (p.orgName.charAt(0) ?? "F").toUpperCase();

  const bodyContent = p.postTitle
    ? h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 20 } },
        h(
          "div",
          { style: { fontSize: 52, fontWeight: 700, color: "#111827", lineHeight: 1.25, maxWidth: 1000 } },
          p.postTitle,
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
        h("div", { style: { fontSize: 44, fontWeight: 700, color: "#111827" } }, p.orgName),
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
      h("span", { style: { fontSize: 24, fontWeight: 500, color: "#374151" } }, p.orgName),
    ),
    h("div", { style: { display: "flex", flex: 1, alignItems: "center" } }, bodyContent),
    !p.hidePoweredBy &&
      h("div", { style: { marginTop: 32 } },
        h("span", { style: { fontSize: 18, color: "#9CA3AF" } }, "Powered by Feediyo"),
      ),
    h("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: hex } }),
  );

  const svg = await satori(tree, { width: 1200, height: 630, fonts: fontCache! });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
