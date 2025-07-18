import { loadCompose } from './loadCompose';
import { buildDsl } from './createDsl';
import { launchStructurizrUI } from './launch';

(async function main() {
  try {
    const root = process.cwd();
    const compose = await loadCompose(root);
    const dslText = buildDsl(compose);
    launchStructurizrUI(dslText);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
