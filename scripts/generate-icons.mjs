/**
 * Generates the PWA icons and iOS splash screens from one source design.
 *
 * Committed output lives in public/icons and public/splash, so this only needs
 * running when the mark changes:  node scripts/generate-icons.mjs
 *
 * Chromium (via the Playwright dev dependency) does the rasterising, which
 * keeps the whole thing to one devDependency we already have rather than an
 * image-processing toolchain.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const splashDir = join(root, "public", "splash");

const COCOA = "#2E2016";
const GRADIENT = ["#7A5537", "#D0762A", "#F4914E"];
const CREAM = "#FBF7F1";

/** The flame, drawn in a 24x24 box so it can be scaled anywhere. */
const FLAME =
  "M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.8 8.6 9 9.6 10 10c0-2.5.8-5.5 2-8z";

/**
 * @param size     output square size in px
 * @param maskable leave a safe margin so Android can crop to any shape
 * @param rounded  round the corners (never for maskable — the OS masks it)
 */
function iconHtml(size, { maskable = false, rounded = true } = {}) {
  // Maskable icons must keep their content inside the middle 80%.
  const glyphScale = maskable ? 0.44 : 0.58;
  const glyph = Math.round(size * glyphScale);
  const radius = rounded && !maskable ? Math.round(size * 0.22) : 0;

  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;background:transparent}
  .tile{
    width:${size}px;height:${size}px;
    border-radius:${radius}px;
    background:linear-gradient(135deg, ${GRADIENT[0]} 0%, ${GRADIENT[1]} 55%, ${GRADIENT[2]} 100%);
    display:flex;align-items:center;justify-content:center;
  }
</style>
<div class="tile">
  <svg width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none">
    <path d="${FLAME}" fill="${CREAM}"/>
  </svg>
</div>`;
}

/** Splash screens are a centred mark and wordmark on the dark ground. */
function splashHtml(width, height) {
  const mark = Math.round(Math.min(width, height) * 0.22);
  const glyph = Math.round(mark * 0.55);
  const title = Math.round(Math.min(width, height) * 0.062);

  return `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  /* Flat, not a gradient: these are full-screen images, and a smooth ramp
     across 2048x2732 costs megabytes in PNG while a flat field costs almost
     nothing. The warmth comes from the mark. */
  .screen{
    width:${width}px;height:${height}px;
    background:${COCOA};
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:${Math.round(mark * 0.34)}px;
    font-family:"Iowan Old Style",Palatino,Georgia,serif;
  }
  .mark{
    width:${mark}px;height:${mark}px;border-radius:${Math.round(mark * 0.24)}px;
    background:linear-gradient(135deg, ${GRADIENT[0]} 0%, ${GRADIENT[1]} 55%, ${GRADIENT[2]} 100%);
    display:flex;align-items:center;justify-content:center;
  }
  .name{color:${CREAM};font-size:${title}px;letter-spacing:-0.01em}
</style>
<div class="screen">
  <div class="mark">
    <svg width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none">
      <path d="${FLAME}" fill="${CREAM}"/>
    </svg>
  </div>
  <div class="name">EmberFit</div>
</div>`;
}

// Android/Chrome read 192 and 512; the maskable variant stops Android from
// putting a white box behind the icon. 180 is Apple's touch icon.
const ICONS = [
  { file: "icon-96.png", size: 96 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-256.png", size: 256 },
  { file: "icon-384.png", size: 384 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180 },
];

// Portrait sizes covering current iPhones and iPads. iOS needs an exact match
// per device, so anything missing simply falls back to a plain background.
const SPLASHES = [
  { file: "splash-750x1334.png", width: 750, height: 1334 },
  { file: "splash-828x1792.png", width: 828, height: 1792 },
  { file: "splash-1125x2436.png", width: 1125, height: 2436 },
  { file: "splash-1170x2532.png", width: 1170, height: 2532 },
  { file: "splash-1179x2556.png", width: 1179, height: 2556 },
  { file: "splash-1242x2688.png", width: 1242, height: 2688 },
  { file: "splash-1284x2778.png", width: 1284, height: 2778 },
  { file: "splash-1290x2796.png", width: 1290, height: 2796 },
  { file: "splash-1536x2048.png", width: 1536, height: 2048 },
  { file: "splash-1668x2388.png", width: 1668, height: 2388 },
  { file: "splash-2048x2732.png", width: 2048, height: 2732 },
];

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const browser = await chromium.launch(executablePath ? { executablePath } : {});

try {
  mkdirSync(iconsDir, { recursive: true });
  mkdirSync(splashDir, { recursive: true });

  for (const { file, size, maskable } of ICONS) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(iconHtml(size, { maskable }));
    const buffer = await page.locator(".tile").screenshot({ omitBackground: true });
    writeFileSync(join(iconsDir, file), buffer);
    await page.close();
    console.log("icons/" + file);
  }

  for (const { file, width, height } of SPLASHES) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(splashHtml(width, height));
    const buffer = await page.locator(".screen").screenshot();
    writeFileSync(join(splashDir, file), buffer);
    await page.close();
    console.log("splash/" + file);
  }
} finally {
  await browser.close();
}

console.log("\nDone.");
