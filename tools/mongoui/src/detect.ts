import { execSync } from 'child_process';

export function detectMongoContainers(): string[] {
  try {
    // Only containers with the label structurizr.technology=MongoDB
    const out = execSync(
      `docker ps \
       --filter label=structurizr.technology=MongoDB \
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
