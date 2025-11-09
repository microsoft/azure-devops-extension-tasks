#!/usr/bin/env node

/**
 * Script to generate a Markdown matrix of task inputs and outputs
 */

const fs = require('fs');
const path = require('path');
const { extractTaskInfo, findTaskJsonFiles } = require('./extract-task-schemas');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/task-inputs-outputs-matrix.md');

function generateMarkdownMatrix(tasks) {
  let markdown = '# Task Inputs and Outputs Matrix\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Total tasks analyzed: ${tasks.length}\n\n`;
  
  // Group tasks by task name
  const groupedTasks = {};
  for (const task of tasks) {
    if (!groupedTasks[task.taskName]) {
      groupedTasks[task.taskName] = [];
    }
    groupedTasks[task.taskName].push(task);
  }
  
  // Generate table of contents
  markdown += '## Table of Contents\n\n';
  for (const taskName of Object.keys(groupedTasks).sort()) {
    markdown += `- [${taskName}](#${taskName.toLowerCase()})\n`;
  }
  markdown += '\n';
  
  // Generate details for each task
  for (const taskName of Object.keys(groupedTasks).sort()) {
    const taskVersions = groupedTasks[taskName];
    
    markdown += `## ${taskName}\n\n`;
    markdown += `**Description:** ${taskVersions[0].description}\n\n`;
    markdown += `**Category:** ${taskVersions[0].category || 'N/A'}\n\n`;
    
    // Show all versions
    markdown += '**Versions:**\n';
    for (const task of taskVersions) {
      markdown += `- ${task.taskVersion}: v${task.version.Major}.${task.version.Minor}.${task.version.Patch}\n`;
    }
    markdown += '\n';
    
    // Inputs table
    markdown += '### Inputs\n\n';
    
    // Collect all unique input names across versions
    const allInputNames = new Set();
    for (const task of taskVersions) {
      for (const input of task.inputs) {
        allInputNames.add(input.name);
      }
    }
    
    if (allInputNames.size > 0) {
      // Table header
      markdown += '| Input Name | Type | Required | Default | Description |\n';
      markdown += '|------------|------|----------|---------|-------------|\n';
      
      // Use the latest version for input details
      const latestTask = taskVersions.sort((a, b) => {
        const aVer = `${a.taskVersion}`;
        const bVer = `${b.taskVersion}`;
        return bVer.localeCompare(aVer);
      })[0];
      
      for (const input of latestTask.inputs) {
        const inputName = input.name;
        const inputType = input.type || 'string';
        const required = input.required ? 'Yes' : 'No';
        const defaultValue = input.defaultValue || '-';
        const description = (input.helpMarkDown || input.label || '').replace(/\n/g, ' ').substring(0, 100);
        
        markdown += `| ${inputName} | ${inputType} | ${required} | \`${defaultValue}\` | ${description} |\n`;
      }
    } else {
      markdown += '*No inputs defined*\n';
    }
    markdown += '\n';
    
    // Output variables table
    markdown += '### Output Variables\n\n';
    
    // Use the latest version for outputs
    const latestTask = taskVersions.sort((a, b) => {
      const aVer = `${a.taskVersion}`;
      const bVer = `${b.taskVersion}`;
      return bVer.localeCompare(aVer);
    })[0];
    
    if (latestTask.outputVariables && latestTask.outputVariables.length > 0) {
      markdown += '| Variable Name | Description |\n';
      markdown += '|---------------|-------------|\n';
      
      for (const output of latestTask.outputVariables) {
        const varName = output.name || 'N/A';
        const description = (output.description || '').replace(/\n/g, ' ');
        markdown += `| ${varName} | ${description} |\n`;
      }
    } else {
      markdown += '*No output variables defined*\n';
    }
    markdown += '\n';
    
    // Execution information
    markdown += '### Execution\n\n';
    if (latestTask.execution) {
      const executionTypes = Object.keys(latestTask.execution);
      markdown += `**Supported runtimes:** ${executionTypes.join(', ')}\n\n`;
      for (const execType of executionTypes) {
        const exec = latestTask.execution[execType];
        markdown += `- **${execType}:** ${exec.target || 'N/A'}\n`;
      }
    } else {
      markdown += '*No execution information*\n';
    }
    markdown += '\n';
    
    markdown += '---\n\n';
  }
  
  return markdown;
}

function main() {
  console.log('Generating task inputs/outputs matrix...');
  
  const taskFiles = findTaskJsonFiles(TASKS_DIR);
  console.log(`Found ${taskFiles.length} task.json files`);
  
  const tasks = taskFiles.map(extractTaskInfo);
  const markdown = generateMarkdownMatrix(tasks);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`Task matrix written to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { generateMarkdownMatrix };
