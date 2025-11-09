#!/usr/bin/env node

/**
 * Script to enumerate environment variables and task library calls
 * Scans TypeScript source files for environment variable usage
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/environment-variables.md');

function findSourceFiles(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      // Skip v4 directories
      if (item === 'v4') {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        results.push(...findSourceFiles(fullPath));
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return results;
}

function extractEnvironmentVariables(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = [];
  
  // Pattern 1: tl.getVariable("VarName")
  const tlGetVarPattern = /tl\.getVariable\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = tlGetVarPattern.exec(content)) !== null) {
    results.push({
      type: 'task-lib-variable',
      name: match[1],
      pattern: match[0]
    });
  }
  
  // Pattern 2: process.env.VAR_NAME
  const processEnvPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  while ((match = processEnvPattern.exec(content)) !== null) {
    results.push({
      type: 'process-env',
      name: match[1],
      pattern: match[0]
    });
  }
  
  // Pattern 3: tl.getInput("inputName")
  const tlGetInputPattern = /tl\.getInput\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  while ((match = tlGetInputPattern.exec(content)) !== null) {
    results.push({
      type: 'task-input',
      name: match[1],
      pattern: match[0]
    });
  }
  
  // Pattern 4: tl.getPathInput("inputName")
  const tlGetPathInputPattern = /tl\.getPathInput\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  while ((match = tlGetPathInputPattern.exec(content)) !== null) {
    results.push({
      type: 'task-input-path',
      name: match[1],
      pattern: match[0]
    });
  }
  
  // Pattern 5: tl.getBoolInput("inputName")
  const tlGetBoolInputPattern = /tl\.getBoolInput\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  while ((match = tlGetBoolInputPattern.exec(content)) !== null) {
    results.push({
      type: 'task-input-bool',
      name: match[1],
      pattern: match[0]
    });
  }
  
  // Pattern 6: tl.getDelimitedInput("inputName")
  const tlGetDelimitedInputPattern = /tl\.getDelimitedInput\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  while ((match = tlGetDelimitedInputPattern.exec(content)) !== null) {
    results.push({
      type: 'task-input-delimited',
      name: match[1],
      pattern: match[0]
    });
  }
  
  return results;
}

function analyzeEnvironmentVariables() {
  console.log('Analyzing environment variables and task inputs...');
  
  const sourceFiles = findSourceFiles(TASKS_DIR);
  console.log(`Found ${sourceFiles.length} TypeScript source files`);
  
  const allVariables = {};
  
  for (const file of sourceFiles) {
    const relativePath = path.relative(TASKS_DIR, file);
    const variables = extractEnvironmentVariables(file);
    
    if (variables.length > 0) {
      allVariables[relativePath] = variables;
    }
  }
  
  return allVariables;
}

function generateMarkdown(allVariables) {
  let markdown = '# Environment Variables and Task Inputs\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Aggregate by type
  const byType = {
    'task-lib-variable': new Map(),
    'process-env': new Map(),
    'task-input': new Map(),
    'task-input-path': new Map(),
    'task-input-bool': new Map(),
    'task-input-delimited': new Map()
  };
  
  for (const [file, variables] of Object.entries(allVariables)) {
    for (const variable of variables) {
      if (!byType[variable.type].has(variable.name)) {
        byType[variable.type].set(variable.name, []);
      }
      byType[variable.type].get(variable.name).push(file);
    }
  }
  
  // Task Library Variables
  markdown += '## Task Library Variables (tl.getVariable)\n\n';
  markdown += 'These are Azure Pipelines variables accessed via the task library:\n\n';
  
  if (byType['task-lib-variable'].size > 0) {
    markdown += '| Variable Name | Used In |\n';
    markdown += '|---------------|----------|\n';
    
    const sorted = Array.from(byType['task-lib-variable'].entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, files] of sorted) {
      const fileList = files.map(f => f.split('/')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      markdown += `| \`${name}\` | ${fileList} |\n`;
    }
  } else {
    markdown += '*None found*\n';
  }
  markdown += '\n';
  
  // Process Environment Variables
  markdown += '## Process Environment Variables (process.env)\n\n';
  markdown += 'These are direct environment variable accesses:\n\n';
  
  if (byType['process-env'].size > 0) {
    markdown += '| Variable Name | Used In |\n';
    markdown += '|---------------|----------|\n';
    
    const sorted = Array.from(byType['process-env'].entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, files] of sorted) {
      const fileList = files.map(f => f.split('/')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      markdown += `| \`${name}\` | ${fileList} |\n`;
    }
  } else {
    markdown += '*None found*\n';
  }
  markdown += '\n';
  
  // Task Inputs Summary
  markdown += '## Task Inputs Summary\n\n';
  markdown += 'Overview of how many inputs each task type reads:\n\n';
  
  const taskInputCounts = {};
  
  for (const [file, variables] of Object.entries(allVariables)) {
    const taskName = file.split('/')[0];
    if (!taskInputCounts[taskName]) {
      taskInputCounts[taskName] = {
        regular: new Set(),
        path: new Set(),
        bool: new Set(),
        delimited: new Set()
      };
    }
    
    for (const variable of variables) {
      if (variable.type === 'task-input') {
        taskInputCounts[taskName].regular.add(variable.name);
      } else if (variable.type === 'task-input-path') {
        taskInputCounts[taskName].path.add(variable.name);
      } else if (variable.type === 'task-input-bool') {
        taskInputCounts[taskName].bool.add(variable.name);
      } else if (variable.type === 'task-input-delimited') {
        taskInputCounts[taskName].delimited.add(variable.name);
      }
    }
  }
  
  markdown += '| Task | Regular | Path | Boolean | Delimited | Total |\n';
  markdown += '|------|---------|------|---------|-----------|-------|\n';
  
  for (const [taskName, counts] of Object.entries(taskInputCounts).sort()) {
    const regular = counts.regular.size;
    const path = counts.path.size;
    const bool = counts.bool.size;
    const delimited = counts.delimited.size;
    const total = regular + path + bool + delimited;
    
    markdown += `| ${taskName} | ${regular} | ${path} | ${bool} | ${delimited} | ${total} |\n`;
  }
  
  markdown += '\n';
  
  return markdown;
}

function main() {
  const allVariables = analyzeEnvironmentVariables();
  const markdown = generateMarkdown(allVariables);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`Environment variables report written to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { extractEnvironmentVariables, analyzeEnvironmentVariables };
