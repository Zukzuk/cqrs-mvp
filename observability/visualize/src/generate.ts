import fs from 'fs';
import path from 'path';
import { loadCompose } from './loadCompose';
import { buildDsl } from './createDsl';

(async () => {
  const root = process.cwd();
  const compose = await loadCompose(root, {
    files: ['docker-compose.yml', 'docker-compose.obs.yml'],
    profiles: ['obs']
  });
  const dslText = buildDsl(compose);

  const outDir = path.join(root, 'diagram');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, 'workspace.dsl');
  fs.writeFileSync(filePath, dslText, 'utf-8');
  console.log(`✅ DSL written to ${filePath}`);
})();
