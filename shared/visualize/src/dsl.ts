import fs from 'fs';
import path from 'path';
import { ComposeFile, ComposeService } from './compose';

const containerDefinition = ([svcName, svc]: [string, ComposeService]): string => {
  const key = svcName.replace(/-/g, '_');
  const name = svc.labels?.['com.diagram.name'] || svcName;
  const tech = svc.labels?.['com.diagram.technology'] || 'unknown';
  const desc = svc.labels?.['com.diagram.description'] || 'unknown';
  return `        ${key} = container "${name}" "${desc}" "${tech}"\n`;
};

export const buildDsl = (compose: ComposeFile): string => {
  const grouped = Object.entries(compose.services)
    .reduce<Record<string, string[]>>((acc, [name, svc]) => {
      const group = svc.labels?.['com.diagram.group'];
      if (group) {
        acc[group] = acc[group] ?? [];
        acc[group].push(name);
      }
      return acc;
    }, {});

  const ungrouped = Object.keys(compose.services)
    .filter(name => !compose.services[name].labels?.['com.diagram.group']);

  let dsl = `workspace {\n  model "${compose.name}" "${compose.description}" {\n    shop = softwareSystem \"${compose.name}\" \"${compose.description}\" {\n`;

  for (const [group, services] of Object.entries(grouped)) {
    dsl += `      group "${group}" {\n`;
    services.forEach(name => dsl += containerDefinition([name, compose.services[name]]));
    dsl += `      }\n`;
  }

  ungrouped.forEach(name => dsl += containerDefinition([name, compose.services[name]]));

  // dependencies
  dsl += Object.entries(compose.services)
    .map(([name, svc]) => (svc.depends_on || [])
      .map(dep => {
        const src = name.replace(/-/g, '_');
        const dst = dep.replace(/-/g, '_');
        return `    ${src} -> ${dst} "depends_on"`;
      })
      .join('\n')
    )
    .filter(Boolean)
    .join('\n') + '\n';

  dsl += `    }\n  }\n` +
         `  views {\n` +
         `    container shop container_diagram \"Container Diagram\" {\n` +
         `      include *\n      autolayout lr\n    }\n` +
         `    theme default\n  }\n}\n`;
  return dsl;
};

export const writeDsl = async (dsl: string, name: string, root: string): Promise<string> => {
  const out = path.join(root, 'diagrams');
  fs.mkdirSync(out, { recursive: true });
  const fileName = `${name}-diagram.dsl`;
  const filePath = path.join(out, fileName);
  fs.writeFileSync(filePath, dsl);
  console.log(`✅ Generated Structurizr DSL → ${filePath}`);
  return fileName;
};
