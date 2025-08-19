// observability/visualize/src/loadCompose.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { spawnSync } from 'child_process';

export interface ComposeService {
  labels?: Record<string, string>;
  depends_on?: string[];       // normalized to array
  image?: string;
}

export interface ComposeFile {
  name: string;
  description: string;
  services: Record<string, ComposeService>;
}

type LoadOptions = {
  files: string[];            // e.g., ['docker-compose.yml','docker-compose.obs.yml']
  profiles?: string[];        // e.g., ['obs']
};

/**
 * Try 'docker compose' first (V2), then 'docker-compose' (legacy).
 */
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

/**
 * Run `docker compose ... config` to obtain the merged, profiled, env-expanded YAML.
 */
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
  if (status !== 0) {
    throw new Error(`"docker compose config" failed:\n${stderr || stdout}`);
  }
  return stdout;
}

/**
 * Normalize depends_on (object → string[]) from `docker compose config` output.
 */
function normalizeDependsOn(dep: any): string[] {
  if (!dep) return [];
  if (Array.isArray(dep)) return dep;
  // when compose emits: { serviceA: { condition: '...' }, serviceB: {} }
  return Object.keys(dep);
}

export const loadCompose = async (root: string, opts?: LoadOptions): Promise<ComposeFile> => {
  const files = opts?.files ?? ['docker-compose.yml'];
  // sanity: ensure primary file exists; others are optional
  const mainPath = path.join(root, files[0]);
  if (!fs.existsSync(mainPath)) {
    throw new Error(`${files[0]} not found at ${mainPath}`);
  }

  // Effective YAML from docker compose config
  const mergedYaml = dockerComposeConfig(root, files, opts?.profiles);
  const parsed = yaml.load(mergedYaml) as any;

  // Name/description from package.json (nice for Structurizr workspace metadata)
  const pkgPath = path.join(root, 'package.json');
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    : { name: 'app', description: '' };

  // Normalize services
  const services: Record<string, ComposeService> = {};
  for (const [name, svc] of Object.entries<any>(parsed.services || {})) {
    services[name] = {
      labels: (svc.labels ?? {}) as Record<string, string>,
      depends_on: normalizeDependsOn(svc.depends_on),
      image: svc.image
    };
  }

  return {
    name: pkg.name,
    description: pkg.description,
    services
  };
};
