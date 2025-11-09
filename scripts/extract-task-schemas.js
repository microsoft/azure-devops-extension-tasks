#!/usr/bin/env node

/**
 * Script to extract all task.json files and their schemas
 * Outputs a JSON file with all task information
 */

const fs = require('fs');
const path = require('path');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/task-schemas.json');

function findTaskJsonFiles(dir) {
  const results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...findTaskJsonFiles(fullPath));
    } else if (item === 'task.json') {
      results.push(fullPath);
    }
  }
  
  return results;
}

function extractTaskInfo(taskJsonPath) {
  const content = fs.readFileSync(taskJsonPath, 'utf8');
  const task = JSON.parse(content);
  
  const relativePath = path.relative(TASKS_DIR, taskJsonPath);
  const pathParts = relativePath.split(path.sep);
  
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
    outputVariables: task.outputVariables || [],
    execution: task.execution,
    demands: task.demands || [],
    groups: task.groups || []
  };
}

function main() {
  console.log('Extracting task schemas...');
  
  const taskFiles = findTaskJsonFiles(TASKS_DIR);
  console.log(`Found ${taskFiles.length} task.json files`);
  
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
