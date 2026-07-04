import { readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { createLogger, defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { tunnelPlugin } from "./scripts/vite-tunnel-plugin";

// @dnd-kit's published files reference `//# sourceMappingURL=*.js.map` files
// that were never shipped in the package. Because these deps are excluded from
// dep-optimization (see optimizeDeps.exclude below), Vite serves them raw and
// logs a harmless "Failed to load source map" warning on every read. We filter
// just that message from the logger — we must NOT transform these files or
// force them through optimization, as that duplicates React (useMemoCache null).
const logger = createLogger();
const originalWarn = logger.warn;
logger.warn = (msg, options) => {
  if (msg.includes("Failed to load source map") && msg.includes("@dnd-kit")) return;
  originalWarn(msg, options);
};

// Pre-bundled in every environment so Rolldown produces a single shared React
// chunk per environment. Deps discovered mid-session get a separate optimize
// pass with their own React copy, breaking hook dispatchers (null useMemo /
// useMemoCache). react/compiler-runtime is injected by babel-plugin-react-compiler
// into every compiled component, so it must be here too.
const reactSingletonDeps = [
  "react",
  "react-dom",
  "react/compiler-runtime",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label",
  "@radix-ui/react-popover",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "input-otp",
];

export default defineConfig({
  server: {
    port: 3000,
    https: {
      key: readFileSync("./local_certificates/localhost.key"),
      cert: readFileSync("./local_certificates/localhost.crt"),
    },
  },
  customLogger: logger,
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    process.env.TUNNEL === "true" && tunnelPlugin(3000),
    tailwindcss(),
    reactRouter(),
    babel({
      include: /\.[jt]sx?$/,
      exclude: /node_modules/,
      babelConfig: {
        presets: [["@babel/preset-typescript", { allExtensions: true, isTSX: true }]],
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  resolve: { dedupe: ["react", "react-dom"], tsconfigPaths: true },
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
    include: [
      ...reactSingletonDeps,
      // Deps reached only via React.lazy routes — the entry scan misses them,
      // so without this they're discovered mid-session, forcing a
      // re-optimization that bumps chunk hashes and duplicates React.
      "@hookform/resolvers/zod",
      "papaparse",
      "react-hook-form",
      "recharts",
      "unique-names-generator",
      "zod",
    ],
  },
});
