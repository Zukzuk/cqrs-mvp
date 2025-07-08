import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const exportMermaid = (name: string, root: string, dslFile: string): void => {
  const out = path.join(root, 'diagrams');

  console.log('🎨 Converting .mmd → .svg');
  execSync(
    `docker run --rm -v "${out}:/diagrams" structurizr/cli export -workspace /diagrams/${dslFile} -format mermaid -output /diagrams`,
    { stdio: 'inherit' }
  );

  fs.readdirSync(out)
    .filter(f => f.endsWith('.mmd'))
    .forEach(file => {
      const src = path.join(out, file);
      const dest = path.join(out, `${name}-diagram.dsl.svg`);
      execSync(`npx @mermaid-js/mermaid-cli -i ${src} -o ${dest}`, { stdio: 'inherit' });
      fs.unlinkSync(src);
      console.log(`✅ Converted ${file} → ${dest}`);
    });
};
