#!/usr/bin/env node

/**
 * Master script to run all discovery and inventory analysis
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'extract-task-schemas.js',
  'generate-task-matrix.js',
  'enumerate-env-vars.js',
  'analyze-dependencies.js',
  'analyze-shared-logic.js'
];

console.log('='.repeat(60));
console.log('Discovery & Inventory Analysis');
console.log('='.repeat(60));
console.log('');

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`\nRunning ${script}...`);
  console.log('-'.repeat(60));
  
  try {
    execSync(`node "${scriptPath}"`, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log(`✓ ${script} completed`);
  } catch (error) {
    console.error(`✗ ${script} failed:`, error.message);
    process.exit(1);
  }
}

console.log('');
console.log('='.repeat(60));
console.log('All analysis completed!');
console.log('='.repeat(60));
console.log('');
console.log('Generated reports:');
console.log('  - docs/task-schemas.json');
console.log('  - docs/task-inputs-outputs-matrix.md');
console.log('  - docs/environment-variables.md');
console.log('  - docs/dependency-size-report.md');
console.log('  - docs/shared-logic-analysis.md');
console.log('');
