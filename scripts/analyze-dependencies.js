#!/usr/bin/env node

/**
 * Script to generate dependency size reports for each task
 * Analyzes package.json and node_modules sizes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/dependency-size-report.md');

function findPackageJsonFiles(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        results.push(...findPackageJsonFiles(fullPath));
      } else if (item === 'package.json') {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return results;
}

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  try {
    // Use du command for accurate size calculation
    const output = execSync(`du -sb "${dirPath}" 2>/dev/null || echo "0 ${dirPath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const size = parseInt(output.split('\t')[0] || '0');
    return size;
  } catch (e) {
    // Fallback to manual calculation
    let size = 0;
    
    function calculateSize(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          calculateSize(fullPath);
        } else {
          size += stat.size;
        }
      }
    }
    
    try {
      calculateSize(dirPath);
    } catch (e) {
      return 0;
    }
    
    return size;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeDependencies(packageJsonPath) {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(content);
  
  const relativePath = path.relative(TASKS_DIR, packageJsonPath);
  const dirPath = path.dirname(packageJsonPath);
  const nodeModulesPath = path.join(dirPath, 'node_modules');
  
  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};
  
  const nodeModulesSize = getDirectorySize(nodeModulesPath);
  
  return {
    path: relativePath,
    taskName: relativePath.split('/')[0],
    taskVersion: relativePath.split('/')[1] || 'root',
    dependencies: Object.keys(dependencies),
    devDependencies: Object.keys(devDependencies),
    dependencyCount: Object.keys(dependencies).length,
    devDependencyCount: Object.keys(devDependencies).length,
    nodeModulesSize: nodeModulesSize,
    nodeModulesExists: fs.existsSync(nodeModulesPath)
  };
}

function findCommonDependencies(allTasks) {
  const depCount = {};
  
  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      depCount[dep] = (depCount[dep] || 0) + 1;
    }
  }
  
  // Filter to dependencies used by more than one task
  const common = {};
  for (const [dep, count] of Object.entries(depCount)) {
    if (count > 1) {
      common[dep] = count;
    }
  }
  
  return common;
}

function findLargeDependencies() {
  // Known large dependencies that could be candidates for removal/replacement
  const knownLarge = {
    '@types/node': 'TypeScript types - can potentially be unified',
    'azure-pipelines-task-lib': 'Core task library - necessary',
    'azure-pipelines-tasks-azure-arm-rest': 'Azure ARM REST - could be optimized',
    'fs-extra': 'File system utilities - could use native fs',
    'q': 'Promise library - deprecated, use native Promises',
    'xmldom': 'XML parsing - check if needed',
    'temp': 'Temporary file handling - could use native os.tmpdir',
    'promise-retry': 'Retry logic - could implement simple version'
  };
  
  return knownLarge;
}

function generateMarkdown(allTasks) {
  let markdown = '# Dependency Size Report\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  const totalTasks = allTasks.length;
  const totalSize = allTasks.reduce((sum, t) => sum + t.nodeModulesSize, 0);
  
  markdown += `## Summary\n\n`;
  markdown += `- **Total tasks analyzed:** ${totalTasks}\n`;
  markdown += `- **Total node_modules size:** ${formatBytes(totalSize)}\n`;
  markdown += `- **Average size per task:** ${formatBytes(totalSize / totalTasks)}\n`;
  markdown += '\n';
  
  // Size by task table
  markdown += '## Size by Task\n\n';
  markdown += '| Task | Version | Dependencies | Dev Dependencies | node_modules Size | Installed |\n';
  markdown += '|------|---------|--------------|------------------|-------------------|------------|\n';
  
  const sortedBySize = allTasks.sort((a, b) => b.nodeModulesSize - a.nodeModulesSize);
  
  for (const task of sortedBySize) {
    const installed = task.nodeModulesExists ? '✓' : '✗';
    markdown += `| ${task.taskName} | ${task.taskVersion} | ${task.dependencyCount} | ${task.devDependencyCount} | ${formatBytes(task.nodeModulesSize)} | ${installed} |\n`;
  }
  markdown += '\n';
  
  // Common dependencies
  markdown += '## Common Dependencies\n\n';
  markdown += 'Dependencies used across multiple tasks:\n\n';
  
  const commonDeps = findCommonDependencies(allTasks);
  const sortedCommon = Object.entries(commonDeps).sort((a, b) => b[1] - a[1]);
  
  if (sortedCommon.length > 0) {
    markdown += '| Dependency | Used By # Tasks |\n';
    markdown += '|------------|----------------|\n';
    
    for (const [dep, count] of sortedCommon) {
      markdown += `| \`${dep}\` | ${count} |\n`;
    }
  } else {
    markdown += '*Analysis pending - install dependencies first*\n';
  }
  markdown += '\n';
  
  // Candidates for removal/replacement
  markdown += '## Candidates for Removal/Replacement\n\n';
  markdown += 'Known dependencies that could be optimized:\n\n';
  
  const largeDeps = findLargeDependencies();
  
  markdown += '| Dependency | Recommendation |\n';
  markdown += '|------------|----------------|\n';
  
  for (const [dep, recommendation] of Object.entries(largeDeps)) {
    markdown += `| \`${dep}\` | ${recommendation} |\n`;
  }
  markdown += '\n';
  
  // All unique dependencies
  markdown += '## All Unique Dependencies\n\n';
  markdown += 'Complete list of all unique dependencies across tasks:\n\n';
  
  const allDeps = new Set();
  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      allDeps.add(dep);
    }
  }
  
  const sortedAllDeps = Array.from(allDeps).sort();
  markdown += `**Total unique dependencies:** ${sortedAllDeps.length}\n\n`;
  
  // Group by prefix for better organization
  const byPrefix = {};
  for (const dep of sortedAllDeps) {
    const prefix = dep.startsWith('@') ? dep.split('/')[0] : dep.split('-')[0];
    if (!byPrefix[prefix]) {
      byPrefix[prefix] = [];
    }
    byPrefix[prefix].push(dep);
  }
  
  for (const [prefix, deps] of Object.entries(byPrefix).sort()) {
    markdown += `### ${prefix}\n\n`;
    for (const dep of deps) {
      markdown += `- \`${dep}\`\n`;
    }
    markdown += '\n';
  }
  
  return markdown;
}

function main() {
  console.log('Analyzing dependencies...');
  
  const packageFiles = findPackageJsonFiles(TASKS_DIR);
  console.log(`Found ${packageFiles.length} package.json files`);
  
  const allTasks = packageFiles.map(analyzeDependencies);
  const markdown = generateMarkdown(allTasks);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`Dependency size report written to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeDependencies, findCommonDependencies };
