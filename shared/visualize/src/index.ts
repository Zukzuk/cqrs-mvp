// src/main.ts

import { loadCompose } from './compose';
import { buildDsl } from './dsl';
import { launchStructurizrUI } from './launch';

(async function main() {
  try {
    const root = process.cwd();
    const { name } = await loadCompose(root);

    const compose = await loadCompose(root);
    const dslText = buildDsl(compose);

    launchStructurizrUI(dslText, name, 8000);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
