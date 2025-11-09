# Discovery & Inventory Documentation

This directory contains comprehensive documentation and analysis artifacts for the v6 Discovery & Inventory Epic.

## Generated Reports

### 1. Task Schemas (`task-schemas.json`)
Raw JSON export of all task.json files with complete schema information for all 19 tasks (v4, v5, and serverless).

**Usage:** Machine-readable format for tools and automation.

### 2. Task Inputs/Outputs Matrix (`task-inputs-outputs-matrix.md`)
Comprehensive markdown matrix showing all inputs, outputs, and execution details for each task.

**Key Information:**
- Input parameters with types, requirements, and defaults
- Output variables
- Supported runtimes (Node16, Node20_1)
- Task versioning information

### 3. Environment Variables Report (`environment-variables.md`)
Analysis of environment variables and task inputs accessed through code.

**Includes:**
- Task library variables (tl.getVariable)
- Process environment variables (process.env)
- Task input usage summary by type

### 4. Dependency Size Report (`dependency-size-report.md`)
Comprehensive analysis of package dependencies across all tasks.

**Includes:**
- Size analysis (when node_modules are installed)
- Common dependencies across tasks
- Candidates for removal/replacement
- Complete unique dependency list

### 5. Shared Logic Analysis (`shared-logic-analysis.md`)
Analysis of code duplication and shared functionality.

**Includes:**
- Common library function inventory
- Duplicate function detection
- Candidates for abstraction
- Recommendations for consolidation

### 6. Consolidation Recommendations (`consolidation-recommendations.md`)
Strategic recommendations for v6 development based on the discovery findings.

**Includes:**
- Version consolidation strategy
- Dependency optimization
- Common library enhancement
- Testing infrastructure recommendations
- Implementation roadmap

## How to Regenerate Reports

To regenerate all reports after code changes:

```bash
# From repository root
node scripts/run-discovery.js
```

Individual scripts can also be run:

```bash
node scripts/extract-task-schemas.js
node scripts/generate-task-matrix.js
node scripts/enumerate-env-vars.js
node scripts/analyze-dependencies.js
node scripts/analyze-shared-logic.js
```

## Key Findings Summary

### Task Portfolio
- **10 task families:** ExtensionVersion, InstallExtension, IsValidExtension, IsValidExtensionAgent, PackageExtension, PublishExtension, PublishVSExtension, ShareExtension, TfxInstaller, UnpublishExtension
- **19 total tasks:** Most have v4 and v5 versions, one serverless (IsValidExtension)
- **Common library:** Exists for both v4 and v5 with 19 shared functions each

### Dependencies
- **15 unique dependencies** across all tasks
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
