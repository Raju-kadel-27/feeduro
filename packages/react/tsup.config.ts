import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react"],
  splitting: false,
  // Preserve "use client" so Next.js App Router knows this is a client module.
  // Vite / Webpack / Remix treat it as a harmless string and ignore it.
  esbuildOptions(options) {
    options.banner = { js: '"use client";' };
  },
});
