import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Case, HarnessResult } from "./types";

/**
 * Runs model-written code in a throwaway directory in a separate Node process:
 * hard timeout, capped memory, and an empty environment so API keys never reach it.
 *
 * This is process isolation, not a container. It is fine for a benchmark you run yourself.
 * For a public deployment, swap `runHarness` for a container-backed implementation
 * (for example the `openrouter:shell` server tool) behind the same signature.
 */

const HARNESS = String.raw`
const fs = require("fs");
const cases = JSON.parse(fs.readFileSync("cases.json", "utf8"));
const fnName = fs.readFileSync("fn.txt", "utf8");
const canon = (x) => JSON.stringify(x, (k, v) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.keys(v).sort().reduce((o, key) => ((o[key] = v[key]), o), {})
    : v);
const out = [];
let fn;
try {
  const mod = require("./solution.js");
  fn = mod[fnName] || (typeof mod === "function" ? mod : undefined);
  if (typeof fn !== "function") throw new Error("solution.js must export a function named " + fnName);
} catch (e) {
  process.stdout.write(JSON.stringify({ crashed: String(e && e.message || e).slice(0, 300), results: [] }));
  process.exit(0);
}
for (const c of cases) {
  try {
    const args = JSON.parse(JSON.stringify(c.args));
    const before = canon(args);
    const got = fn(...args);
    const gotS = canon(got === undefined ? null : got);
    const wantS = canon(c.expected);
    if (canon(args) !== before) out.push({ ok: false, error: "mutated its input", got: gotS });
    else out.push({ ok: gotS === wantS, got: (gotS || "undefined").slice(0, 200) });
  } catch (e) {
    out.push({ ok: false, error: String(e && e.message || e).slice(0, 200) });
  }
}
process.stdout.write(JSON.stringify({ results: out }));
`;

export async function runHarness(
  code: string,
  fn: string,
  cases: Case[],
  timeoutMs = 5000,
): Promise<HarnessResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "bench-"));
  try {
    await writeFile(path.join(dir, "solution.js"), code);
    await writeFile(path.join(dir, "harness.js"), HARNESS);
    await writeFile(path.join(dir, "fn.txt"), fn);
    await writeFile(path.join(dir, "cases.json"), JSON.stringify(cases));

    return await new Promise<HarnessResult>((resolve) => {
      const child = spawn(process.execPath, ["--max-old-space-size=96", "harness.js"], {
        cwd: dir,
        env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);
      child.stdout.on("data", (d) => {
        stdout += d;
        if (stdout.length > 200_000) child.kill("SIGKILL");
      });
      child.on("close", () => {
        clearTimeout(timer);
        if (timedOut) return resolve({ results: [], timedOut: true, crashed: "timed out" });
        try {
          resolve(JSON.parse(stdout) as HarnessResult);
        } catch {
          resolve({ results: [], crashed: "solution crashed the process" });
        }
      });
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const countOk = (r: HarnessResult) => r.results.filter((x) => x.ok).length;
