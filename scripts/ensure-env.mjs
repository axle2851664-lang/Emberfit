/**
 * Creates .env from .env.example when it's missing.
 *
 * Runs automatically before dev/build/setup so a fresh clone never fails with
 * an opaque "DATABASE_URL is missing" error, and so the setup steps are
 * identical on Windows, macOS and Linux (no `cp` required).
 */
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = join(root, ".env");
const example = join(root, ".env.example");

if (existsSync(env)) {
  process.exit(0);
}

if (!existsSync(example)) {
  console.error("\n  Missing .env.example — cannot create .env automatically.\n");
  process.exit(1);
}

copyFileSync(example, env);
console.log("  Created .env from .env.example (no API keys needed to run).");
