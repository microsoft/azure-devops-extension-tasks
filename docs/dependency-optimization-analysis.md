# Dependency Optimization Analysis for v5 Tasks

Generated: 2025-11-09

## Executive Summary

Since all 10 v5 tasks share the same 5 core dependencies, these are duplicated 10 times in the final VSIX package. **Total current size: 725.67 MB** (72.57 MB × 10 tasks).

The biggest optimization opportunity is **reducing shared dependencies** since they are duplicated across all tasks.

## Shared Dependencies (Used by all 10 tasks)

1. **azure-pipelines-task-lib** (~40-50 MB with transitive deps)
2. **azure-pipelines-tasks-azure-arm-rest** (~10-15 MB with Azure SDK deps)
3. **fs-extra** (~100 KB)
4. **tmp** (~50 KB) - **KEEP** for security
5. **uuidv5** (~10 KB)

## Optimization Opportunities

### 1. fs-extra → Native fs (HIGH IMPACT, LOW COMPLEXITY)

**Current Usage:** Only ONE method call in Common.ts:
```typescript
await fse.writeJSON(path, manifest);
```

**Native Replacement:**
```typescript
await fs.writeFile(path, JSON.stringify(manifest, null, 2), 'utf8');
```

**Savings:**
- Package size: ~100 KB per task → **~1 MB total across 10 tasks**
- Transitive dependencies: Eliminates jsonfile, graceful-fs, universalify

**Recommendation:** **REPLACE** - Trivial to replace with native fs

**Impact:** LOW savings but very easy to implement

---

### 2. uuidv5 (LOW IMPACT - KEEP)

**Current Usage:** UUID v5 generation for extension IDs:
```typescript
const extensionNs = uuidv5("url", "https://marketplace.visualstudio.com/vsts", true);
manifest.id = uuidv5(extensionNs, `${publisherId}.${extensionId}.${manifest.name}`, false);
```

**Issue:** The `uuidv5` package implements UUID v5 (SHA-1 based, namespace-aware). Native `crypto.randomUUID()` only generates UUID v4 (random).

**Options:**
1. Keep uuidv5 (only ~10 KB, no transitive deps)
2. Implement UUID v5 ourselves (~50 lines of code)
3. Switch to UUID v4 if deterministic IDs aren't critical

**Recommendation:** **KEEP** - Tiny package (10 KB × 10 = 100 KB total), no transitive deps, provides specific functionality (UUID v5). Cost-benefit doesn't justify replacement.

---

### 3. azure-pipelines-tasks-azure-arm-rest (HIGHEST IMPACT, HIGH COMPLEXITY)

**Current Usage:** Only for Azure RM endpoint authentication:
```typescript
import { AzureRMEndpoint } from "azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js";
```

**Issues:**
- Brings in entire Azure SDK stack (@azure/identity, @azure/msal-node, @azure/core-*)
- Many transitive dependencies (50+ packages)
- Estimated size: 10-15 MB per task → **100-150 MB total across 10 tasks**

**Transitive Dependencies Include:**
- @azure/identity (~5 MB)
- @azure/msal-node (~3 MB)
- @azure/core-client, @azure/core-rest-pipeline, @azure/core-auth
- Multiple versions of some packages (e.g., @azure/abort-controller appears 6 times)

**Options:**
1. Extract only the endpoint handling code (if license allows)
2. Implement lightweight Azure RM authentication using azure-pipelines-task-lib
3. Use azure-pipelines-task-lib's built-in endpoint handling where possible
4. Tree-shake unused code if possible

**Recommendation:** **INVESTIGATE DEEPLY** - Potentially highest savings (100-150 MB), but requires:
- Thorough testing of authentication flows
- Validation of Workload Identity Federation support
- Ensuring service principal authentication still works

**Priority:** HIGH - This is the single biggest opportunity

---

### 4. azure-pipelines-task-lib (NECESSARY - KEEP)

**Status:** Core library, required for all tasks

**Size:** ~40-50 MB with dependencies

**Recommendation:** **KEEP** - Essential infrastructure, no viable alternative

---

### 5. tmp (SECURITY-CRITICAL - KEEP)

**Status:** Security-critical for VSIX packaging (prevents content injection attacks)

**Size:** ~50 KB

**Recommendation:** **KEEP** - Already confirmed in security analysis

---

## Summary of Recommendations

