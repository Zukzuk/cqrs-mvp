import { ComposeFile, ComposeService } from './loadCompose';

/**
 * Tree node representing a group and its nested subgroups.
 */
interface GroupNode {
  children: Map<string, GroupNode>;
  services: string[];
}

/** 
 * Label keys used in ComposeService.annotations 
 */
const LABEL_KEYS = {
  GROUP: 'structurizr.group',
  NAME: 'structurizr.name',
  TECH: 'structurizr.technology',
  PORT: 'structurizr.port',
  DESC: 'structurizr.description',
  DESC_SITE: 'structurizr.description_website',
  TYPE: 'structurizr.type',
} as const;

type LabelKey = typeof LABEL_KEYS[keyof typeof LABEL_KEYS];

/** 
 * Separator for nested groups in labels 
 */
const GROUP_SEPARATOR = '::';

/**
 * Safely retrieves a label value or returns a fallback.
 */
function getLabel(service: ComposeService, key: LabelKey, fallback: string): string {
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
 *
 * - Always emits a block, so we can attach tags.
 * - Adds group-derived tags (Group:<segment>, GroupPath:<path>) to every element.
 */
function renderContainer(
  svcKey: string,
  svc: ComposeService,
  indentLevel = 3,
  inObservability = false,
  groupPath: string[] = []
): string {
  const indent = '  '.repeat(indentLevel);
  const id = svcKey.replace(/-/g, '_');
  const name = getLabel(svc, LABEL_KEYS.NAME, svcKey);
  const technology = getLabel(svc, LABEL_KEYS.TECH, 'unknown');
  const port = getLabel(svc, LABEL_KEYS.PORT, '');
  const description = getLabel(svc, LABEL_KEYS.DESC, '');
  const description_website = getLabel(svc, LABEL_KEYS.DESC_SITE, '');
  const type = getLabel(svc, LABEL_KEYS.TYPE, 'container').toLowerCase();

  // derive tags from group path (e.g., ["Payments","Ingestion"] -> ['Group:Payments','Group:Ingestion','GroupPath:Payments/Ingestion'])
  const groupTags = [
    ...groupPath.map(seg => `Group:${seg}`),
    groupPath.length ? `GroupPath:${groupPath.join('/')}` : ''
  ].filter(Boolean);

  // helper to render a tags block that merges existing tags with group tags
  const renderTags = (extra: string | null = null) =>
    [extra, ...groupTags].filter(Boolean).map(t => `${indent}  tags "${t}"\n`).join('');

  if (type === 'broker') {
    return (
      `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {\n` +
      renderTags('Broker') +
      `${indent}}\n`
    );
  }

  if (type === 'database') {
    const tag = inObservability ? 'DatabaseObservability' : 'Database';
    return (
      `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {\n` +
      renderTags(tag) +
      `${indent}}\n`
    );
  }

  if (type === 'telemetry') {
    if (name.toLowerCase().includes('grafana') || name.toLowerCase().includes('prometheus')) {
      const userId = `${id}_user`;
      return (
        `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {\n` +
        renderTags('Observability') +
        `${indent}}\n` +
        `${indent}${userId} = container "${name}_User" "End user interacting via browser" "Person" {\n` +
        renderTags('PersonObservability') +
        `${indent}}\n` +
        `${indent}${userId} -> ${id} "uses"\n`
      );
    }
    return (
      `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {\n` +
      renderTags('Observability') +
      `${indent}}\n`
    );
  }

  if (type === 'webserver') {
    const serverId = `${id}_server`;
    const userId = `${id}_user`;
    return (
      `${indent}${id} = container "${name} SPA" "${description_website}" "Browser, Socket.io.min [URL]" {\n` +
      renderTags('Webclient') +
      `${indent}}\n` +
      `${indent}${serverId} = container "${name} Server" "${description}" "${technology} [${port}]" {\n` +
      renderTags(null) +
      `${indent}}\n` +
      `${indent}${userId} = container "User" "End user interacting via browser" "Person" {\n` +
      renderTags('Person') +
      `${indent}}\n` +
      `${indent}${serverId} -> ${id} "serves"\n` +
      `${indent}${userId} -> ${id} "uses"\n`
    );
  }

  // default container (now with a block so we can append tags)
  return (
    `${indent}${id} = container "${name}" "${description}" "${technology} [${port}]" {\n` +
    renderTags(null) +
    `${indent}}\n`
  );
}

/**
 * Recursively renders groups and their services **inside an existing softwareSystem**.
 */
function renderGroups(
  node: GroupNode,
  groupName: string,
  depth: number,
  services: Record<string, ComposeService>,
  inObservability = false,
  parentPath: string[] = []
): string {
  const indent = '  '.repeat(depth);
  let result = `\n${indent}group ".${groupName}" {\n`;

  // Are we (or any ancestor) inside Observability?
  const hereOrAboveIsObs = inObservability || groupName === 'Observability';
  const path = [...parentPath, groupName];

  // render services
  for (const svcKey of node.services) {
    result += renderContainer(svcKey, services[svcKey], depth + 1, hereOrAboveIsObs, path);
  }

  // recurse into child groups
  for (const [childName, childNode] of node.children) {
    result += renderGroups(childNode, childName, depth + 1, services, hereOrAboveIsObs, path);
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
      const labelText = customLabel?.replace(/"/g, '\\"') ?? 'depends_on';
      lines.push(`      ${fromId} -> ${toId} "${labelText}"`);
    }
  }

  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Render a full softwareSystem for a top-level group node.
 */
function renderSoftwareSystemForGroup(
  sysId: string,
  sysName: string,
  node: GroupNode,
  services: Record<string, ComposeService>
): string {
  const header = `    ${sysId} = softwareSystem "${sysName}" {\n`;

  // Services directly on this top-level node
  const servicesBlock = node.services
    .map(svcKey => renderContainer(svcKey, services[svcKey], 4, /*inObservability*/ sysName === 'Observability', /*groupPath*/[sysName]))
    .join('');

  // Child groups inside this system
  const groupsBlock = Array.from(node.children.entries())
    .map(([childName, childNode]) =>
      renderGroups(childNode, childName, 4, services, /*inObservability*/ sysName === 'Observability', /*parentPath*/[sysName])
    )
    .join('');

  const footer = `    }\n`;
  return header + servicesBlock + groupsBlock + footer;
}

/**
 * Builds the complete Structurizr DSL from a ComposeFile.
 *
 * - One softwareSystem per **top-level group**
 * - One fallback system for **ungrouped** services
 */
export function buildDsl(compose: ComposeFile): string {
  const { root, ungrouped } = buildGroupTree(compose.services);

  const header = [
    `workspace {`,
    `  model "${compose.name}" {`,
    `    properties {`,
    `      structurizr.groupSeparator "${GROUP_SEPARATOR}"`,
    `    }\n`,
  ].map(line => line + '\n').join('');

  // Systems from top-level groups
  const systemsFromGroups = Array.from(root.children.entries())
    .map(([groupName, node]) => {
      const sysId = `sys_${groupName.replace(/[^A-Za-z0-9_]/g, '_')}`;
      return renderSoftwareSystemForGroup(sysId, groupName, node, compose.services);
    })
    .join('');

  // Fallback system for ungrouped services
  let ungroupedSystem = '';
  if (ungrouped.length) {
    const sysId = `sys_${compose.name.replace(/[^A-Za-z0-9_]/g, '_')}`;
    const sysName = `${compose.description || compose.name} (Ungrouped)`;
    const body = ungrouped
      .map(svcKey => renderContainer(svcKey, compose.services[svcKey], 4, /*inObservability*/ false, /*groupPath*/['Ungrouped']))
      .join('');
    ungroupedSystem = `    ${sysId} = softwareSystem "${sysName}" {\n` + body + `    }\n`;
  }

  const modelClose = `  }\n`;

  // relationships (unchanged)
  const dependencySection = renderDependencies(compose.services);

  // Views: a container view per system + a system landscape
  const viewsHeader = `  views {\n`;

  const groupViews = Array.from(root.children.keys())
    .map(groupName => {
      const sysId = `sys_${groupName.replace(/[^A-Za-z0-9_]/g, '_')}`;
      const viewKey = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return (
        `    container ${sysId} "containers-${viewKey}" "${groupName} containers" {\n` +
        `      include *\n` +
        `    }\n`
      );
    })
    .join('');

  const ungroupedView = ungrouped.length
    ? (() => {
      const sysId = `sys_${compose.name.replace(/[^A-Za-z0-9_]/g, '_')}`;
      return (
        `    container ${sysId} "containers-ungrouped" "Ungrouped containers" {\n` +
        `      include *\n` +
        `    }\n`
      );
    })()
    : '';

  const landscape =
    `    systemlandscape "all-systems" "All systems" {\n` +
    `      include *\n` +
    `    }\n`;

  // Styles (carry over your existing palette)
  const styles = [
    `    styles {`,
    `      element * {`,
    `        shape roundedbox`,
    `        background "royalblue"`,
    `      }`,
    `      element "Broker" {`,
    `        shape hexagon`,
    `        background "tomato"`,
    `      }`,
    `      element "Observability" {`,
    `        shape roundedbox`,
    `        background "darkorange"`,
    `      }`,
    `      element "Database" {`,
    `        shape cylinder`,
    `        background "orchid"`,
    `      }`,
    `      element "DatabaseObservability" {`,
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
    `      element "PersonObservability" {`,
    `        shape person`,
    `        background "seagreen"`,
    `      }`,
    `    }`,
    `    theme default`,
  ].map(line => line + '\n').join('');

  const viewsClose = `  }\n`;
  const wsClose = `}\n`;

  return (
    header +
    systemsFromGroups +
    ungroupedSystem +
    dependencySection +
    modelClose +
    viewsHeader +
    groupViews +
    ungroupedView +
    landscape +
    styles +
    viewsClose +
    wsClose
  );
}
