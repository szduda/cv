import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

declare const process: {
  argv: string[];
};

/** GitHub Pages project site lives under /cv; only `astro dev` uses `/` at repo root. */
const astroCommand = process.argv.find((arg) =>
  ["dev", "build", "preview", "sync", "check"].includes(arg),
);
const base = astroCommand === "dev" ? "/" : "/cv";

export default defineConfig({
  site: "https://szduda.github.io",
  base,
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
