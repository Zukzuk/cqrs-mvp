#!/usr/bin/env node
const fs = require('fs');
const yaml = require('js-yaml');

// Load docker-compose.yml
const compose = yaml.load(fs.readFileSync('./docker-compose.yml', 'utf8'));
const services = compose.services || {};

// Start Mermaid graph
let mermaid = '```mermaid graph LR';

// Create nodes
Object.keys(services).forEach(name => {
  mermaid += `  ${name.replace(/[-]/g, '_')}["${name}"]
`;
});

// Create edges for depends_on
Object.entries(services).forEach(([name, cfg]) => {
  const deps = cfg.depends_on || [];
  deps.forEach(dep => {
    const from = dep.replace(/[-]/g, '_');
    const to = name.replace(/[-]/g, '_');
    mermaid += `  ${from} --> ${to}
`;
  });
});

mermaid += '```';

// Output to stdout
console.log(mermaid);