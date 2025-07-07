#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

interface ComposeService {
  labels?: Record<string, string>;
  depends_on?: Record<string, any> | string[];
  image?: string;
}
interface ComposeFile {
  services: Record<string, ComposeService>;
}

async function main() {
  const cwd = process.cwd();
  const projectRoot = cwd;

  const composePath = path.resolve(projectRoot, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) {
    console.error(`❌ Cannot find docker-compose.yml at ${composePath}`);
    process.exit(1);
  }

  console.log(`📖 Reading ${composePath}`);
  const compose = yaml.load(fs.readFileSync(composePath, 'utf8')) as ComposeFile;
  const pkgPath = path.resolve(projectRoot, 'package.json');
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    : { name: 'app', description: '' };

  // --- build the Structurizr DSL ---
  let dsl = `
workspace {
  model "${pkg.name}" "${pkg.description}" {
    shop = softwareSystem "${pkg.name}" "${pkg.description}" {
`;

  // 1) container definitions
  for (const [svcName, svc] of Object.entries(compose.services)) {
    const key = svcName.replace(/[-]/g, '_');
    const name = svc.labels?.['com.diagram.name'] || svcName;
    const tech = svc.labels?.['com.diagram.technology'] || (svc.image || '').split(':')[0] || 'unknown';
    const imageName = svc.image;

    let desc: string;
    if (svc.labels?.['com.diagram.description']) {
      desc = svc.labels['com.diagram.description'];
    } else if (imageName) {
      desc = `[Image: ${imageName}]`;
    } else {
      desc = '';
    }

    dsl += `      ${key} = container "${name}" "${desc}" "${tech}"
`;
  }

  // close softwareSystem block
  dsl += `    }
`;

  // 2) dependency relationships (array-style only)
  for (const [svcName, svc] of Object.entries(compose.services)) {
    const srcKey = svcName.replace(/[-]/g, '_');
    const targets = Array.isArray(svc.depends_on) ? svc.depends_on as string[] : [];
    for (const dep of targets) {
      if (!compose.services[dep]) continue;
      const dstKey = dep.replace(/[-]/g, '_');
      dsl += `    ${srcKey} -> ${dstKey} "depends_on"
`;
    }
  }

  // close model block
  dsl += `  }

`;

  // 3) views
  dsl += `  views {
    container shop container_diagram "Container Diagram" {
      include *
      autolayout lr
    }
    theme default
  }
}
`;

  // write DSL file
  const outDir = path.resolve(projectRoot, 'diagrams');
  fs.mkdirSync(outDir, { recursive: true });
  const dslPath = path.join(outDir, `${pkg.name}-diagram.dsl`);
  fs.writeFileSync(dslPath, dsl.trim() + '\n');
  console.log(`✅ Generated Structurizr DSL → ${dslPath}`);

  // 4) export Mermaid and convert to SVG
  console.log('🚀 Exporting Mermaid (.mmd)');
  try {
    execSync(
      `docker run --rm -v "${outDir}:/diagrams" structurizr/cli export -workspace /diagrams/${path.basename(
        dslPath
      )} -format mermaid -output /diagrams`,
      { stdio: 'inherit' }
    );
  } catch (err: any) {
    console.error('❌ Mermaid export failed:', err.message);
    process.exit(1);
  }

  console.log('🎨 Converting .mmd → .svg');
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.mmd'));
  for (const file of files) {
    const mmdPath = path.join(outDir, file);
    const svgPath = path.join(outDir, `${pkg.name}-diagram.svg`);
    try {
      execSync(`npx @mermaid-js/mermaid-cli -i ${mmdPath} -o ${svgPath}`, { stdio: 'inherit' });
      fs.unlinkSync(mmdPath);
      console.log(`✅ Converted ${file} → ${path.basename(svgPath)}`);
    } catch (err: any) {
      console.error(`❌ Conversion failed for ${file}:`, err.message);
    }
  }

  console.log('🎉 All SVG diagrams are ready in your diagrams folder');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
