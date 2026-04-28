import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

declare const process: {
  env: Record<string, string | undefined>;
};

const isProductionBuild = process.env.NODE_ENV === "production";

export default defineConfig({
  site: "https://szduda.github.io",
  base: isProductionBuild ? "/cv" : "/",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
