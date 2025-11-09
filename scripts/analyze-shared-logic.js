#!/usr/bin/env node

/**
 * Script to identify duplicated helper functions and shared logic
 * Analyzes TypeScript source files for similar function patterns
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TASKS_DIR = path.join(__dirname, '../BuildTasks');
const OUTPUT_FILE = path.join(__dirname, '../docs/shared-logic-analysis.md');

function findSourceFiles(dir, excludeCommon = false) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (excludeCommon && item === 'Common') {
        continue;
      }
      
      // Skip v4 directories
      if (item === 'v4') {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        results.push(...findSourceFiles(fullPath, false));
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return results;
}

function extractFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const functions = [];
  
  // Pattern for function declarations
  // Matches: function name(...) { ... }
  const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{/g;
  let match;
  
  while ((match = functionPattern.exec(content)) !== null) {
    const functionName = match[1];
    const startIndex = match.index;
    
    // Try to extract the full function body (simple brace matching)
    let braceCount = 1;
    let endIndex = startIndex + match[0].length;
    
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++;
      if (content[endIndex] === '}') braceCount--;
      endIndex++;
    }
    
    const functionBody = content.substring(startIndex, endIndex);
    
    // Create a normalized version for comparison
    const normalized = functionBody
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\/\/.*$/gm, '')  // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove multi-line comments
    
    functions.push({
      name: functionName,
      body: functionBody,
      normalized: normalized,
      hash: crypto.createHash('md5').update(normalized).digest('hex'),
      lineCount: functionBody.split('\n').length
    });
  }
  
  // Also check for arrow functions assigned to const/let/var
  const arrowFunctionPattern = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g;
  
  while ((match = arrowFunctionPattern.exec(content)) !== null) {
    const functionName = match[1];
    const startIndex = match.index;
    
    // Find the end (semicolon or end of statement)
    let endIndex = startIndex + match[0].length;
    let braceCount = 0;
    let inBraces = false;
    
    while (endIndex < content.length) {
      if (content[endIndex] === '{') {
        inBraces = true;
        braceCount++;
      }
      if (content[endIndex] === '}') {
        braceCount--;
        if (braceCount === 0 && inBraces) break;
      }
      if (content[endIndex] === ';' && braceCount === 0) break;
      endIndex++;
    }
    
    const functionBody = content.substring(startIndex, endIndex + 1);
    const normalized = functionBody
      .replace(/\s+/g, ' ')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    
    functions.push({
      name: functionName,
      body: functionBody,
      normalized: normalized,
      hash: crypto.createHash('md5').update(normalized).digest('hex'),
      lineCount: functionBody.split('\n').length
    });
  }
  
  return functions;
}

function analyzeDuplication() {
  console.log('Analyzing function duplication...');
  
  const sourceFiles = findSourceFiles(TASKS_DIR);
  console.log(`Found ${sourceFiles.length} TypeScript source files`);
  
  const allFunctions = [];
  
  for (const file of sourceFiles) {
    const relativePath = path.relative(TASKS_DIR, file);
    const functions = extractFunctions(file);
    
    for (const func of functions) {
      allFunctions.push({
        ...func,
        file: relativePath
      });
    }
  }
  
  console.log(`Extracted ${allFunctions.length} functions`);
  
  // Group by hash to find duplicates
  const byHash = {};
  for (const func of allFunctions) {
    if (!byHash[func.hash]) {
      byHash[func.hash] = [];
    }
    byHash[func.hash].push(func);
  }
  
  // Find actual duplicates (same hash, different files, longer than 5 lines)
  const duplicates = [];
  for (const [hash, funcs] of Object.entries(byHash)) {
    if (funcs.length > 1 && funcs[0].lineCount > 5) {
      const uniqueFiles = new Set(funcs.map(f => f.file));
      if (uniqueFiles.size > 1) {
        duplicates.push({
          hash,
          functions: funcs,
          count: funcs.length,
          fileCount: uniqueFiles.size,
          lineCount: funcs[0].lineCount
        });
      }
    }
  }
  
  return { allFunctions, duplicates, byHash };
}

function analyzeCommonLibrary() {
  console.log('Analyzing Common library (v5 only)...');
  
  const commonV5Path = path.join(TASKS_DIR, 'Common/v5/Common.ts');
  
  const analysis = {
    v5: { exists: false, functions: [] }
  };
  
  if (fs.existsSync(commonV5Path)) {
    analysis.v5.exists = true;
    analysis.v5.functions = extractFunctions(commonV5Path);
  }
  
  return analysis;
}

function generateMarkdown(analysis, commonAnalysis) {
  let markdown = '# Shared Logic Analysis\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  markdown += '## Summary\n\n';
  markdown += `- **Total functions analyzed:** ${analysis.allFunctions.length}\n`;
  markdown += `- **Duplicate function patterns found:** ${analysis.duplicates.length}\n`;
  markdown += '\n';
  
  // Common library analysis
  markdown += '## Common Library (Existing Shared Code)\n\n';
  
  if (commonAnalysis.v5.exists) {
    markdown += `### Common v5\n\n`;
    markdown += `**Location:** \`BuildTasks/Common/v5/Common.ts\`\n\n`;
    markdown += `**Functions exported:** ${commonAnalysis.v5.functions.length}\n\n`;
    
    if (commonAnalysis.v5.functions.length > 0) {
      markdown += '**Function list:**\n\n';
      for (const func of commonAnalysis.v5.functions) {
        markdown += `- \`${func.name}\` (${func.lineCount} lines)\n`;
      }
      markdown += '\n';
    }
  } else {
    markdown += '*No v5 Common library found*\n\n';
  }
  
  // Duplicate functions
  markdown += '## Duplicate Functions (Candidates for Abstraction)\n\n';
  
  if (analysis.duplicates.length > 0) {
    markdown += 'These functions appear multiple times across different tasks and could be moved to the Common library:\n\n';
    
    // Sort by number of occurrences
    const sortedDuplicates = analysis.duplicates.sort((a, b) => b.count - a.count);
    
    markdown += '| Function Name | Occurrences | Files | Lines |\n';
    markdown += '|---------------|-------------|-------|-------|\n';
    
    for (const dup of sortedDuplicates) {
      const functionName = dup.functions[0].name;
      const fileList = [...new Set(dup.functions.map(f => f.file.split('/')[0]))].join(', ');
      markdown += `| \`${functionName}\` | ${dup.count} | ${fileList} | ${dup.lineCount} |\n`;
    }
    markdown += '\n';
    
    // Details for top duplicates
    markdown += '### Detailed Analysis of Top Duplicates\n\n';
    
    for (let i = 0; i < Math.min(5, sortedDuplicates.length); i++) {
      const dup = sortedDuplicates[i];
      const func = dup.functions[0];
      
      markdown += `#### ${i + 1}. \`${func.name}\`\n\n`;
      markdown += `- **Occurrences:** ${dup.count}\n`;
      markdown += `- **Unique files:** ${dup.fileCount}\n`;
      markdown += `- **Lines of code:** ${dup.lineCount}\n`;
      markdown += '\n**Found in:**\n\n';
      
      for (const f of dup.functions) {
        markdown += `- \`${f.file}\`\n`;
      }
      markdown += '\n';
    }
  } else {
    markdown += '*No significant duplicate functions found (most logic is already in Common library)*\n\n';
  }
  
  // Recommendations
  markdown += '## Recommendations\n\n';
  markdown += '### Short-term\n\n';
  markdown += '1. Review duplicate functions and consider moving to Common v5 library\n';
  markdown += '2. Ensure all v5 tasks use the Common v5 library for shared functionality\n';
  markdown += '3. Standardize error handling and logging patterns\n\n';
  
  markdown += '### Long-term\n\n';
  markdown += '1. Continue expanding the Common v5 library with reusable functionality\n';
  markdown += '2. Extract common patterns into reusable helper functions\n';
  markdown += '3. Consider creating domain-specific helper modules (e.g., tfx-helpers, validation-helpers)\n';
  markdown += '4. Implement shared testing utilities for task development\n\n';
  
  return markdown;
}

function main() {
  const analysis = analyzeDuplication();
  const commonAnalysis = analyzeCommonLibrary();
  const markdown = generateMarkdown(analysis, commonAnalysis);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown);
  console.log(`Shared logic analysis written to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main();
}

module.exports = { extractFunctions, analyzeDuplication, analyzeCommonLibrary };
