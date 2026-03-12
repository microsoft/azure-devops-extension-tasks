---
applyTo: '**/action.yml,**/action.yaml,**/action.schema.yml,**/action.schema.yaml'
description: Guidance for GitHub Actions manifests
---

# Action Manifest Authoring Rules

- Do not put deprecation notices in an input `description`.
- For deprecated inputs, use the dedicated `deprecationMessage:` field.
- Keep deprecation text synchronized across related manifests (for example root `action.yml` and composite action manifests).
- When renaming an input, add a new input with the new name and add a `deprecationMessage:` to the old input explaining what new input to use instead.
- **Never set a `default` on a deprecated input.** GitHub Actions always provides the default value even when the user doesn't set the input, so runtime conflict checks between the old and new input will see both as set with different values and fail. Either remove `default` from the deprecated input or remove the deprecated input entirely.

## Action wrapper synchronization strategy

- Treat root `action.yml` as the source of truth for shared input/output metadata.
- Keep every composite wrapper `*/action.yaml` synchronized for:
  - input names and defaults
  - forwarded `runs.steps[0].with` mappings
  - input/output descriptions (wrapper descriptions must include root descriptions)
  - operation-scoped required flags comments
- After any change to root `action.yml` or any wrapper `action.yaml`, run the synchronization tests:
  - `packages/github-action/src/__tests__/action-wrapper-contract.test.ts`
  - `packages/github-action/src/__tests__/action-metadata-parity.test.ts`
  - `packages/github-action/src/__tests__/action-required-comments.test.ts`
- Preferred command:
  - `npm test -- packages/github-action/src/__tests__/action-wrapper-contract.test.ts packages/github-action/src/__tests__/action-metadata-parity.test.ts packages/github-action/src/__tests__/action-required-comments.test.ts`
- Do not merge wrapper metadata/input changes until these tests pass.
