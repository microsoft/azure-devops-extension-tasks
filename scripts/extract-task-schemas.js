#!/usr/bin/env node

/**
 * Script to extract all task.json files and their schemas
 * Outputs a JSON file with all task information
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/task-schemas.json');

function findTaskJsonFiles(dir, onlyV5 = true) {
  const results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip v4 directories if onlyV5 is true
      if (onlyV5 && item === 'v4') {
        continue;
      }
      results.push(...findTaskJsonFiles(fullPath, onlyV5));
    } else if (item === 'task.json') {
      // Only include if we're in v5 or serverless (not in a versioned subdirectory)
      const relativePath = path.relative(TASKS_DIR, fullPath);
      const pathParts = relativePath.split(path.sep);
      if (!onlyV5 || pathParts[1] === 'v5' || pathParts[1] === undefined) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

function extractOutputsFromSource(taskDir) {
  const outputs = [];
  
  // Find TypeScript files in the task directory
  const tsFiles = [];
  try {
    const items = fs.readdirSync(taskDir);
    for (const item of items) {
      if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        tsFiles.push(path.join(taskDir, item));
      }
    }
  } catch (e) {
    return outputs;
  }
  
  // Pattern to detect tl.setVariable calls
  // Matches: tl.setVariable('name', value, isSecret, isOutput)
  const setVariablePattern = /tl\.setVariable\s*\(\s*["']([^"']+)["']\s*,\s*[^,)]+(?:\s*,\s*[^,)]+)?(?:\s*,\s*(true|false))?\s*\)/g;
  
  for (const tsFile of tsFiles) {
    try {
      const content = fs.readFileSync(tsFile, 'utf8');
      let match;
      
      while ((match = setVariablePattern.exec(content)) !== null) {
        const varName = match[1];
        const isOutput = match[2] === 'true';
        
        // Check if isOutput is true or if the variable name suggests it's an output
        if (isOutput || varName.includes('Output') || varName.includes('output')) {
          outputs.push({
            name: varName,
            source: 'code-analysis',
            isOutput: isOutput,
            file: path.basename(tsFile)
          });
        }
      }
    } catch (e) {
      // Ignore file read errors
    }
  }
  
  return outputs;
}

function extractTaskInfo(taskJsonPath) {
  const content = fs.readFileSync(taskJsonPath, 'utf8');
  const task = JSON.parse(content);
  
  const relativePath = path.relative(TASKS_DIR, taskJsonPath);
  const pathParts = relativePath.split(path.sep);
  const taskDir = path.dirname(taskJsonPath);
  
  // Get outputs from task.json
  const declaredOutputs = task.outputVariables || [];
  
  // Get outputs from source code analysis
  const codeOutputs = extractOutputsFromSource(taskDir);
  
  // Merge outputs, avoiding duplicates
  const allOutputs = [...declaredOutputs];
  for (const codeOutput of codeOutputs) {
    if (!allOutputs.find(o => o.name === codeOutput.name)) {
      allOutputs.push(codeOutput);
    }
  }
  
  return {
    path: relativePath,
    name: task.name,
    friendlyName: task.friendlyName,
    version: task.version,
    taskName: pathParts[0],
    taskVersion: pathParts[1] || 'serverless',
    id: task.id,
    description: task.description,
    category: task.category,
    inputs: task.inputs || [],
    outputVariables: allOutputs,
    declaredOutputs: declaredOutputs.length,
    discoveredOutputs: codeOutputs.length,
    execution: task.execution,
    demands: task.demands || [],
    groups: task.groups || []
  };
}

function main() {
  console.log('Extracting task schemas (v5 only)...');
  
  const taskFiles = findTaskJsonFiles(TASKS_DIR, true);
  console.log(`Found ${taskFiles.length} v5 task.json files`);
  
  const tasks = taskFiles.map(extractTaskInfo);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tasks, null, 2));
  console.log(`Task schemas written to ${OUTPUT_FILE}`);
  
  return tasks;
}

if (require.main === module) {
  main();
}

module.exports = { extractTaskInfo, findTaskJsonFiles };
