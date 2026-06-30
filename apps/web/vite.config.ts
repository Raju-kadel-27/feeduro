import { readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";
import { tunnelPlugin } from "./scripts/vite-tunnel-plugin";

export default defineConfig({
  server: {
    port: 3000,
    hmr: false,
    https: {
      key: readFileSync("./local_certificates/localhost.key"),
      cert: readFileSync("./local_certificates/localhost.crt"),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    process.env.TUNNEL === "true" && tunnelPlugin(3000),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    babel({
      filter: /\.[jt]sx?$/,
      exclude: /node_modules/,
      babelConfig: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    // @dnd-kit packages are ESM — pre-bundling them causes rolldown to create
    // a separate react chunk (react-DdGvS63P.js), producing a duplicate React
    // instance that breaks useContext. Excluding them lets Vite serve them
    // directly, respecting the dedupe rule above.
    exclude: [
      "@dnd-kit/react",
      "@dnd-kit/react/sortable",
      "@dnd-kit/dom",
      "@dnd-kit/abstract",
      "@dnd-kit/helpers",
    ],
    // Explicitly pre-bundle react/react-dom so Rolldown produces a single
    // shared React chunk. Without this, packages like @radix-ui that ship CJS
    // can grab a separate React instance, breaking hook dispatchers.
    include: [
      "react",
      "react-dom",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "input-otp",
    ],
  },
});
