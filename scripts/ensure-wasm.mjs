/**
 * Copies the zxing barcode decoder's WebAssembly binary into public/.
 *
 * zxing-wasm fetches this file from a public CDN by default
 * (fastly.jsdelivr.net/npm/zxing-wasm@<version>/...). That is wrong here for
 * three separate reasons:
 *
 *   1. iOS Safari has no native BarcodeDetector, so zxing is the *only*
 *      decoder there. No CDN reachable means barcode scanning silently never
 *      works on iPhone — the scanner just never finds anything.
 *   2. This app claims your data stays on your machine. Quietly pulling a
 *      binary from a third party on first scan is not that.
 *   3. It breaks offline, on a locked-down network, and any self-hosted setup
 *      without outbound internet.
 *
 * Serving it ourselves fixes all three. Run automatically before dev, build
 * and setup so it always matches the installed package version.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const source = join(root, "node_modules", "zxing-wasm", "dist", "reader", "zxing_reader.wasm");
const targetDir = join(root, "public", "zxing");
const target = join(targetDir, "zxing_reader.wasm");

if (!existsSync(source)) {
  // Not fatal: the app still runs, and the scanner falls back to typing the
  // number. Say so rather than failing the whole dev server.
  console.warn(
    "  zxing-wasm isn't installed, so barcode scanning will be unavailable.\n" +
      "  Run `npm install` to restore it.",
  );
  process.exit(0);
}

// Only copy when missing or stale, so this is a no-op on every later run.
const stale =
  !existsSync(target) || statSync(source).size !== statSync(target).size;

if (!stale) process.exit(0);

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log("  Barcode decoder ready (served locally, not from a CDN).");
