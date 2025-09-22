// concat-sources.js
import fs from "fs";
import path from "path";

const rootDir = "./";                           // startmap
const outputFile = "./scripts/codebase.txt"; // outputbestand

// Mappen negeren (exacte mapnamen)
const ignoreDirs = new Set([
  "node_modules",
  "dist",
  ".git",
  "grafana",
  "mongoui",
  "visualize",
  "scripts",
]);

// Bestanden negeren (exacte bestandsnamen)
const ignoreFiles = new Set([
  "package-lock.json",
  "workspace.json",
  "tsconfig.json",
]);

// Extensies die we willen meenemen
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

/**
 * Check of dit bestand moet worden opgenomen.
 */
function shouldIncludeFile(entryName) {
  // Exclude specifieke filenames
  if (ignoreFiles.has(entryName)) return false;

  // Dockerfile (en varianten zoals Dockerfile.dev)
  if (entryName === "Dockerfile" || entryName.startsWith("Dockerfile.")) return true;

  // .env (en varianten zoals .env.local)
  if (entryName === ".env" || entryName.startsWith(".env.")) return true;

  // Op extensie
  const ext = path.extname(entryName).toLowerCase();
  return includeExts.has(ext);
}

/**
 * Recursief alle bestanden ophalen met filters.
 */
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        collectFiles(fullPath);
      }
    } else if (entry.isFile()) {
      if (!shouldIncludeFile(entry.name)) continue;

      const relativePath = path.relative(rootDir, fullPath) || entry.name;
      const content = fs.readFileSync(fullPath, "utf-8");

      result += `\n\n===== ${relativePath} =====\n\n`;
      result += content.endsWith("\n") ? content : content + "\n";
    }
  }
}

collectFiles(rootDir);
fs.writeFileSync(outputFile, result, "utf-8");
console.log(`✅ Samengevoegd naar ${outputFile}`);
