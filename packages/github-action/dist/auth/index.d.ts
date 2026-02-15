import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getBasicAuth } from './basic-auth.js';
import { getOidcAuth } from './oidc-auth.js';
import { getPatAuth } from './pat-auth.js';
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
export { getBasicAuth, getOidcAuth, getPatAuth };
//# sourceMappingURL=index.d.ts.map