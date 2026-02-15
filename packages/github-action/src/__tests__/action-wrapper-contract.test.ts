import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ActionInput = {
  description?: unknown;
  default?: unknown;
};

type ActionOutput = {
  description?: unknown;
};

type ActionStep = {
  with?: Record<string, unknown>;
};

type ActionDefinition = {
  inputs?: Record<string, ActionInput>;
  outputs?: Record<string, ActionOutput>;
  runs?: {
    steps?: ActionStep[];
  };
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
  relativePath,
  absolutePath: resolve(repositoryRoot, relativePath),
}));

function loadActionDefinition(filePath: string): ActionDefinition {
  const content = readFileSync(filePath, 'utf8');
  return yaml.load(content) as ActionDefinition;
}

function setToSortedArray(values: Set<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function expressionForInput(inputName: string): RegExp {
  return new RegExp(`^\\$\\{\\{\\s*inputs\\.${inputName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\}\\}$`);
}

describe('Composite action wrapper contract', () => {
  const mainAction = loadActionDefinition(mainActionPath);
  const mainInputs = mainAction.inputs ?? {};
  const mainOutputs = mainAction.outputs ?? {};

  describe.each(compositeActionTable)('$operation composite action ($relativePath)', ({ operation, relativePath, absolutePath }) => {
    it('declares a one-to-one contract between inputs and forwarded with-values', () => {
      const compositeAction = loadActionDefinition(absolutePath);
      const compositeInputs = compositeAction.inputs ?? {};
      const stepWith = compositeAction.runs?.steps?.[0]?.with ?? {};

      const mismatches: string[] = [];
      const withOperation = stepWith.operation;
      if (withOperation !== operation) {
        mismatches.push(`${relativePath}: expected step with.operation to be '${operation}' but got ${JSON.stringify(withOperation)}`);
      }

      const compositeInputNames = new Set(Object.keys(compositeInputs));
      const mappedInputNames = new Set(Object.keys(stepWith).filter((name) => name !== 'operation'));

      const missingInWith = setToSortedArray(new Set([...compositeInputNames].filter((name) => !mappedInputNames.has(name))));
      const extraInWith = setToSortedArray(new Set([...mappedInputNames].filter((name) => !compositeInputNames.has(name))));

      if (missingInWith.length > 0) {
        mismatches.push(`${relativePath}: inputs missing from step.with: [${missingInWith.join(', ')}]`);
      }
      if (extraInWith.length > 0) {
        mismatches.push(`${relativePath}: step.with contains undeclared inputs: [${extraInWith.join(', ')}]`);
      }

      for (const inputName of compositeInputNames) {
        if (!mainInputs[inputName]) {
          mismatches.push(`${relativePath}: input '${inputName}' is not defined in root action.yml`);
          continue;
        }

        const mainDefault = mainInputs[inputName]?.default;
        const compositeDefault = compositeInputs[inputName]?.default;
        if (mainDefault !== compositeDefault) {
          mismatches.push(
            `${relativePath}: input '${inputName}' default mismatch\n  composite: ${JSON.stringify(compositeDefault)}\n  root:      ${JSON.stringify(mainDefault)}`
          );
        }

        const mappedValue = stepWith[inputName];
        const mappedValueText = typeof mappedValue === 'string' ? mappedValue.trim() : '';
        if (!expressionForInput(inputName).test(mappedValueText)) {
          mismatches.push(
            `${relativePath}: input '${inputName}' must be forwarded as \${{ inputs.${inputName} }} but got ${JSON.stringify(mappedValue)}`
          );
        }
      }

      expect(mismatches).toEqual([]);
    });

    it('only exposes outputs that exist in root action.yml', () => {
      const compositeAction = loadActionDefinition(absolutePath);
      const compositeOutputs = compositeAction.outputs ?? {};

      const mismatches: string[] = [];
      for (const outputName of Object.keys(compositeOutputs)) {
        if (!mainOutputs[outputName]) {
          mismatches.push(`${relativePath}: output '${outputName}' is not defined in root action.yml`);
        }
      }

      expect(mismatches).toEqual([]);
    });
  });
});