| Dependency | Action | Est. Savings | Priority | Complexity | Risk |
|------------|--------|--------------|----------|------------|------|
| **fs-extra** | **REPLACE** with native fs | ~1 MB | HIGH | LOW | LOW |
| **azure-pipelines-tasks-azure-arm-rest** | **INVESTIGATE** replacement | ~100-150 MB | **CRITICAL** | HIGH | MEDIUM |
| uuidv5 | KEEP | - | - | - | - |
| tmp | KEEP (security) | - | - | - | - |
| azure-pipelines-task-lib | KEEP (necessary) | - | - | - | - |

---

## Implementation Plan

### Phase 1: Quick Win - Replace fs-extra (Week 1)

**Effort:** 1-2 days

1. Replace `fse.writeJSON(path, manifest)` with native fs in Common.ts:
   ```typescript
   await fs.writeFile(path, JSON.stringify(manifest, null, 2), 'utf8');
   ```
2. Remove fs-extra from all v5 package.json files
3. Test all tasks to ensure manifest writing works correctly

**Expected savings:** ~1 MB total  
**Risk:** Very low - simple replacement

### Phase 2: Azure ARM REST Deep Dive (Weeks 2-4)

**Effort:** 2-3 weeks

1. **Analysis Phase** (Week 2):
   - Map all usages of AzureRMEndpoint in Common.ts
   - Document authentication flow requirements
   - Investigate azure-pipelines-task-lib's endpoint capabilities
   - Check if authentication can be handled without azure-pipelines-tasks-azure-arm-rest

2. **Proof of Concept** (Week 3):
   - Implement lightweight endpoint handling if feasible
   - Or: Extract minimal code from azure-pipelines-tasks-azure-arm-rest
   - Test with both service principal and WIF authentication

3. **Testing & Validation** (Week 4):
   - Test all authentication scenarios
   - Validate PublishExtension, PackageExtension, etc.
   - Ensure backward compatibility

**Expected savings:** 100-150 MB total  
**Risk:** Medium - authentication is critical, thorough testing required

### Phase 3: Build Optimization Review (Week 5)

1. Review if npm dedupe can be improved
2. Check for any other optimization opportunities revealed by Phase 1 & 2
3. Consider VSIX structure changes (e.g., shared dependency layer)

---

## Expected Total Impact

| Phase | Savings | Timeline | Risk |
|-------|---------|----------|------|
| Phase 1 (fs-extra) | ~1 MB | Week 1 | LOW |
| Phase 2 (azure-arm-rest) | 100-150 MB | Weeks 2-4 | MEDIUM |
| **Total** | **~100-150 MB** | **1 month** | **MEDIUM** |

This represents a **~14-21% reduction** in total dependency size (from 725.67 MB to ~575-625 MB).

After build pipeline optimization (dedupe, prune), this should help achieve the **<65 MB VSIX target**.

---

## Additional Observations

### Transitive Dependency Bloat Analysis

The azure-pipelines-tasks-azure-arm-rest package is the primary source of bloat:

```
azure-pipelines-tasks-azure-arm-rest
├── @azure/identity (~5 MB)
│   ├── @azure/msal-node (~3 MB)
│   │   ├── @azure/msal-common
│   │   ├── jsonwebtoken
│   │   └── uuid
│   ├── @azure/core-auth
│   ├── @azure/core-client
│   └── @azure/core-rest-pipeline
├── @azure/core-* packages (~2-3 MB total)
└── Multiple transitive dependencies
```

Multiple versions of some packages are installed due to dependency conflicts (e.g., @azure/abort-controller appears 6 times at different versions).

### Current Build Pipeline Optimizations

Already in place:
- `npm dedupe` - Deduplicates shared dependencies
- `npm prune --omit=dev` - Removes devDependencies

These help but can't eliminate the core issue: each task has its own node_modules with duplicated packages.

---

## Alternative Strategies (Future Consideration)

### 1. Monorepo with Shared Dependencies
Structure VSIX with a shared node_modules at the root level, tasks reference it.

**Pros:** Eliminate all duplication  
**Cons:** May break Azure Pipelines task loading expectations

### 2. Task Consolidation
Combine related tasks into fewer multi-purpose tasks.

**Pros:** Fewer duplications  
**Cons:** Less granular, may complicate usage

### 3. Dynamic Dependency Loading
Load heavy dependencies on-demand at runtime.

**Pros:** Reduce initial package size  
**Cons:** Requires network access, complexity

---

## Conclusion

The most impactful optimization is **investigating alternatives to azure-pipelines-tasks-azure-arm-rest**, which could save 100-150 MB (14-21% reduction). The quick win of replacing fs-extra saves ~1 MB with minimal effort.

Both together represent significant progress toward the <65 MB VSIX target.
