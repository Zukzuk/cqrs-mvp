import fs from 'fs';
import path from 'path';
import { ComposeFile, ComposeService } from './compose';

const containerDefinition = ([svcName, svc]: [string, ComposeService]): string => {
  const key = svcName.replace(/-/g, '_');
  const name = svc.labels?.['com.diagram.name'] || svcName;
  const tech = svc.labels?.['com.diagram.technology'] || 'unknown';
  const desc = svc.labels?.['com.diagram.description'] || 'unknown';
  return `        ${key} = container "${name}" "${desc}" "${tech}"
`;
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

  let dsl = `workspace {
  model "${compose.name}" "${compose.description}" {
    shop = softwareSystem "${compose.name}" "${compose.description}" {
`;

  // grouped containers
  for (const [group, services] of Object.entries(grouped)) {
    dsl += `      group "${group}" {
`;
    services.forEach(name => dsl += containerDefinition([name, compose.services[name]]));
    dsl += `      }
`;
  }

  // ungrouped containers
  ungrouped.forEach(name => dsl += containerDefinition([name, compose.services[name]]));

  // dependencies with optional custom labels
  dsl += Object.entries(compose.services)
    .flatMap(([name, svc]) =>
      (svc.depends_on || []).map(dep => {
        const src = name.replace(/-/g, '_');
        const dst = dep.replace(/-/g, '_');
        const labelKey = `com.diagram.depends_on.${dep}`;
        const customText = svc.labels?.[labelKey]?.replace(/"/g, '\\"');
        const relText = customText ?? 'depends_on';
        return `    ${src} -> ${dst} "${relText}"`;
      })
    )
    .join('\n') + '\n';

  // close model blocks
  dsl += `    }
  }
`;

  // views and styling
  dsl += `  views {
` +
         `    container shop container_diagram "Container Diagram" {
` +
         `      include *
` +
         `      autolayout lr
` +
         `    }
` +
         `    theme default
` +
         `  }
` +
         `}
`;

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
