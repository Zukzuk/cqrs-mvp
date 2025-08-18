import { execSync } from 'child_process';

export function detectMongoContainers(): string[] {
  try {
    const out = execSync(
      `docker ps \
       --filter label=structurizr.type=database \
       --format "{{.Names}}"`
    ).toString();

    return out
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('⚠️  Could not run docker ps:', err);
    return [];
  }
}
