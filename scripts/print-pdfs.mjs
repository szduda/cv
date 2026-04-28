/**
 * After `astro build`, serves ./dist locally and prints PL + EN index pages to PDF.
 * Writes to public/pdf/ (gitignored) and copies the same files into dist/pdf/ for deploy.
 *
 * Requires Chromium once: `npx playwright install chromium`
 * Optional extra Chromium flags: PLAYWRIGHT_CHROMIUM_ARGS="--no-sandbox ..."
 */
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const publicPdfDir = path.join(root, "public", "pdf");
const distPdfDir = path.join(distDir, "pdf");
const port = Number(process.env.PDF_SERVE_PORT || 4179);
const base = `http://127.0.0.1:${port}`;
const rawSiteBasePath = process.env.PDF_SITE_BASE_PATH || "/cv/";
const siteBasePath = `/${rawSiteBasePath.replace(/^\/+|\/+$/g, "")}/`;

const routes = [
  { urlPath: `${siteBasePath}`, file: "cv-pl.pdf" },
  { urlPath: `${siteBasePath}en/`, file: "cv-en.pdf" },
];

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for static server at ${url}`);
}

async function main() {
  if (!(await pathExists(distDir))) {
    throw new Error("Missing ./dist — run `npm run build` before print-pdfs.");
  }

  await mkdir(publicPdfDir, { recursive: true });
  await mkdir(distPdfDir, { recursive: true });
  await writeFile(path.join(distDir, ".nojekyll"), "");

  const serve = spawn(
    "npx",
    ["serve", "dist", "-l", String(port), "--no-clipboard"],
    {
      cwd: root,
      /* Must not pipe stdout without draining: serve logs each request and hits EPIPE */
      stdio: "ignore",
      shell: true,
    },
  );
  serve.on("error", () => {});

  let browser;
  try {
    await waitForServer(`${base}/`);

    const extraArgs =
      process.env.PLAYWRIGHT_CHROMIUM_ARGS?.split(/\s+/).filter(Boolean) ?? [];

    browser = await chromium.launch({
      headless: true,
      args: extraArgs,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const { urlPath, file } of routes) {
      const destPublic = path.join(publicPdfDir, file);
      const destDist = path.join(distPdfDir, file);
      await page.goto(`${base}${urlPath}`, {
        waitUntil: "load",
        timeout: 120_000,
      });
      await page.pdf({
        path: destPublic,
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      await copyFile(destPublic, destDist);
      console.log(`Wrote ${path.relative(root, destPublic)} and dist/pdf/${file}`);
    }
  } finally {
    if (browser) await browser.close();
    serve.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 300));
    if (!serve.killed) serve.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
