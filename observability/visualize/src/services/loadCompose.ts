import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { spawnSync } from 'child_process';

export interface ComposeService {
  labels?: Record<string, string>;
  depends_on?: string[];  // normalized to array
  image?: string;
}

export interface ComposeFile {
  name: string;
  description: string;
  services: Record<string, ComposeService>;
}

/** Discover docker-compose files in a stable order (root + workspaces; supports * and **). */
function discoverComposeFiles(root: string): string[] {
  // ---- 1) Root files (unchanged behavior) ----
  const entries: string[] = fs.readdirSync(root);
  const isCompose = (f: string) => /^docker-compose(\.[^.]*)?\.ya?ml$/i.test(f);
  const files: string[] = entries.filter(isCompose);

  if (!files.includes('docker-compose.yml')) {
    throw new Error(`docker-compose.yml not found in ${root}`);
  }

  const rootMain = 'docker-compose.yml';
  const rootObs: string | undefined = files.find(f => f.toLowerCase() === 'docker-compose.obs.yml');
  const rootOthers: string[] = files
    .filter(f => f !== rootMain && f !== rootObs)
    .sort((a, b) => a.localeCompare(b));

  // ---- 2) Workspaces (supports: direct dir, "<base>/*" one level, "<base>/**" recursive) ----
  const pkgPath = path.join(root, 'package.json');
  const pkg: any = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
  const patterns: string[] = Array.isArray(pkg?.workspaces)
    ? (pkg.workspaces as string[])
    : (pkg?.workspaces?.packages ?? []);

  const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.turbo', '.cache']);
  const relPosix = (p: string) => p.split(path.sep).join('/');

  const addDirsRecursive = (baseAbs: string, baseRel: string, acc: Set<string>): void => {
    if (!fs.existsSync(baseAbs) || !fs.statSync(baseAbs).isDirectory()) return;
    for (const entry of fs.readdirSync(baseAbs)) {
      if (IGNORE.has(entry)) continue;
      const abs = path.join(baseAbs, entry);
      if (!fs.statSync(abs).isDirectory()) continue;
      const rel = relPosix(path.join(baseRel, entry));
      acc.add(rel);
      addDirsRecursive(abs, rel, acc);
    }
  };

  const dirs: Set<string> = new Set<string>();

  for (const raw of patterns || []) {
    const pat = String(raw).replace(/\\/g, '/').replace(/\/+$/, '');

    if (pat.includes('/**')) {
      // Recursive glob: "<base>/**" — include base + all subdirs
      const base = pat.replace(/\/\*\*.*$/, '');
      const baseAbs = path.join(root, base);
      if (fs.existsSync(baseAbs) && fs.statSync(baseAbs).isDirectory()) {
        dirs.add(base); // include base itself
        addDirsRecursive(baseAbs, base, dirs);
      }
      continue;
    }

    if (pat.includes('/*')) {
      // One-level glob: "<base>/*" — include base + one-level children
      const base = pat.replace(/\/\*.*$/, '');
      const baseAbs = path.join(root, base);
      if (!fs.existsSync(baseAbs) || !fs.statSync(baseAbs).isDirectory()) continue;

      dirs.add(base); // include base itself

      for (const entry of fs.readdirSync(baseAbs)) {
        if (IGNORE.has(entry)) continue;
        const abs = path.join(baseAbs, entry);
        if (fs.statSync(abs).isDirectory()) {
          dirs.add(relPosix(path.join(base, entry)));
        }
      }
      continue;
    }

    // Direct directory
    const abs = path.join(root, pat);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      dirs.add(pat);
    }
  }

  // ---- 3) Collect compose files from discovered dirs ----
  const wsMains: string[] = [];
  const obsFiles: string[] = [];

  for (const rel of [...dirs].sort((a, b) => a.localeCompare(b))) {
    const abs = path.join(root, rel);
    const mainPath = path.join(abs, 'docker-compose.yml');
    if (fs.existsSync(mainPath)) wsMains.push(relPosix(path.join(rel, 'docker-compose.yml')));
  }

  if (rootObs) obsFiles.push(rootObs);
  obsFiles.sort((a, b) => a.localeCompare(b));

  // Final order: root main → root others → workspace mains → all obs
  const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
  return uniq([rootMain, ...rootOthers, ...wsMains, ...obsFiles]);
}

