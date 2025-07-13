const glob = require('glob');
const rimraf = require('rimraf');
const path = require('path');

// Define patterns to remove
const patterns = [
  'node_modules',
  'dist',
  'package-lock.json',
  '**/node_modules',
  '**/dist',
  '**/package-lock.json',
];

// Gather unique matches
const matches = new Set();
patterns.forEach(pattern => {
  const found = glob.sync(pattern, { dot: true, cwd: process.cwd() });
  found.forEach(p => matches.add(path.resolve(process.cwd(), p)));
});

if (matches.size === 0) {
  console.log('No files or directories found to clean.');
} else {
  for (const target of matches) {
    console.log('Removing:', target);
    try {
      rimraf.sync(target);
    } catch (err) {
      console.error(`Failed to remove ${target}:`, err);
    }
  }
  console.log('🧹 all clean!');
}
