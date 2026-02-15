import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

type ActionField = {
  description?: unknown;
  required?: unknown;
  default?: unknown;
};

type ActionDefinition = {
  inputs?: Record<string, ActionField>;
  outputs?: Record<string, ActionField>;
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

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDescription(value: unknown): string {
  const content = asTrimmedString(value);
  if (content.length === 0) {
    return content;
  }

  return content
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeDescriptionForComparison(value: unknown): string {
  const content = normalizeDescription(value);
  if (content.length === 0) {
    return content;
  }

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^[-*]?\s*required\s+for\b/i.test(line))
    .filter((line) => !/^[-*]?\s*required\s+for\s+all\s+operations\b/i.test(line));

  return lines
    .join(' ')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function descriptionContainsFullRootText(
  compositeDescription: unknown,
  rootDescription: unknown
): boolean {
  const compositeNormalized = normalizeDescriptionForComparison(compositeDescription);
  const rootNormalized = normalizeDescriptionForComparison(rootDescription);

  if (!rootNormalized) {
    return compositeNormalized.length === 0;
  }

  return compositeNormalized.includes(rootNormalized);
}

function assertNoMismatches(mismatches: string[]): void {
  if (mismatches.length === 0) {
    return;
  }

  const maxLines = 25;
  const visible = mismatches.slice(0, maxLines);
  const hiddenCount = mismatches.length - visible.length;
  const summary = hiddenCount > 0 ? `\n...and ${hiddenCount} more mismatch(es).` : '';

  throw new Error(
    `Found ${mismatches.length} metadata mismatch(es):\n${visible.join('\n')}\n${summary}`
  );
}

describe('Action metadata parity', () => {
  const mainAction = loadActionDefinition(mainActionPath);
  const mainInputs = mainAction.inputs ?? {};
  const mainOutputs = mainAction.outputs ?? {};

  describe.each(compositeActionTable)(
    '$operation composite action ($relativePath)',
    ({ absolutePath, relativePath }) => {
      it('keeps inputs aligned with the root action (except required)', () => {
        const compositeAction = loadActionDefinition(absolutePath);
        const compositeInputs = compositeAction.inputs ?? {};

        const mismatches: string[] = [];

        for (const [inputName, compositeInput] of Object.entries(compositeInputs)) {
          const mainInput = mainInputs[inputName];
          if (!mainInput) {
            mismatches.push(`${relativePath}: input '${inputName}' is missing from root action`);
            continue;
          }

          if (typeof compositeInput.description !== typeof mainInput.description) {
            mismatches.push(
              `${relativePath}: input '${inputName}' has description type '${typeof compositeInput.description}' but root has '${typeof mainInput.description}'`
            );
          }

          if (!descriptionContainsFullRootText(compositeInput.description, mainInput.description)) {
            const compositeDescription = normalizeDescription(compositeInput.description);
            const mainDescription = normalizeDescription(mainInput.description);
            mismatches.push(
              `${relativePath}: input '${inputName}' description does not fully include root description (excluding 'Required for...' lines)\n  composite: ${JSON.stringify(compositeDescription)}\n  root:      ${JSON.stringify(mainDescription)}`
            );
          }

          if (typeof compositeInput.default !== typeof mainInput.default) {
            mismatches.push(
              `${relativePath}: input '${inputName}' has default type '${typeof compositeInput.default}' but root has '${typeof mainInput.default}'`
            );
          }

          if (
            compositeInput.default !== undefined &&
            mainInput.default !== undefined &&
            compositeInput.default !== mainInput.default
          ) {
            mismatches.push(
              `${relativePath}: input '${inputName}' default mismatch\n  composite: ${JSON.stringify(compositeInput.default)}\n  root:      ${JSON.stringify(mainInput.default)}`
            );
          }
        }

        assertNoMismatches(mismatches);
      });

      it('keeps outputs aligned with the root action', () => {
        const compositeAction = loadActionDefinition(absolutePath);
        const compositeOutputs = compositeAction.outputs ?? {};

        const mismatches: string[] = [];

        for (const [outputName, compositeOutput] of Object.entries(compositeOutputs)) {
          const mainOutput = mainOutputs[outputName];
          if (!mainOutput) {
            mismatches.push(`${relativePath}: output '${outputName}' is missing from root action`);
            continue;
          }

          if (typeof compositeOutput.description !== typeof mainOutput.description) {
            mismatches.push(
              `${relativePath}: output '${outputName}' has description type '${typeof compositeOutput.description}' but root has '${typeof mainOutput.description}'`
            );
          }

          if (
            !descriptionContainsFullRootText(compositeOutput.description, mainOutput.description)
          ) {
            const compositeDescription = normalizeDescription(compositeOutput.description);
            const mainDescription = normalizeDescription(mainOutput.description);
            mismatches.push(
              `${relativePath}: output '${outputName}' description does not fully include root description (excluding 'Required for...' lines)\n  composite: ${JSON.stringify(compositeDescription)}\n  root:      ${JSON.stringify(mainDescription)}`
            );
          }
        }

        assertNoMismatches(mismatches);
      });
    }
  );
});
