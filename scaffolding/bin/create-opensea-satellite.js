#!/usr/bin/env node
/**
 * `npx create-opensea-satellite <name>` — scaffolds a new Electron satellite
 * pre-wired to `@openholt/satellite-runtime`. Copies template files into a
 * new directory, replaces placeholders, and prints next-step instructions.
 *
 * Usage:
 *   npx create-opensea-satellite my-app
 *   cd my-app && npm install
 */
const fs = require('node:fs');
const path = require('node:path');

const TEMPLATE_ROOT = path.join(__dirname, '..', 'template');

function fail(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
  process.exit(1);
}

function info(msg) {
  console.log(`\x1b[34mℹ\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('-')) {
  console.log('Usage: npx create-opensea-satellite <name>');
  console.log('');
  console.log('Scaffolds a new Electron satellite consuming @openholt/satellite-runtime.');
  process.exit(args.length === 0 ? 1 : 0);
}

const projectName = args[0];
if (!/^[a-z][a-z0-9-]*$/.test(projectName)) {
  fail(`Project name must be lowercase, kebab-case, start with a letter (got "${projectName}").`);
}

const targetDir = path.resolve(process.cwd(), projectName);
if (fs.existsSync(targetDir)) {
  fail(`Directory "${targetDir}" already exists.`);
}

info(`Scaffolding ${projectName} → ${targetDir}`);

function walk(dir, baseFromTemplate) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const sourcePath = path.join(dir, entry.name);
    const relativePath = path.join(baseFromTemplate, entry.name);
    const destPath = path.join(targetDir, relativePath);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      walk(sourcePath, relativePath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      let content = fs.readFileSync(sourcePath, 'utf-8');
      content = content.replace(/__SATELLITE_NAME__/g, projectName).replace(
        /__SATELLITE_DISPLAY_NAME__/g,
        projectName
          .split('-')
          .map((s) => s[0].toUpperCase() + s.slice(1))
          .join(' '),
      );
      fs.writeFileSync(destPath, content);
    }
  }
}

if (!fs.existsSync(TEMPLATE_ROOT)) {
  fail(`Template not found at ${TEMPLATE_ROOT}. Reinstall @openholt/satellite-runtime.`);
}

fs.mkdirSync(targetDir, { recursive: true });
walk(TEMPLATE_ROOT, '');

success(`Created ${projectName}/`);
console.log('');
info('Next steps:');
console.log(`  cd ${projectName}`);
console.log('  npm install');
console.log('  npm run dev');
console.log('');
info('Read scaffolding/template/README.md for full setup notes.');
