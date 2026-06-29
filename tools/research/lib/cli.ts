/**
 * Tiny CLI helpers shared across the research tools. Avoids pulling
 * commander/yargs/etc. — Node 22's util.parseArgs covers what we need.
 */
import { parseArgs as nodeParseArgs } from "node:util";
import { execSync } from "node:child_process";

export interface ParseOpts {
  /** Schema for parseArgs `options`, plus `required: true` on the ones we enforce. */
  schema: Record<string, { type: "string" | "boolean"; short?: string; required?: boolean }>;
  /** Usage line printed on --help and on errors. */
  usage: string;
}

export function parseArgs<T extends Record<string, unknown>>(opts: ParseOpts): T {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage(opts);
    process.exit(0);
  }

  // Strip 'required' before handing to node:util/parseArgs.
  const cleanSchema: Record<string, { type: "string" | "boolean"; short?: string }> = {};
  for (const [k, v] of Object.entries(opts.schema)) {
    cleanSchema[k] = { type: v.type, ...(v.short ? { short: v.short } : {}) };
  }

  let parsed;
  try {
    parsed = nodeParseArgs({ args: argv, options: cleanSchema as never, strict: true });
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    printUsage(opts);
    process.exit(2);
  }

  const values = parsed.values as Record<string, unknown>;
  const missing: string[] = [];
  for (const [k, v] of Object.entries(opts.schema)) {
    if (v.required && (values[k] === undefined || values[k] === "")) missing.push(k);
  }
  if (missing.length) {
    console.error(`error: missing required flag(s): ${missing.map((m) => "--" + m).join(", ")}`);
    printUsage(opts);
    process.exit(2);
  }

  return values as T;
}

function printUsage(opts: ParseOpts): void {
  console.error(opts.usage);
  console.error("\nFlags:");
  const rows = Object.entries(opts.schema).map(([k, v]) => {
    const tag = v.required ? " [required]" : v.type === "boolean" ? "" : " [optional]";
    return `  --${k.padEnd(16)} (${v.type})${tag}`;
  });
  console.error(rows.join("\n"));
  console.error("\n  --help / -h          print this message");
}

/** Short git sha of HEAD. Used as the default evidence/<sha>/ subdir name. */
export function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "no-git-" + Date.now().toString(36);
  }
}

export function die(msg: string, code = 1): never {
  console.error(`error: ${msg}`);
  process.exit(code);
}

export function ok(msg: string): void {
  console.log(msg);
}
