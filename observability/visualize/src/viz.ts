import { loadCompose } from './services/loadCompose';
import { buildDsl } from './services/buildDsl';
import { writeDsl } from './services/writeDsl';
import { launchDocker } from './services/launchDocker';

(async () => {
  try {
    const root = process.cwd();
    // Load Docker Compose configuration
    const compose = await loadCompose(root);
    // Build Structurizr DSL from Compose configuration
    const dsl = buildDsl(compose);
    // Write DSL to file and launch Structurizr Lite
    writeDsl(dsl, root);
    // Launch Structurizr Lite in Docker
    launchDocker(dsl);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
