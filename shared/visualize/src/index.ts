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

    // now launch Structurizr UI on port 7000
    launchStructurizrUI(dslText, name, 7000);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
