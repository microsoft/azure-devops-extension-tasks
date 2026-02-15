import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
/**
 * Get Azure AD token via Azure CLI for marketplace authentication
 *
 * This approach requires the azure/login action to be run first with OIDC federation.
 * The azure/login action handles:
 * 1. GitHub OIDC → Azure AD federation
 * 2. Azure CLI authentication
 *
 * Then this function retrieves an Azure AD access token using the Azure CLI.
 * This token is accepted by the Visual Studio Marketplace.
 *
 * This mirrors the Azure Pipelines approach where Azure RM service connections
 * provide Azure AD tokens for marketplace operations.
 *
 * Requirements:
 * 1. Run azure/login action first:
 *    ```yaml
 *    - uses: azure/login@v2
 *      with:
 *        client-id: ${{ secrets.AZURE_CLIENT_ID }}
 *        tenant-id: ${{ secrets.AZURE_TENANT_ID }}
 *        subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
 *    ```
 *
 * 2. Azure App Registration with:
 *    - Federated credentials for GitHub Actions
 *    - Appropriate permissions (if needed for marketplace)
 *
 * See: https://jessehouwing.net/authenticate-connect-mggraph-using-oidc-in-github-actions/
 *
 * @param resource - The Azure resource to get token for (defaults to marketplace)
 * @param platform - Platform adapter for secret masking
 */
export declare function getOidcAuth(serviceUrl: string | undefined, platform: IPlatformAdapter): Promise<AuthCredentials>;
//# sourceMappingURL=oidc-auth.d.ts.map