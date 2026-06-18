import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

function loadDevVars(root: string): void {
  const file = join(root, ".dev.vars");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

function resolveNgrok(): string {
  try {
    execSync("ngrok version", { stdio: "ignore" });
    return "ngrok";
  } catch {
    /* not in PATH */
  }
  console.error("\n  ❌  ngrok not found.");
  console.error("  Install: https://ngrok.com/download");
  console.error("  Then:    ngrok config add-authtoken YOUR_TOKEN\n");
  process.exit(1);
}

export function tunnelPlugin(port = 3001): Plugin {
  return {
    name: "ngrok-tunnel",
    apply: "serve",

    config: () => ({ server: { allowedHosts: true as const } }),

    configureServer(server) {
      loadDevVars(server.config.root);
      const baseUrl = process.env.BASE_URL;

      if (!baseUrl?.startsWith("https://")) {
        console.warn("\n  ⚠️   BASE_URL is not an https:// URL — tunnel disabled.");
        console.warn("  Get a free static domain: ngrok.com/dashboard → Domains → + New Domain");
        console.warn("  Set BASE_URL=https://your-word.ngrok-free.app in .dev.vars to enable the tunnel.\n");
        return;
      }

      const bin = resolveNgrok();
      const ngrokUrlArg = baseUrl.replace(/^https?:\/\//, "");
      const proc = spawn(bin, ["http", `https://localhost:${port}`, `--url=${ngrokUrlArg}`], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      proc.stdout?.on("data", (d: Buffer) => process.stdout.write(d));
      proc.stderr?.on("data", (d: Buffer) => process.stderr.write(d));
      proc.on("error", (err) => console.error("[tunnel] ngrok error:", err.message));
      process.on("exit", () => {
        try {
          proc.kill();
        } catch {
          /* ignore */
        }
      });

      console.log(`\n  🌍  Tunnel   ${baseUrl}`);
      console.log(`  ℹ️   Update FEEDURO_API_URL in .dev.vars if apps/web is also tunneled\n`);

      server.httpServer?.once("close", () => {
        proc.kill();
        console.log("\n  ✅  Tunnel stopped\n");
      });
    },
  };
}
