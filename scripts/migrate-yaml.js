#!/usr/bin/env node

/**
 * YAML Migration Helper
 * 
 * This script helps migrate Azure Pipelines YAML files from v4 tasks to v5 tasks.
 * Since v6 will introduce breaking changes, this tool provides guidance on updating
 * existing pipeline definitions.
 * 
 * Usage: node migrate-yaml.js <path-to-azure-pipelines.yml>
 */

const fs = require('fs');
const path = require('path');

const TASK_MAPPINGS = {
  'PackageAzureDevOpsExtension@4': 'PackageAzureDevOpsExtension@5',
  'PublishAzureDevOpsExtension@4': 'PublishAzureDevOpsExtension@5',
  'UnpublishAzureDevOpsExtension@4': 'UnpublishAzureDevOpsExtension@5',
  'ShareAzureDevOpsExtension@4': 'ShareAzureDevOpsExtension@5',
  'InstallAzureDevOpsExtension@4': 'InstallAzureDevOpsExtension@5',
  'QueryAzureDevOpsExtensionVersion@4': 'QueryAzureDevOpsExtensionVersion@5',
  'IsValidExtension@4': 'IsValidExtension@5',
  'PublishVSExtension@4': 'PublishVSExtension@5',
  'TfxInstaller@4': 'TfxInstaller@5'
};

const BREAKING_CHANGES = {
  'PackageAzureDevOpsExtension': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support'
  ],
  'PublishAzureDevOpsExtension': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support',
    'extensionVisibility values changed: private_preview -> privatepreview, public_preview -> publicpreview'
  ],
  'QueryAzureDevOpsExtensionVersion': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support'
  ],
  'InstallAzureDevOpsExtension': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support'
  ],
  'ShareAzureDevOpsExtension': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support'
  ],
  'UnpublishAzureDevOpsExtension': [
    'connectTo input default changed from VsTeam to AzureRM (Workload Identity Federation)',
    'New connectedServiceNameAzureRM input for WIF support'
  ]
};

function parseYamlSimple(content) {
  // Simple YAML parser for detecting task usage
  // This is intentionally simple and won't handle all YAML features
  const lines = content.split('\n');
  const tasks = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = line.match(/^\s*-?\s*task:\s*(.+)@(\d+)$/);
    
    if (taskMatch) {
      const taskName = taskMatch[1].trim();
      const taskVersion = taskMatch[2];
      const lineNumber = i + 1;
      
      tasks.push({
        name: taskName,
        version: taskVersion,
        fullName: `${taskName}@${taskVersion}`,
        lineNumber: lineNumber,
        line: line
      });
    }
  }
  
  return tasks;
}

function generateMigrationReport(yamlPath, tasks) {
  let report = '# Azure Pipelines YAML Migration Report\n\n';
  report += `**Source File:** ${yamlPath}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  const v4Tasks = tasks.filter(t => t.version === '4');
  const v5Tasks = tasks.filter(t => t.version === '5');
  const otherTasks = tasks.filter(t => t.version !== '4' && t.version !== '5');
  
  report += '## Summary\n\n';
  report += `- **Total tasks found:** ${tasks.length}\n`;
  report += `- **v4 tasks (need migration):** ${v4Tasks.length}\n`;
  report += `- **v5 tasks (already migrated):** ${v5Tasks.length}\n`;
  report += `- **Other tasks:** ${otherTasks.length}\n\n`;
  
  if (v4Tasks.length === 0) {
    report += '✅ **No v4 tasks found. This pipeline is ready for v6!**\n\n';
    return report;
  }
  
  report += '## Required Migrations\n\n';
  
  for (const task of v4Tasks) {
    const newTaskName = TASK_MAPPINGS[task.fullName];
    
    if (newTaskName) {
      report += `### Line ${task.lineNumber}: ${task.fullName}\n\n`;
      report += '**Change:**\n';
      report += '```yaml\n';
      report += `# Before:\n`;
      report += `${task.line}\n\n`;
      report += `# After:\n`;
      report += task.line.replace(`@${task.version}`, '@5') + '\n';
      report += '```\n\n';
      
      const breakingChanges = BREAKING_CHANGES[task.name];
      if (breakingChanges && breakingChanges.length > 0) {
        report += '**Breaking Changes to Review:**\n';
        for (const change of breakingChanges) {
          report += `- ${change}\n`;
        }
        report += '\n';
      }
    } else {
      report += `### Line ${task.lineNumber}: ${task.fullName}\n\n`;
      report += '⚠️ **Warning:** No direct v5 mapping found for this task.\n\n';
    }
  }
  
  report += '## Migration Checklist\n\n';
  report += '- [ ] Update all v4 tasks to v5\n';
  report += '- [ ] Review breaking changes for each task\n';
  report += '- [ ] Update service connections to use Workload Identity Federation (recommended)\n';
  report += '- [ ] Test pipeline in a non-production environment\n';
  report += '- [ ] Update pipeline documentation\n\n';
  
  report += '## Additional Notes\n\n';
  report += '### Workload Identity Federation (WIF)\n\n';
  report += 'v5 tasks default to using Workload Identity Federation for Azure connections. ';
  report += 'This is more secure than using service principal secrets. ';
  report += 'To use WIF:\n\n';
  report += '1. Create an Azure RM service connection with Workload Identity Federation\n';
  report += '2. Use `connectedServiceNameAzureRM` input instead of `connectedServiceName`\n';
  report += '3. Set `connectTo: AzureRM` (this is now the default)\n\n';
  
  report += '### Node Runtime\n\n';
  report += 'v5 tasks support Node16 and Node20_1. v6 will support Node20 and Node24 for GitHub Actions compatibility.\n\n';
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node migrate-yaml.js <path-to-azure-pipelines.yml>');
    console.log('');
    console.log('Example:');
    console.log('  node migrate-yaml.js azure-pipelines.yml');
    console.log('  node migrate-yaml.js path/to/pipeline.yml');
    process.exit(1);
  }
  
  const yamlPath = args[0];
  
  if (!fs.existsSync(yamlPath)) {
    console.error(`Error: File not found: ${yamlPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(yamlPath, 'utf8');
  const tasks = parseYamlSimple(content);
  
  const report = generateMigrationReport(yamlPath, tasks);
  
  console.log(report);
  
  // Optionally save to file
  const outputPath = yamlPath.replace(/\.ya?ml$/, '') + '-migration-report.md';
  fs.writeFileSync(outputPath, report);
  console.log(`\nMigration report saved to: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseYamlSimple, generateMigrationReport, TASK_MAPPINGS, BREAKING_CHANGES };
