import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Plugin } from "vite";

function patchEnvFile(file: string, key: string, value: string): string {
  if (!existsSync(file)) return "";
  const content = readFileSync(file, "utf-8");
  const original = content.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1] ?? "";
  writeFileSync(file, content.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`), "utf-8");
  return original;
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

export function tunnelPlugin(port = 3000): Plugin {
  let originalBaseUrl = "";

  return {
    name: "ngrok-tunnel",
    apply: "serve",

    // Accept any Host header so Vite allows tunnel-proxied requests
    config: () => ({ server: { allowedHosts: true as const } }),

    configureServer(server) {
      const ngrokDomain =
        process.env.NGROK_DOMAIN ??
        (process.env.BASE_URL?.startsWith("https://") ? process.env.BASE_URL : undefined);

      if (!ngrokDomain) {
        console.warn("\n  ⚠️   NGROK_DOMAIN not set — tunnel disabled.");
        console.warn("  Get a free static domain: ngrok.com/dashboard → Domains → + New Domain");
        console.warn("  Then add NGROK_DOMAIN=your-word.ngrok-free.app to .env\n");
        return;
      }

      const bin = resolveNgrok();
      const tunnelUrl = ngrokDomain;

      originalBaseUrl = patchEnvFile(".env", "BASE_URL", tunnelUrl);
      process.env.BASE_URL = tunnelUrl;

      const authtokenArg = process.env.NGROK_AUTHTOKEN ? [`--authtoken=${process.env.NGROK_AUTHTOKEN}`] : [];
      const proc = spawn(bin, ["http", `https://localhost:${port}`, `--url=${ngrokDomain}`, ...authtokenArg], {
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

      console.log(`\n  🌍  Tunnel   ${tunnelUrl}`);
      console.log(`  ✅  BASE_URL set in .env\n`);

      server.httpServer?.once("close", () => {
        proc.kill();
        if (originalBaseUrl) {
          patchEnvFile(".env", "BASE_URL", originalBaseUrl);
          process.env.BASE_URL = originalBaseUrl;
          console.log(`\n  ✅  Tunnel stopped — BASE_URL restored → ${originalBaseUrl}\n`);
        }
      });
    },
  };
}
