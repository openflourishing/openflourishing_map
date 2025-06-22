import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "",
  plugins: [
    react(),
    viteTsconfigPaths(),
    checker({
      typescript: {
        buildMode: true,
      },
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  server: {
    open: false,
    port: 3000,
  },
  build: {
    outDir: "build",
    lib: {
      entry: 'src/index.tsx',
      name: 'OpenFlourishingMap', // will become window.OpenFlourishingMap
      fileName: 'open-flourishing-map',
      formats: ['iife'], // generates a <script>-friendly bundle
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // ensures a single .js file
      },
    },
  },
  resolve: {
    preserveSymlinks: false,
  },
});
