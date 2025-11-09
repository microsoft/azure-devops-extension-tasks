# Discovery & Inventory Documentation

This directory contains comprehensive documentation and analysis artifacts for the v6 Discovery & Inventory Epic.

**IMPORTANT:** Analysis focuses on v5 tasks only. v4 tasks are excluded per deprecation plan (see PR #1490).

## Generated Reports

### 1. Task Schemas (`task-schemas.json`)
Raw JSON export of all v5 task.json files with complete schema information for 9 tasks.

**Key Features:**
- Extracts outputs from both task.json and code analysis (tl.setVariable calls)
- Machine-readable format for tools and automation

### 2. Task Inputs/Outputs Matrix (`task-inputs-outputs-matrix.md`)
Comprehensive markdown matrix showing all inputs, outputs, and execution details for each v5 task.

**Key Information:**
- Input parameters with types, requirements, and defaults
- Output variables (both declared and discovered from code)
- Supported runtimes (Node16, Node20_1)
- Task versioning information

### 3. Environment Variables Report (`environment-variables.md`)
Analysis of environment variables and task inputs accessed through v5 code.

**Includes:**
- Task library variables (tl.getVariable)
- Process environment variables (process.env)
- Task input usage summary by type

### 4. Dependency Size Report (`dependency-size-report.md`)
Comprehensive analysis of package dependencies across all v5 tasks.

**Includes:**
- Size analysis (requires `npm run initdev` to install dependencies first)
- Common dependencies across tasks
- Candidates for removal/replacement with priorities
- Complete unique dependency list
- Security analysis (e.g., why `tmp` package must be kept)
- References detailed optimization analysis

**Note:** To get actual size measurements, run `npm run initdev` before generating this report.

### 4a. Dependency Optimization Analysis (`dependency-optimization-analysis.md`)
**NEW:** Detailed analysis of optimization opportunities for shared dependencies.

**Key Findings:**
- **fs-extra**: Quick win - replace with native fs (~1 MB savings)
- **azure-pipelines-tasks-azure-arm-rest**: High impact - investigate alternatives (~100-150 MB savings)
- Total potential savings: 100-150 MB (14-21% reduction)

### 4b. Task-Specific Dependency Analysis (`task-specific-dependency-analysis.md`)
**NEW:** Analysis of task-specific dependencies and auth refactoring opportunity.

**Key Findings:**
- PublishExtension is 12 MB larger due to 7zip-bin, temp, and x2js
- **8 of 10 tasks** include azure-arm-rest but don't use it
- **common-auth refactoring**: Extract auth logic → save 80-120 MB (11-17% reduction)
- Only PublishVSExtension actually needs Azure RM auth

### 5. Shared Logic Analysis (`shared-logic-analysis.md`)
Analysis of code duplication and shared functionality in v5 tasks.

**Includes:**
- Common v5 library function inventory
- Duplicate function detection
- Candidates for abstraction
- Recommendations for consolidation

### 6. Consolidation Recommendations (`consolidation-recommendations.md`)
Strategic recommendations for v6 development based on v5 analysis.

**Includes:**
- Runtime modernization (Node20/24 support)
- Dependency optimization (target: <65MB VSIX)
- Common library enhancement
- Testing infrastructure recommendations
- Implementation roadmap

## Tools & Scripts

### Analysis Scripts (6 files)

Run all analysis at once:
```bash
node scripts/run-discovery.js
```

Individual scripts:
- `extract-task-schemas.js` - Extracts v5 task.json + code-discovered outputs
- `generate-task-matrix.js` - Generates comprehensive input/output matrix
- `enumerate-env-vars.js` - Analyzes environment variable usage
- `analyze-dependencies.js` - Analyzes dependencies (v5 only)
- `analyze-shared-logic.js` - Detects code duplication (v5 only)
- `run-discovery.js` - Master orchestrator script

### Migration Tool

**YAML Migration Helper** (`migrate-yaml.js`):
```bash
node scripts/migrate-yaml.js path/to/azure-pipelines.yml
```

This tool:
- Scans Azure Pipelines YAML files
- Identifies v4 tasks that need migration
- Generates migration report with breaking changes
- Provides updated YAML snippets

**Note:** v6 introduces breaking changes. This tool helps with migration.

## How to Regenerate Reports

To regenerate all reports after code changes:

```bash
# From repository root
node scripts/run-discovery.js
```

**For accurate dependency size measurements**, install dependencies first:

```bash
# Install all task dependencies (may take several minutes)
npm run initdev

# Then run dependency analysis
node scripts/analyze-dependencies.js
```

Individual scripts can also be run:

```bash
node scripts/extract-task-schemas.js
node scripts/generate-task-matrix.js
node scripts/enumerate-env-vars.js
node scripts/analyze-dependencies.js  # Run after npm run initdev for size data
node scripts/analyze-shared-logic.js
```

## Key Findings Summary

### Task Portfolio (v5 Only)
- **9 v5 task families:** ExtensionVersion, InstallExtension, IsValidExtensionAgent, PackageExtension, PublishExtension, PublishVSExtension, ShareExtension, TfxInstaller, UnpublishExtension
- **1 serverless task:** IsValidExtension
- **Common v5 library:** 19+ shared functions

### Dependencies
- **15 unique dependencies** across v5 tasks
- **Most common:** azure-pipelines-task-lib (20), tmp (20), fs-extra (18), uuidv5 (18)
- **Optimization candidates:** q (use native Promises), temp (use native fs), promise-retry (implement simple version)

### Code Organization
- **63 total functions** analyzed
- **16 duplicate patterns** found (mostly between v4/v5 Common libraries)
- Strong shared code foundation already exists

### Environment Variables
- **3 task library variables** accessed: `__tfxpath`, `Agent.TempDirectory`, `System.DefaultWorkingDirectory`
- **24 distinct input types** read across Common library
- No direct process.env accesses found

## Next Steps

1. Review all generated reports
2. Prioritize recommendations in consolidation document
3. Create implementation tickets based on roadmap
4. Begin Phase 1: Foundation work

## Scripts Directory

All analysis scripts are located in `/scripts`:
- `extract-task-schemas.js` - Extract task.json schemas
- `generate-task-matrix.js` - Generate input/output matrix
- `enumerate-env-vars.js` - Analyze environment variable usage
- `analyze-dependencies.js` - Analyze package dependencies
- `analyze-shared-logic.js` - Detect code duplication
- `run-discovery.js` - Master script to run all analysis

## Related Documentation

- [Main README](../README.md)
- [Contributing Guidelines](../CONTRIBUTING.md) (if exists)
- [Security Policy](../SECURITY.md)
