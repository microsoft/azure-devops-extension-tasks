# Authentication and OIDC

This project supports multiple authentication methods across Azure Pipelines and GitHub Actions.

## Mechanisms

### PAT (Personal Access Token)

- Best for quick setup and local experimentation.
- Azure Pipelines: `connectionType: connectedService:VsTeam` with a VsTeam service connection.
- GitHub Actions: `auth-type: pat` with `token`.
- Typical required scopes depend on operation (publish/share/install/etc.).

### Basic Auth

- Intended for on-prem Azure DevOps Server/TFS scenarios.
- Azure Pipelines: `connectionType: connectedService:Generic`.
- GitHub Actions: `auth-type: basic` with `username` and `password`.

### OIDC / Workload Identity Federation

- Preferred for CI/CD in cloud environments.
- Avoids long-lived PAT secrets by minting short-lived tokens at runtime.
- Azure Pipelines: `connectionType: connectedService:AzureRM`.
- GitHub Actions: `auth-type: oidc` (with Azure federated identity setup).

---

## Azure Pipelines OIDC setup (service principal + marketplace access)

This section follows the approach from Jesse Houwing’s guide:
<https://jessehouwing.net/publish-azure-devops-extensions-using-workload-identity-oidc/>.

### 1) Enable workload identity capability in Azure DevOps

- In Azure DevOps organization preview features, enable Workload Identity federation for ARM service connections (if your org still requires this toggle).

### 2) Create an Azure RM service connection using Workload Identity Federation

- In Project Settings → Service connections → New service connection.
- Select **Azure Resource Manager**.
- Choose **Workload Identity Federation** (automatic or manual).
- Save the service connection.

### 3) Ensure the generated service principal exists and is usable

- In Azure Portal, confirm app/service principal details.
- Ensure it has access required for your tenant/subscription context.

### 4) Add the service principal to your Azure DevOps organization users

- Organization Settings → Users → Add users.
- Add the service principal identity.

### 5) Resolve the Azure DevOps identity GUID for that principal

- Run token-based profile query as the principal:

```yaml
- task: AzureCLI@2
  displayName: Fetch profile id
  inputs:
    azureSubscription: <your-oidc-arm-service-connection>
    scriptType: pscore
    scriptLocation: inlineScript
    inlineScript: |
      az rest -u https://app.vssps.visualstudio.com/_apis/profile/profiles/me --resource 499b84ac-1321-427f-aa17-267ca6975798
```

- Capture the identity GUID from the response.

### 6) Grant marketplace publisher access to the service principal

- Open Marketplace publisher management (Publish Extensions → Members).
- Add the service principal identity GUID as member.
- Assign role (`Reader` for validation, then elevate to `Contributor` for publishing if needed).

### 7) Configure the pipeline to request a token and use it

For modern v6 task usage, the recommended approach is to use `connectionType: connectedService:AzureRM` directly on `ExtensionTasks@6` with your OIDC ARM connection.

```yaml
- task: ExtensionTasks@6
  inputs:
    operation: publish
    connectionType: connectedService:AzureRM
    connectionNameAzureRM: azure-devops-marketplace-oidc
    publishSource: manifest
```

If you are integrating with legacy steps expecting PAT-backed VsTeam service connections, you can use the token-override pattern from Jesse’s article (`task.setendpoint` with a runtime token), but this is generally a migration/compatibility path.

---

## GitHub Actions OIDC setup

### 1) Create an Entra app registration + service principal

- Create/register an app in Microsoft Entra ID.
- Create corresponding service principal.

### 2) Add federated credentials for your GitHub repo/environment

- Configure federated credential subject to match your workflow context (branch/tag/environment).

### 3) Grant Marketplace publisher membership to the service principal identity

- Same requirement as Azure Pipelines: the principal identity must be a member of the Marketplace publisher.

### 4) Authenticate with `azure/login` and run this action with `auth-type: oidc`

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

  - uses: jessehouwing/azure-devops-extension-tasks@refactor/v6
    with:
      operation: publish
      auth-type: oidc
      publisher-id: mypublisher
      extension-id: myextension
```

---

## Troubleshooting checklist

- Azure DevOps org linked to the same Entra tenant as the service principal.
- Service principal added as Azure DevOps org user.
- Service principal identity GUID added to Marketplace publisher members.
- Workflow/pipeline principal can request token for resource `499b84ac-1321-427f-aa17-267ca6975798`.
- OIDC trust conditions (audience/subject/issuer) match actual pipeline/workflow context.
