import * as core from '@actions/core';
import * as exec from '@actions/exec';
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
export async function getOidcAuth(serviceUrl, platform) {
    // Determine the resource URL to request token for
    // If custom service URL is provided, use it as the token resource
    const tokenResource = serviceUrl || 'https://marketplace.visualstudio.com';
    // Use the provided service URL or default to marketplace URL
    const finalServiceUrl = serviceUrl || 'https://marketplace.visualstudio.com';
    core.info('Getting Azure AD token via Azure CLI (requires azure/login action)...');
    try {
        // Execute Azure CLI to get access token
        let output = '';
        let errorOutput = '';
        const exitCode = await exec.exec('az', ['account', 'get-access-token', '--resource', tokenResource, '--output', 'json'], {
            silent: true,
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                },
                stderr: (data) => {
                    errorOutput += data.toString();
                },
            },
        });
        if (exitCode !== 0) {
            throw new Error(`Azure CLI exited with code ${exitCode}: ${errorOutput}`);
        }
        // Parse JSON output
        const result = JSON.parse(output);
        const token = result.accessToken;
        if (!token) {
            throw new Error('No accessToken in Azure CLI response');
        }
        // Mask the token immediately using both the core API and platform adapter
        // This provides defense in depth
        core.setSecret(token);
        platform.setSecret(token);
        core.info('Successfully obtained Azure AD token via Azure CLI');
        return {
            authType: 'pat', // Use 'pat' type as the token format is similar
            serviceUrl: finalServiceUrl,
            token: token,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get Azure AD token via Azure CLI: ${message}\n\n` +
            'Make sure you have run the azure/login action before this action:\n' +
            '  - uses: azure/login@v2\n' +
            '    with:\n' +
            '      client-id: ${{ secrets.AZURE_CLIENT_ID }}\n' +
            '      tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n' +
            '      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}\n\n' +
            'See: https://jessehouwing.net/authenticate-connect-mggraph-using-oidc-in-github-actions/');
    }
}
//# sourceMappingURL=oidc-auth.js.map