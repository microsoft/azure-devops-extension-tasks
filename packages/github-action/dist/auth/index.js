import { getPatAuth } from './pat-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getOidcAuth } from './oidc-auth.js';
/**
 * Get authentication credentials based on auth type
 */
export async function getAuth(authType, platform, options) {
    const finalServiceUrl = options.serviceUrl;
    switch (authType) {
        case 'pat':
            if (!options.token) {
                throw new Error('Token is required for PAT authentication');
            }
            return getPatAuth(options.token, finalServiceUrl, platform);
        case 'basic':
            if (!options.username || !options.password) {
                throw new Error('Username and password are required for basic authentication');
            }
            return getBasicAuth(options.username, options.password, finalServiceUrl, platform);
        case 'oidc':
            return getOidcAuth(finalServiceUrl, platform);
        default:
            throw new Error(`Unsupported auth type: ${authType}`);
    }
}
export { getPatAuth, getBasicAuth, getOidcAuth };
//# sourceMappingURL=index.js.map