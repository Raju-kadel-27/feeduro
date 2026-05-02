import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    hmr: false,
  },

  plugins: [tailwindcss(), reactRouter()],

  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },

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
    include: ["@blocknote/react", "@blocknote/core", "@blocknote/shadcn"],
  },
});
