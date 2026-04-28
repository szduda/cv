import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
};

const isBuildCommand = process.argv.includes("build");

export default defineConfig({
  site: "https://szduda.github.io",
  base: isBuildCommand ? "/cv" : "/",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
