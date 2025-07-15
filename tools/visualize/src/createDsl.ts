import fs from 'fs';
import path from 'path';
import { ComposeFile, ComposeService } from './loadCompose';

/**
 * Tree node representing a group and its nested subgroups.
 */
interface GroupNode {
  children: Map<string, GroupNode>;
  services: string[];
}

/** Label keys used in ComposeService.annotations */
const LABEL_KEYS = {
  GROUP: 'structurizr.group',
  NAME: 'structurizr.name',
  TECH: 'structurizr.technology',
  PORT: 'structurizr.port',
  DESC: 'structurizr.description',
  DESC_SITE: 'structurizr.description_website',
  TYPE: 'structurizr.type',
};

/** Separator for nested groups in labels */
const GROUP_SEPARATOR = '::';

/**
 * Safely retrieves a label value or returns a fallback.
 */
function getLabel(service: ComposeService, key: string, fallback: string): string {
  return service.labels?.[key] ?? fallback;
}

/**
 * Splits a group label into trimmed segments.
 */
function splitGroupPath(label: string): string[] {
  return label
    .split(GROUP_SEPARATOR)
    .map(segment => segment.trim())
    .filter(Boolean);
}

/**
 * Initializes an empty GroupNode.
 */
function createGroupNode(): GroupNode {
  return { children: new Map(), services: [] };
}

/**
 * Builds a hierarchical tree of groups from services.
 */
function buildGroupTree(services: Record<string, ComposeService>): { root: GroupNode; ungrouped: string[] } {
  const root = createGroupNode();
  const ungrouped: string[] = [];

  for (const [svcKey, svc] of Object.entries(services)) {
    const groupLabel = svc.labels?.[LABEL_KEYS.GROUP];
    if (!groupLabel) {
      ungrouped.push(svcKey);
      continue;
    }

    let currentNode = root;
    for (const segment of splitGroupPath(groupLabel)) {
      if (!currentNode.children.has(segment)) {
        currentNode.children.set(segment, createGroupNode());
      }
      currentNode = currentNode.children.get(segment)!;
    }
    currentNode.services.push(svcKey);
  }

  return { root, ungrouped };
}

/**
 * Renders a single container declaration in DSL.
 */
function renderContainer(svcKey: string, svc: ComposeService, indentLevel = 3): string {
  const indent = '  '.repeat(indentLevel);

  const id = svcKey.replace(/-/g, '_');
  const name = getLabel(svc, LABEL_KEYS.NAME, svcKey);
  const technology = getLabel(svc, LABEL_KEYS.TECH, 'unknown');
  const port = getLabel(svc, LABEL_KEYS.PORT, '');
  const description = getLabel(svc, LABEL_KEYS.DESC, '');
  const description_website = getLabel(svc, LABEL_KEYS.DESC_SITE, '');
  const type = getLabel(svc, LABEL_KEYS.TYPE, 'container').toLowerCase();

  if (type === 'broker') {
    return [`${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {`,
            `${indent}  tags "Broker"`,
            `${indent}}`]
      .map(line => line + '\n')
      .join('');
  }

  if (type === 'database') {
    return [`${indent}${id} = container "${name}" "${description}" "${technology} [${port}]"" {`,
            `${indent}  tags "Database"`,
            `${indent}}`]
      .map(line => line + '\n')
      .join('');
  }

  // Special handling for webserver
  else if (type === 'webserver') {
    // IDs for the generated Browser and User containers
    const serverId = `${id}_server`;
    const userId    = `${id}_user`;

    return [`${indent}${id} = container "${name} SPA" "${description_website}" "Browser, Socket.io.min [URL]" {`,
            `${indent}  tags "Webclient"`,
            `${indent}}`,
            `${indent}${serverId} = container "${name} Server" "${description}" "${technology} [${port}]"`,
            `${indent}${userId} = container "User" "End user interacting via browser" "Person" {`,
            `${indent}  tags "Person"`,
            `${indent}}`,
            `${indent}${serverId} -> ${id} "serves"`,
            `${indent}${userId} -> ${id} "uses"`]
      .map(line => line + '\n')
      .join('');
  }

  return `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]"\n`;
}

