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

/** Discover docker-compose files in a stable order. */
function discoverComposeFiles(root: string): string[] {
  const entries = fs.readdirSync(root);
  const isCompose = (f: string) => /^docker-compose(\.[^.]*)?\.ya?ml$/i.test(f);
  const files = entries.filter(isCompose);

  if (!files.includes('docker-compose.yml')) {
    throw new Error(`docker-compose.yml not found in ${root}`);
  }

  const main = 'docker-compose.yml';
  const obs = files.find(f => f.toLowerCase() === 'docker-compose.obs.yml');
  const others = files
    .filter(f => f !== main && f !== obs)
    .sort((a, b) => a.localeCompare(b));

  // Final order: main → others (alpha) → obs (last if present)
  return [main, ...others, ...(obs ? [obs] : [])];
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
    const deps = normalizeDependsOn(svc.depends_on);
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
      labels: (svc.labels ?? {}) as Record<string, string>,
      depends_on: normalizeDependsOn(svc.depends_on),
      image: svc.image
    };
  }

  return { name: pkg.name, description: pkg.description, services };
};
