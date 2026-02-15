# v6 Documentation

This folder contains implementation and usage documentation for the v6 architecture in this repository.

## Contents

- [Azure Pipelines usage](./azure-pipelines.md)
  - How to use the unified `ExtensionTasks@6` task
  - All supported operations and operation-specific inputs
- [GitHub Actions usage](./github-actions.md)
  - How to use the unified `jessehouwing/azure-devops-extension-tasks@v6` action
  - All supported operations and operation-specific inputs
  - Availability and usage of composite actions per command
- [Authentication and OIDC](./authentication-and-oidc.md)
  - PAT, Basic Auth, Azure RM OIDC (Azure Pipelines), GitHub OIDC
  - Service principal setup in Azure
  - Granting service principal access to your Marketplace publisher
- [Design and architecture](./design-and-architecture.md)
  - v6 package architecture, adapters, command routing, manifest pipeline
- [Contributing](./contributing.md)
  - Local setup, build, debug, test, lint/format, and bundling workflow
- [Migrate Azure Pipelines from v5 to v6](./migrate-azure-pipelines-v5-to-v6.md)
  - Step-by-step migration from legacy v5 task usage to unified `ExtensionTasks@6`
- [Migrate Azure Pipelines to GitHub Actions](./migrate-azure-pipelines-v6-to-github-actions.md)
  - Input/auth/output mapping and end-to-end workflow translation guidance
- [Migrate Azure Pipelines v5 to GitHub Actions](./migrate-azure-pipelines-v5-to-github-actions.md)
  - Direct migration path from legacy v5 task model to GitHub Actions workflows

## Scope

These docs are intentionally focused on **v6** behavior and structure in this monorepo.
They are based on:

- `packages/azdo-task/task.json`
- `action.yml`
- command wrappers in `*/action.yaml`
- core implementation in `packages/core/src`