/**
 * Recursively renders groups and their services.
 */
function renderGroups(node: GroupNode, groupName: string, depth: number, services: Record<string, ComposeService>): string {
  const indent = '  '.repeat(depth);
  let result = `\n${indent}group ".${groupName}" {\n`;

  // Render child services
  for (const svcKey of node.services) {
    result += renderContainer(svcKey, services[svcKey], depth + 1);
  }

  // Render nested groups
  for (const [childName, childNode] of node.children) {
    result += renderGroups(childNode, childName, depth + 1, services);
  }

  result += `${indent}}\n`;
  return result;
}

/**
 * Renders all docker-compose 'depends_on' as relationships.
 */
function renderDependencies(services: Record<string, ComposeService>): string {
  const lines: string[] = ['\n'];

  for (const [svcKey, svc] of Object.entries(services)) {
    const fromId = svcKey.replace(/-/g, '_');
    for (const dep of svc.depends_on || []) {
      const toId = dep.replace(/-/g, '_');
      const customLabel = svc.labels?.[`structurizr.depends_on.${dep}`];
      const labelText = customLabel?.replace(/"/g, '\"') ?? 'depends_on';
      lines.push(`      ${fromId} -> ${toId} "${labelText}"`);
    }
  }

  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Builds the complete Structurizr DSL from a ComposeFile.
 */
export function buildDsl(compose: ComposeFile): string {
  const { root, ungrouped } = buildGroupTree(compose.services);

  const header = [`workspace {`,
                  `  model "${compose.name}" {`,
                  `    properties {`,
                  `      structurizr.groupSeparator "${GROUP_SEPARATOR}"`,
                  `    }\n`,
                  `    shop = softwareSystem "${compose.description}" {`]
    .map(line => line + '\n')
    .join('');

  const groupSections = Array.from(root.children.entries())
    .map(([groupName, node]) => renderGroups(node, groupName, 3, compose.services))
    .join('');

  const ungroupedSections = ungrouped
    .map(svcKey => renderContainer(svcKey, compose.services[svcKey], 3))
    .join('');

  const dependencySection = renderDependencies(compose.services);

  // check https://docs.structurizr.com/ui/diagrams/notation
  // check https://www.w3schools.com/cssref/css_colors.php
  const footer = [`    }`,
                  `  }\n`,
                  `  views {`,
                  `    container shop container_view "Container Diagram" {`,
                  `      include *`,
                  `    }`,
                  `    styles {`,
                  `      element * {`,
                  `        shape roundedbox`,
                  `        background "royalblue"`,
                  `      }`,
                  `      element "Broker" {`,
                  `        shape hexagon`,
                  `        background "tomato"`,
                  `      }`,
                  `      element "Database" {`,
                  `        shape cylinder`,
                  `        background "orchid"`,
                  `      }`,
                  `      element "Webclient" {`,
                  `        shape webbrowser`,
                  `        background "seagreen"`,
                  `      }`,
                  `      element "Person" {`,
                  `        background "seagreen"`,
                  `      }`,
                  `    }`,
                  `    theme default`,
                  `  }`,
                  `}`]
    .map(line => line + '\n')
    .join('');

  return header + groupSections + ungroupedSections + dependencySection + footer;
}

/**
 * Writes the DSL text to disk under `<rootDir>/diagrams`.
 */
export async function writeDsl(dsl: string, projectName: string, rootDir: string): Promise<string> {
  const outputDir = path.join(rootDir, 'diagrams');
  fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `${projectName}-diagram.dsl`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, dsl, { encoding: 'utf-8' });
  console.log(`✅ DSL generated: ${filePath}`);

  return fileName;
}
