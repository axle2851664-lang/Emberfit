/**
 * Runs the Next.js CLI with telemetry off by default.
 *
 * EmberFit's premise is that your data stays on your machine, so anonymous
 * usage reporting is a poor fit for the default. Next.js only honours this as a
 * real environment variable — a line in .env is read too late — so it is set
 * here, before the CLI starts.
 *
 * This is a project-level default, not a change to your machine: nothing is
 * written to your global Next.js config, and only this project is affected.
 * To take part in Next.js telemetry anyway, run `npx next telemetry enable` and
 * delete the default below — note that Next treats *any* value of the variable
 * as "off", so setting it to 0 will not switch it back on.
 *
 * Usage: node scripts/next.mjs <dev|build|start> [...args]
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/next.mjs <dev|build|start> [...args]");
  process.exit(1);
}

const env = { ...process.env };
// Respect an explicit choice; otherwise default to off.
if (env.NEXT_TELEMETRY_DISABLED === undefined) {
  env.NEXT_TELEMETRY_DISABLED = "1";
}

// Call the Next binary directly rather than through npx, so there is no
// registry lookup and no shell quoting to get wrong on Windows paths.
const bin = join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [bin, command, ...args], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`\n  Couldn't start Next.js: ${error.message}`);
  console.error("  Try `npm install` first.\n");
  process.exit(1);
});
