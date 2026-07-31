import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // v2 is deployed ALONGSIDE the classic app on the same origin, not instead of
  // it: classic serves "/", this serves "/v2/". They are separate builds on
  // purpose - both define `--color-primary-*` in their own Tailwind @theme with
  // different values, so a single build would merge the blocks and one design
  // would overwrite the other's palette. Separate bundles = zero interference.
  base: "/v2/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5180,
  },
});
