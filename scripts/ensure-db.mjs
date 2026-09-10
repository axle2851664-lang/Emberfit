/**
 * Makes sure the database exists, matches the schema, and has the exercise
 * library in it — then gets out of the way.
 *
 * Running `npm run dev` on a fresh clone without `npm run setup` used to start
 * the server against a database with no tables, so every page failed with
 * "The table `main.User` does not exist in the current database".
 *
 * Checking whether the database file exists is not enough: Prisma creates an
 * empty SQLite file as soon as it connects, so a failed first run leaves a file
 * behind with no tables in it. We check for the tables themselves.
 *
 * `db push` is additive and idempotent, so this never destroys existing data.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// npx and prisma are .cmd shims on Windows, which only run through a shell.
const needsShell = process.platform === "win32";

function run(command, args, { quiet = true } = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    shell: needsShell,
  });
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const url = databaseUrl();

// A hosted database is the operator's to manage, not ours to bootstrap.
if (!url || !url.startsWith("file:")) process.exit(0);

/**
 * Ask the database what it actually contains. Returns the number of seeded
 * exercises, or null when the tables aren't there at all.
 */
function readExerciseCount() {
  const probe = [
    'import { PrismaClient } from "@prisma/client";',
    "const prisma = new PrismaClient();",
    "try {",
    "  console.log('EXERCISE_COUNT=' + (await prisma.exercise.count()));",
    "} catch {",
    "  console.log('EXERCISE_COUNT=none');",
    "} finally {",
    "  await prisma.$disconnect();",
    "}",
  ].join("\n");

  // The probe has to live inside the project: Node resolves imports relative to
  // the file, so "@prisma/client" is unreachable from a system temp directory.
  const file = join(root, ".ensure-db-probe.mts");
  try {
    writeFileSync(file, probe);
    const out = run("npx", ["tsx", file]);
    const value = /EXERCISE_COUNT=(\d+|none)/.exec(out)?.[1];
    return value === "none" || value === undefined ? null : Number(value);
  } catch {
    return null;
  } finally {
    rmSync(file, { force: true });
  }
}

try {
  // 1. The generated client has to exist before anything can query.
  if (!existsSync(join(root, "node_modules", ".prisma", "client", "index.js"))) {
    console.log("  Preparing the database client…");
    run("npx", ["prisma", "generate"]);
  }

  // 2. Does the schema exist in the database? null means no tables.
  let count = readExerciseCount();

  if (count === null) {
    console.log("  Setting up the database (one time only)…");
    run("npx", ["prisma", "db", "push", "--skip-generate"]);
    run("npx", ["prisma", "generate"]);
    count = 0;
  }

  // 3. Seed the exercise library if it's empty. The seed is idempotent.
  if (count === 0) {
    console.log("  Adding the exercise library…");
    run("npx", ["tsx", "prisma/seed.ts"]);
    console.log("  Ready.\n");
  }
} catch (error) {
  console.error(
    "\n  Couldn't prepare the database automatically." +
      "\n  Run `npm run setup` and share the error it prints.\n",
  );
  if (error?.stdout) console.error(String(error.stdout).trim());
  if (error?.stderr) console.error(String(error.stderr).trim());
  process.exit(1);
}
