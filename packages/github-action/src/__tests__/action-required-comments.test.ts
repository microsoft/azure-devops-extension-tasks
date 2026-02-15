import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ActionInput = {
  required?: unknown;
  description?: unknown;
};

type ActionDefinition = {
  inputs?: Record<string, ActionInput>;
};

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as {
  load: (content: string) => unknown;
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const repositoryRoot = resolve(currentDirectory, '../../../../');

const mainActionPath = resolve(repositoryRoot, 'action.yml');
const compositeActionTable = [
  { operation: 'install', relativePath: 'install/action.yaml' },
  { operation: 'package', relativePath: 'package/action.yaml' },
  { operation: 'publish', relativePath: 'publish/action.yaml' },
  { operation: 'query-version', relativePath: 'query-version/action.yaml' },
  { operation: 'share', relativePath: 'share/action.yaml' },
  { operation: 'show', relativePath: 'show/action.yaml' },
  { operation: 'unpublish', relativePath: 'unpublish/action.yaml' },
  { operation: 'unshare', relativePath: 'unshare/action.yaml' },
  { operation: 'wait-for-installation', relativePath: 'wait-for-installation/action.yaml' },
  { operation: 'wait-for-validation', relativePath: 'wait-for-validation/action.yaml' },
].map(({ operation, relativePath }) => ({
  operation,
  absolutePath: resolve(repositoryRoot, relativePath),
}));

function loadActionDefinition(filePath: string): ActionDefinition {
  const content = readFileSync(filePath, 'utf8');
  return yaml.load(content) as ActionDefinition;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[-*]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractOperationRequirement(
  description: string,
  knownOperations: readonly string[]
): Set<string> | undefined {
  const lines = description
    .split('\n')
    .map(normalizeLine)
    .filter((line) => line.includes('required for command:'));

  for (const line of lines) {
    const afterRequiredFor = line.split('required for command:')[1] ?? '';
    const matchedOperations = new Set<string>();

    for (const operation of knownOperations) {
      if (new RegExp(`\\b${operation.replace(/-/g, '[- ]')}\\b`, 'i').test(afterRequiredFor)) {
        matchedOperations.add(operation);
      }
    }

    if (matchedOperations.size > 0) {
      return matchedOperations;
    }
  }

  return undefined;
}

describe('Main action required-for comments', () => {
  it('match composite required flags for operation-scoped comments', () => {
    const mainAction = loadActionDefinition(mainActionPath);
    const mainInputs = mainAction.inputs ?? {};

    const operationNames = compositeActionTable.map(({ operation }) => operation);

    const requiredByOperation = new Map<string, Set<string>>();
    for (const operation of operationNames) {
      requiredByOperation.set(operation, new Set<string>());
    }

    for (const { operation, absolutePath } of compositeActionTable) {
      const compositeAction = loadActionDefinition(absolutePath);
      const compositeInputs = compositeAction.inputs ?? {};

      for (const [inputName, input] of Object.entries(compositeInputs)) {
        if (input.required === true) {
          requiredByOperation.get(operation)?.add(inputName);
        }
      }
    }

    const mismatches: string[] = [];
    const validatedInputs: string[] = [];
    const commandScopedInputs = new Set<string>();

    for (const [inputName] of Object.entries(mainInputs)) {
      const requiredFromComposite = new Set<string>();
      for (const operation of operationNames) {
        if (requiredByOperation.get(operation)?.has(inputName)) {
          requiredFromComposite.add(operation);
        }
      }

      if (requiredFromComposite.size > 0 && requiredFromComposite.size < operationNames.length) {
        commandScopedInputs.add(inputName);
      }
    }

    for (const [inputName, input] of Object.entries(mainInputs)) {
      const description = asString(input.description);
      const requiredFromComment = extractOperationRequirement(description, operationNames);
      const requiredFromComposite = new Set<string>();
      for (const operation of operationNames) {
        if (requiredByOperation.get(operation)?.has(inputName)) {
          requiredFromComposite.add(operation);
        }
      }

      if (commandScopedInputs.has(inputName) && !requiredFromComment) {
        mismatches.push(`Input '${inputName}' is command-scoped required but is missing 'Required for command: ...' phrasing in main action.yml`);
        continue;
      }

      if (!requiredFromComment) {
        continue;
      }

      validatedInputs.push(inputName);

      const expected = [...requiredFromComment].sort();
      const actual = [...requiredFromComposite].sort();

      if (expected.join('|') !== actual.join('|')) {
        mismatches.push(
          `Input '${inputName}' required-for mismatch\n  comment:    [${expected.join(', ')}]\n  composites: [${actual.join(', ')}]`
        );
      }
    }

    expect(validatedInputs.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });
});