import { readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tunnelPlugin } from "./scripts/vite-tunnel-plugin";

export default defineConfig({
  server: {
    port: 3001,
    host: "0.0.0.0",
    hmr: false,
    https: {
      key: readFileSync("./local_certificates/localhost.key"),
      cert: readFileSync("./local_certificates/localhost.crt"),
    },
  },
  plugins: [
    process.env.TUNNEL === "true" && tunnelPlugin(3001),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: { dedupe: ["react", "react-dom"] },
});
