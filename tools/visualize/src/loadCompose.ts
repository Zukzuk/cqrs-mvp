import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface ComposeService {
  labels?: Record<string, string>;
  depends_on?: string[];
  image?: string;
}
export interface ComposeFile {
  name: string;
  description: string;
  services: Record<string, ComposeService>;
}

export const loadCompose = async (root: string): Promise<ComposeFile> => {
  const composePath = path.join(root, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    throw new Error(`docker-compose.yml not found at ${composePath}`);
  }

  const raw = fs.readFileSync(composePath, 'utf8');
  const parsed = yaml.load(raw) as any;

  const pkgPath = path.join(root, 'package.json');
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    : { name: 'app', description: '' };

  return {
    name: pkg.name,
    description: pkg.description,
    services: parsed.services || {}
  };
};