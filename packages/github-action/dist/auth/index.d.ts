import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getPatAuth } from './pat-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getOidcAuth } from './oidc-auth.js';
export type AuthType = 'pat' | 'basic' | 'oidc';
export interface AuthOptions {
    token?: string;
    username?: string;
    password?: string;
    serviceUrl?: string;
}
/**
 * Get authentication credentials based on auth type
 */
export declare function getAuth(authType: AuthType, platform: IPlatformAdapter, options: AuthOptions): Promise<AuthCredentials>;
export { getPatAuth, getBasicAuth, getOidcAuth };
//# sourceMappingURL=index.d.ts.map