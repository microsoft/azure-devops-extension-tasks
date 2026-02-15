/**
 * Get PAT authentication from GitHub Actions input
 */
export async function getPatAuth(token, serviceUrl, platform) {
    if (!token) {
        throw new Error('PAT token is required');
    }
    // Mask the secret immediately to prevent exposure in logs
    platform.setSecret(token);
    // Use provided service URL or default to marketplace
    const finalServiceUrl = serviceUrl || 'https://marketplace.visualstudio.com';
    return {
        authType: 'pat',
        serviceUrl: finalServiceUrl,
        token,
    };
}
//# sourceMappingURL=pat-auth.js.map