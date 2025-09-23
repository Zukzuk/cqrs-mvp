import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * npm run codebase                # scans entire repo (default)
 * npm run codebase -- web         # scans repoRoot/web
 * npm run codebase -- /web        # also scans repoRoot/web (repo-relative)
 * npm run codebase -- ./services/api
 */

// ---------- repo root ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// ---------- argument parsing ----------
const rawArg = process.argv[2] ?? "";

// Turn user input into a start directory inside the repo (or absolute path)
function resolveStartDir(input) {
  if (!input) return repoRoot;

  if (path.isAbsolute(input) && fs.existsSync(input)) return input;

  // strip leading slashes/backslashes to treat "/web" or "\web" as repo-relative
  const cleaned = input.replace(/^[/\\]+/, "");
  return path.resolve(repoRoot, cleaned);
}

const rootDir = resolveStartDir(rawArg);

// ---------- dynamic output name ----------
function makeOutputFile(arg) {
  if (!arg) return path.join(repoRoot, "scripts", "codebase.txt");

  // take the last path segment as folder name
  const lastSeg = path.basename(arg.replace(/[/\\]+$/, "")); // remove trailing slash/backslash first
  const safeSeg = lastSeg || "root";

  return path.join(repoRoot, "scripts", `codebase_${safeSeg}.txt`);
}

const outputFile = makeOutputFile(rawArg);

// ---------- filters ----------
const ignoreDirs = new Set([
  "node_modules",
  "dist",
  ".git",
  "grafana",
  "mongoui",
  "visualize",
  "scripts",
]);
const ignoreFiles = new Set([
  "package-lock.json",
  "workspace.json",
  "tsconfig.json",
]);
const includeExts = new Set([
  ".ts",
  ".sh",
  ".yml",
  ".yaml",
  ".json",
  ".dsl",
  ".html",
  ".conf",
]);

let result = "";

/** check if we should include a file */
function shouldIncludeFile(entryName) {
  if (ignoreFiles.has(entryName)) return false;
  if (entryName === "Dockerfile" || entryName.startsWith("Dockerfile.")) return true;
  if (entryName === ".env" || entryName.startsWith(".env.")) return true;
  return includeExts.has(path.extname(entryName).toLowerCase());
}

/** recursively collect */
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) collectFiles(fullPath);
    } else if (entry.isFile() && shouldIncludeFile(entry.name)) {
      const rel = path.relative(rootDir, fullPath) || entry.name;
      const relativePath = rel.split(path.sep).join("/"); // normalise for headers
      const content = fs.readFileSync(fullPath, "utf-8");
      result += `\n\n===== ${relativePath} =====\n\n`;
      result += content.endsWith("\n") ? content : content + "\n";
    }
  }
}

// ---------- run ----------
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
collectFiles(rootDir);
fs.writeFileSync(outputFile, result, "utf-8");

console.log(`✅ Samengevoegd naar ${outputFile}`);
console.log(`🔎 Bronstart: ${rootDir}`);