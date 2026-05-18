/**
 * After `astro build`, serves ./dist locally and prints PL + EN index pages to PDF.
 * Writes to public/pdf/ (gitignored) and copies the same files into dist/pdf/ for deploy.
 *
 * Requires Chromium once: `npx playwright install chromium`
 * Optional extra Chromium flags: PLAYWRIGHT_CHROMIUM_ARGS="--no-sandbox ..."
 */
import { spawn } from "node:child_process";
import { access, copyFile, cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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

const pdfPl = "Szymon Duda - CV (pl).pdf";
const pdfEn = "Szymon Duda - CV (en).pdf";

/** A4 width/height at 96 CSS px/in — matches Chromium print layout for @page { size: A4 }. */
const A4_VIEWPORT = { width: 794, height: 1123 };

/**
 * Chrome's interactive print (Ctrl+P) renders ~3.3% smaller than CDP/Playwright page.pdf()
 * for the same @media print CSS. Tune with PDF_PRINT_SCALE if a future Chrome build drifts.
 */
const PDF_PRINT_SCALE = Number(process.env.PDF_PRINT_SCALE ?? "0.967");

const routes = [
  { urlPath: `${siteBasePath}`, file: pdfPl },
  { urlPath: `${siteBasePath}en/`, file: pdfEn },
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
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes("<h1")) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for CV page at ${url}`);
}

async function main() {
  if (!(await pathExists(distDir))) {
    throw new Error("Missing ./dist — run `npm run build` before print-pdfs.");
  }

  await mkdir(publicPdfDir, { recursive: true });
  await mkdir(distPdfDir, { recursive: true });
  await writeFile(path.join(distDir, ".nojekyll"), "");

  const stagingRoot = await mkdtemp(path.join(os.tmpdir(), "cv-pdf-render-"));
  const baseSegment = siteBasePath.replace(/^\/|\/$/g, "");
  const serveRoot = baseSegment ? stagingRoot : distDir;

  if (baseSegment) {
    const stagedBaseDir = path.join(stagingRoot, baseSegment);
    await mkdir(stagedBaseDir, { recursive: true });
    await cp(distDir, stagedBaseDir, { recursive: true });
  }

  const serve = spawn(
    "npx",
    ["serve", serveRoot, "-l", String(port), "--no-clipboard"],
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
    await waitForServer(`${base}${routes[0].urlPath}`);

    const extraArgs =
      process.env.PLAYWRIGHT_CHROMIUM_ARGS?.split(/\s+/).filter(Boolean) ?? [];

    browser = await chromium.launch({
      headless: true,
      args: extraArgs,
    });
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const { urlPath, file } of routes) {
      const destPublic = path.join(publicPdfDir, file);
      const destDist = path.join(distPdfDir, file);
      await page.setViewportSize(A4_VIEWPORT);
      await page.emulateMedia({ media: "print" });
      await page.goto(`${base}${urlPath}`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: destPublic,
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        scale: PDF_PRINT_SCALE,
      });
      await copyFile(destPublic, destDist);
      console.log(`Wrote ${path.relative(root, destPublic)} and dist/pdf/${file}`);
    }
  } finally {
    if (browser) await browser.close();
    serve.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 300));
    if (!serve.killed) serve.kill("SIGKILL");
    if (baseSegment) await rm(stagingRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
