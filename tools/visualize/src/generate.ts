import fs from 'fs';
import path from 'path';
import { loadCompose } from './compose';
import { buildDsl } from './dsl';

(async () => {
    const root = process.cwd();
    const compose = await loadCompose(root);
    const dslText = buildDsl(compose);

    const outDir = path.join(root, 'diagram');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const fileName = `workspace.dsl`;
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, dslText, 'utf-8');

    console.log(`✅ DSL written to ${filePath}`);
})();
