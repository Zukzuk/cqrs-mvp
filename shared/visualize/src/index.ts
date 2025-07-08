import { loadCompose } from './compose';
import { buildDsl, writeDsl } from './dsl';
import { exportMermaid } from './exporter';

(async function main() {
  try {
    const root = process.cwd();
    const { name } = await loadCompose(root);
    const dsl = buildDsl(await loadCompose(root));
    const dslFile = await writeDsl(dsl, name, root);
    await exportMermaid(name, root, dslFile);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();