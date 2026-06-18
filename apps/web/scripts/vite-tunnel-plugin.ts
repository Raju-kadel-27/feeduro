import { execSync, spawn } from "node:child_process";
import type { Plugin } from "vite";

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
  return {
    name: "ngrok-tunnel",
    apply: "serve",

    config: () => ({ server: { allowedHosts: true as const } }),

    configureServer(server) {
      const baseUrl = process.env.BASE_URL;

      if (!baseUrl?.startsWith("https://")) {
        console.warn("\n  ⚠️   BASE_URL is not an https:// URL — tunnel disabled.");
        console.warn("  Get a free static domain: ngrok.com/dashboard → Domains → + New Domain");
        console.warn("  Set BASE_URL=https://your-word.ngrok-free.app in .env to enable the tunnel.\n");
        return;
      }

      const bin = resolveNgrok();
      const ngrokUrlArg = baseUrl.replace(/^https?:\/\//, "");
      const authtokenArg = process.env.NGROK_AUTHTOKEN ? [`--authtoken=${process.env.NGROK_AUTHTOKEN}`] : [];
      const proc = spawn(bin, ["http", `https://localhost:${port}`, `--url=${ngrokUrlArg}`, ...authtokenArg], {
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
      console.log(`  ✅  BASE_URL set in .env\n`);

      server.httpServer?.once("close", () => {
        proc.kill();
        console.log("\n  ✅  Tunnel stopped\n");
      });
    },
  };
}
