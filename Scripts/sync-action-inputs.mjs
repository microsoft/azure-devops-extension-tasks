#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const compositeActions = [
  'install/action.yaml',
  'package/action.yaml',
  'publish/action.yaml',
  'query-version/action.yaml',
  'share/action.yaml',
  'show/action.yaml',
  'unpublish/action.yaml',
  'unshare/action.yaml',
  'wait-for-installation/action.yaml',
  'wait-for-validation/action.yaml',
];

const checkOnly = process.argv.includes('--check');

function loadYaml(content) {
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML document');
  }
  return parsed;
}

function syncInputFromRoot(compositeInput, rootInput) {
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(rootInput, 'description')) {
    if (compositeInput.description !== rootInput.description) {
      compositeInput.description = rootInput.description;
      changed = true;
    }
  }

  if (Object.prototype.hasOwnProperty.call(rootInput, 'default')) {
    if (compositeInput.default !== rootInput.default) {
      compositeInput.default = rootInput.default;
      changed = true;
    }
  } else if (Object.prototype.hasOwnProperty.call(compositeInput, 'default')) {
    delete compositeInput.default;
    changed = true;
  }

  return changed;
}

async function main() {
  const rootActionPath = path.join(rootDir, 'action.yml');
  const rootActionContent = await fs.readFile(rootActionPath, 'utf8');
  const rootAction = loadYaml(rootActionContent);
  const rootInputs = rootAction.inputs ?? {};

  if (!rootInputs || typeof rootInputs !== 'object') {
    throw new Error('Root action.yml does not contain a valid inputs section');
  }

  let updatedFiles = 0;
  let checkedFiles = 0;
  const driftMessages = [];

  for (const relativeActionPath of compositeActions) {
    const absoluteActionPath = path.join(rootDir, relativeActionPath);
    const compositeContent = await fs.readFile(absoluteActionPath, 'utf8');
    const compositeAction = loadYaml(compositeContent);
    const compositeInputs = compositeAction.inputs ?? {};

    if (!compositeInputs || typeof compositeInputs !== 'object') {
      continue;
    }

    checkedFiles++;
    let changed = false;

    for (const [inputName, compositeInput] of Object.entries(compositeInputs)) {
      if (!Object.prototype.hasOwnProperty.call(rootInputs, inputName)) {
        continue;
      }

      if (!compositeInput || typeof compositeInput !== 'object') {
        continue;
      }

      const rootInput = rootInputs[inputName];
      if (!rootInput || typeof rootInput !== 'object') {
        continue;
      }

      if (syncInputFromRoot(compositeInput, rootInput)) {
        changed = true;
        driftMessages.push(`${relativeActionPath}: synchronized '${inputName}'`);
      }
    }

    if (changed) {
      if (checkOnly) {
        continue;
      }

      const rendered =
        yaml.dump(compositeAction, {
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
        }) + '\n';

      await fs.writeFile(absoluteActionPath, rendered, 'utf8');
      updatedFiles++;
    }
  }

  if (driftMessages.length > 0) {
    for (const message of driftMessages) {
      console.log(message);
    }
  }

  if (checkOnly) {
    if (driftMessages.length > 0) {
      console.error(`Found input metadata drift in ${driftMessages.length} place(s).`);
      process.exit(1);
    }
    console.log(`No input metadata drift found across ${checkedFiles} composite action file(s).`);
    return;
  }

  if (updatedFiles > 0) {
    console.log(`Updated ${updatedFiles} composite action file(s).`);
  } else {
    console.log(`No changes needed across ${checkedFiles} composite action file(s).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
