/**
 * Leonida Trophy Atlas — dev server + build validator.
 *
 * Node 22+ stdlib only. No dependencies, no network calls.
 *
 *   node main.ts build   — validate the static app (files exist, trophies.json
 *                          parses with exactly 55 entries, index.html
 *                          references resolve, JS syntax is valid)
 *   node main.ts serve   — serve app/ on http://localhost:4173 for local use
 *   node main.ts         — same as `build`
 *
 * The app itself is plain static files under app/ and works by opening
 * app/index.html directly or through this server. Nothing here phones home.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)));
const APP_DIR: string = join(ROOT, "app");
const DATA_FILE: string = join(APP_DIR, "data", "trophies.json");
const PORT: number = 4173;

type Trophy = {
  id: string;
  name: string;
  description: string;
  grade: string;
  kind: string;
  missable: boolean;
  spoiler: boolean;
  guide: string;
  sources: string[];
};

type Check = { ok: boolean; label: string; detail: string };

function check(ok: boolean, label: string, detail: string = ""): Check {
  return { ok, label, detail };
}

function loadTrophies(): Trophy[] {
  const raw: string = readFileSync(DATA_FILE, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !Array.isArray((data as { trophies?: unknown }).trophies)) {
    throw new Error("trophies.json must be an object with a trophies array");
  }
  return (data as { trophies: Trophy[] }).trophies;
}

function validate(): Check[] {
  const results: Check[] = [];

  // 1. Required files exist.
  const required: string[] = [
    "app/index.html",
    "app/style.css",
    "app/app.js",
    "app/data/trophies.json",
    "README.md",
  ];
  for (const rel of required) {
    const p: string = join(ROOT, rel);
    results.push(check(existsSync(p) && statSync(p).isFile(), "file exists: " + rel, existsSync(p) ? "" : "missing"));
  }

  // 2. trophies.json: parses, exactly 55 entries, unique names, required fields.
  let trophies: Trophy[] = [];
  try {
    trophies = loadTrophies();
    results.push(check(trophies.length === 55, "trophies.json has 55 entries", "found " + trophies.length));
    const names: Set<string> = new Set(trophies.map((t) => t.name));
    results.push(check(names.size === trophies.length, "trophy names are unique", names.size + " unique of " + trophies.length));
    const ids: Set<string> = new Set(trophies.map((t) => t.id));
    results.push(check(ids.size === trophies.length, "trophy ids are unique", ids.size + " unique of " + trophies.length));
    const grades: Record<string, number> = {};
    for (const t of trophies) grades[t.grade] = (grades[t.grade] || 0) + 1;
    results.push(check(
      grades["Platinum"] === 1 && grades["Gold"] === 2 && grades["Silver"] === 6 && grades["Bronze"] === 46,
      "grade split is 1 Platinum / 2 Gold / 6 Silver / 46 Bronze",
      JSON.stringify(grades),
    ));
    const missing: string[] = trophies
      .filter((t) => !t.id || !t.name || !t.description || !t.grade || !t.kind || !t.guide || !Array.isArray(t.sources) || t.sources.length === 0 || typeof t.missable !== "boolean" || typeof t.spoiler !== "boolean")
      .map((t) => t.id || t.name || "?");
    results.push(check(missing.length === 0, "every trophy has id/name/description/grade/kind/guide/sources/missable/spoiler", missing.length ? "incomplete: " + missing.join(", ") : ""));
    const missable: Trophy[] = trophies.filter((t) => t.missable);
    results.push(check(missable.length >= 1, "at least one missable trophy is flagged", missable.map((t) => t.name).join(", ")));
    const spoilerCount: number = trophies.filter((t) => t.spoiler).length;
    results.push(check(spoilerCount > 0, "story trophies are spoiler-flagged", spoilerCount + " flagged"));
  } catch (err) {
    results.push(check(false, "trophies.json parses", err instanceof Error ? err.message : String(err)));
  }

  // 3. index.html references resolve to files under app/.
  try {
    const html: string = readFileSync(join(APP_DIR, "index.html"), "utf8");
    const refs: string[] = [];
    const re: RegExp = /(?:src|href)="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const ref: string = m[1];
      if (ref.startsWith("http") || ref.startsWith("#") || ref.startsWith("data:")) continue;
      refs.push(ref);
    }
    const unresolved: string[] = refs.filter((r) => !existsSync(join(APP_DIR, r)));
    results.push(check(refs.length > 0, "index.html has local references", refs.join(", ")));
    results.push(check(unresolved.length === 0, "all index.html references resolve under app/", unresolved.length ? "unresolved: " + unresolved.join(", ") : ""));
    const external: string[] = [];
    const re2: RegExp = /(?:src|href)="(https?:[^"]+)"/g;
    let m2: RegExpExecArray | null;
    while ((m2 = re2.exec(html)) !== null) external.push(m2[1]);
    results.push(check(external.length === 0, "index.html loads nothing from the network (offline-safe)", external.length ? external.join(", ") : ""));
  } catch (err) {
    results.push(check(false, "index.html reads", err instanceof Error ? err.message : String(err)));
  }

  // 4. JS syntax valid (app.js + main.ts itself is already running, so it parsed).
  try {
    execFileSync(process.execPath, ["--check", join(APP_DIR, "app.js")], { stdio: "pipe" });
    results.push(check(true, "app/app.js syntax valid"));
  } catch (err) {
    results.push(check(false, "app/app.js syntax valid", err instanceof Error ? err.message : String(err)));
  }

  // 5. No external URLs inside app.js / style.css either.
  for (const rel of ["app/app.js", "app/style.css"]) {
    try {
      const text: string = readFileSync(join(ROOT, rel), "utf8");
      const hasExternal: boolean = /https?:\/\//.test(text) && !/w3\.org/.test(text);
      results.push(check(!hasExternal, rel + " has no external URLs", hasExternal ? "external URL found" : ""));
    } catch (err) {
      results.push(check(false, rel + " reads", err instanceof Error ? err.message : String(err)));
    }
  }

  return results;
}

function runBuild(): boolean {
  const results: Check[] = validate();
  let failed: number = 0;
  for (const r of results) {
    console.log((r.ok ? "PASS" : "FAIL") + "  " + r.label + (r.detail ? "  (" + r.detail + ")" : ""));
    if (!r.ok) failed++;
  }
  console.log(failed === 0 ? "\nBuild OK: " + results.length + " checks passed." : "\nBuild FAILED: " + failed + " of " + results.length + " checks failed.");
  return failed === 0;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function serve(): void {
  const server = createServer((req, res) => {
    const urlPath: string = decodeURIComponent((req.url || "/").split("?")[0]);
    const safe: string = urlPath === "/" ? "/index.html" : urlPath;
    const file: string = join(APP_DIR, safe);
    if (!file.startsWith(APP_DIR) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found: " + safe + "\n");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  server.listen(PORT, () => {
    console.log("Leonida Trophy Atlas serving at http://localhost:" + PORT + "/");
    console.log("Press Ctrl+C to stop.");
  });
}

const cmd: string = process.argv[2] || "build";
if (cmd === "build") {
  process.exit(runBuild() ? 0 : 1);
} else if (cmd === "serve") {
  if (!runBuild()) {
    console.error("Refusing to serve: build checks failed. Fix the failures above first.");
    process.exit(1);
  }
  serve();
} else {
  console.error("Usage: node main.ts [build|serve]");
  process.exit(2);
}
