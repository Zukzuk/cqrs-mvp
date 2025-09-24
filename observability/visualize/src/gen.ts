import { loadCompose } from './services/loadCompose';
import { writeDsl } from './services/writeDsl';
import { buildDsl } from './services/buildDsl';

(async () => {
  try {
    const root = process.cwd();
    // Load Docker Compose configuration
    const compose = await loadCompose(root);
    // Build Structurizr DSL from Compose configuration
    const dsl = buildDsl(compose);
    // Write DSL to file and launch Structurizr Lite
    writeDsl(dsl, root);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();