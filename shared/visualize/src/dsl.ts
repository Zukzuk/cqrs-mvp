import fs from 'fs';
import path from 'path';
import { ComposeFile, ComposeService } from './compose';

/**
 * Tree node representing a group and its nested subgroups.
 */
interface GroupNode {
  /** Map of subgroup name to its node */
  children: Map<string, GroupNode>;
  /** List of service keys in this group */
  services: string[];
}

/** Label keys used in ComposeService.annotations */
const LABEL_KEYS = {
  GROUP: 'structurizr.group',
  NAME: 'structurizr.name',
  TECH: 'structurizr.technology',
  DESC: 'structurizr.description',
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
  const description = getLabel(svc, LABEL_KEYS.DESC, 'unknown');
  const type = getLabel(svc, LABEL_KEYS.TYPE, 'container').toLowerCase();

  const header = `${indent}${id} = container "${name}" "${description}" "${technology}"`;

  if (type === 'database') {
    return [`${header} {`,
            `${indent}  tags "Database"`,
            `${indent}}`,
            '']
      .map(line => line + '\n')
      .join('');
  }

  // Special handling for webserver
  else if (type === 'webserver') {
    // IDs for the generated Browser and User containers
    const browserId = `${id}_browser`;
    const userId    = `${id}_user`;

    return [`${header} {`,
            `${indent}  tags "Web Server"`,
            `${indent}}`,
            '',
            `${indent}${browserId} = container "Web SPA" "Web interface for users" "Web Browser"`,
            '',
            `${indent}${userId} = container "User" "End user interacting via browser" "Person" {`,
            `${indent}  tags "Person"`,
            `${indent}}`,
            '',
            `${indent}${id} -> ${browserId} "Serves"`,
            `${indent}${userId} -> ${browserId} "Uses"`,
            '',
          ]
      .map(line => line + '\n')
      .join('');
  }

  return header + '\n';
}

/**
 * Recursively renders groups and their services.
 */
function renderGroups(node: GroupNode, groupName: string, depth: number, services: Record<string, ComposeService>): string {
  const indent = '  '.repeat(depth);
  let result = `${indent}group ".${groupName}" {\n`;

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
 * Renders all inter-service dependencies.
 */
function renderDependencies(services: Record<string, ComposeService>): string {
  const lines: string[] = [];

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
                  `    }`,
                  `    shop = softwareSystem "${compose.description}" {`,
                  '']
    .map(line => line + '\n')
    .join('');

  const groupSections = Array.from(root.children.entries())
    .map(([groupName, node]) => renderGroups(node, groupName, 3, compose.services))
    .join('');

  const ungroupedSections = ungrouped
    .map(svcKey => renderContainer(svcKey, compose.services[svcKey], 3))
    .join('');

  const dependencySection = renderDependencies(compose.services);

  const footer = [`    }`,
                  `  }`,
                  `  views {`,
                  `    container shop container_view "Container Diagram" {`,
                  `      include *`,
                  `      autolayout lr`,
                  `    }`,
                  `    styles {`,
                  `      element "Database" {`,
                  `        shape cylinder`,
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