/** Prefer docker compose (V2), fallback to docker-compose (legacy). */
function resolveComposeInvocation() {
  const tryRun = (cmd: string[], cwd: string) =>
    spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8' });

  return (cwd: string) => {
    let res = tryRun(['docker', 'compose', 'version'], cwd);
    if (res.status === 0) return ['docker', 'compose'];
    res = tryRun(['docker-compose', 'version'], cwd);
    if (res.status === 0) return ['docker-compose'];
    throw new Error('Neither "docker compose" nor "docker-compose" is available on PATH.');
  };
}

/** Collect the union of all profiles referenced by services across the discovered files. */
function collectProfiles(root: string, files: string[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    const doc = yaml.load(txt) as any;
    const svcs = doc?.services || {};
    for (const [, svc] of Object.entries<any>(svcs)) {
      const prof = svc?.profiles;
      if (Array.isArray(prof)) prof.forEach((x: string) => x && set.add(x));
      else if (typeof prof === 'string' && prof.trim()) set.add(prof.trim());
    }
  }
  return Array.from(set);
}

/** Run `docker compose ... config` to get the merged, env-expanded YAML. */
function dockerComposeConfig(root: string, files: string[], profiles: string[] = []): string {
  const compose = resolveComposeInvocation()(root);
  const args = [
    ...files.flatMap(f => ['-f', f]),
    ...(profiles.length ? ['--profile', ...profiles] : []),
    'config'
  ];
  const { status, stdout, stderr } = spawnSync(compose[0], [...compose.slice(1), ...args], {
    cwd: root,
    encoding: 'utf8'
  });
  if (status !== 0) throw new Error(`"docker compose config" failed:\n${stderr || stdout}`);
  return stdout;
}

/** Normalize depends_on (object → string[]) from `docker compose config` output. */
function normalizeDependsOn(dep: any): string[] {
  if (!dep) return [];
  if (Array.isArray(dep)) return dep;
  return Object.keys(dep);
}

/** Some docker compose outputs flatten labels as string[] ("k=v"). Normalize to object. */
function normalizeLabels(labels: any): Record<string, string> | undefined {
  if (!labels) return undefined;
  if (Array.isArray(labels)) {
    const obj: Record<string, string> = {};
    for (const kv of labels) {
      if (typeof kv === 'string' && kv.includes('=')) {
        const i = kv.indexOf('=');
        obj[kv.slice(0, i)] = kv.slice(i + 1);
      }
    }
    return obj;
  }
  if (typeof labels === 'object') return labels as Record<string, string>;
  return undefined;
}

export const loadCompose = async (root: string): Promise<ComposeFile> => {
  const files = discoverComposeFiles(root);
  const profiles = collectProfiles(root, files);  // auto-enable all referenced profiles
  console.log('🔎 compose files (merge order):', files.join('  →  '));
  if (profiles.length) console.log('🧩 enabling profiles:', profiles.join(', '));

  const mergedYaml = dockerComposeConfig(root, files, profiles);
  const parsed = yaml.load(mergedYaml) as any;

  // Guardrail: friendly depends_on error if something is still missing
  const serviceNames = new Set(Object.keys(parsed.services || {}));
  for (const [name, svc] of Object.entries<any>(parsed.services || {})) {
    const deps = normalizeDependsOn((svc as any).depends_on);
    for (const dep of deps) {
      if (!serviceNames.has(dep)) {
        throw new Error(
          `depends_on error: "${name}" references missing "${dep}". ` +
          `Likely hidden by profiles or overridden in a later compose file.`
        );
      }
    }
  }

  // Workspace metadata from package.json
  const pkgPath = path.join(root, 'package.json');
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    : { name: 'app', description: '' };

  const services: Record<string, ComposeService> = {};
  for (const [name, svc] of Object.entries<any>(parsed.services || {})) {
    services[name] = {
      labels: normalizeLabels((svc as any).labels),
      depends_on: normalizeDependsOn((svc as any).depends_on),
      image: (svc as any).image
    };
  }

  return { name: pkg.name, description: pkg.description, services };
};
