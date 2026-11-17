import { existsSync, readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { tunnelPlugin } from "./scripts/vite-tunnel-plugin";

export default defineConfig({
  server: {
    port: 3001,
    host: "0.0.0.0",
    hmr: false,
    // Local certs are gitignored; serve plain http when they are absent (e.g. CI)
    https: existsSync("./local_certificates/localhost.key")
      ? {
          key: readFileSync("./local_certificates/localhost.key"),
          cert: readFileSync("./local_certificates/localhost.crt"),
        }
      : undefined,
  },
  plugins: [
    process.env.TUNNEL === "true" && tunnelPlugin(3001),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
    tailwindcss(),
  ],
  resolve: { dedupe: ["react", "react-dom"], tsconfigPaths: true },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/server", "isbot"],
  },
});
