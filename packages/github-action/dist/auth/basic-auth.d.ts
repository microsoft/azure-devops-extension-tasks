import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
/**
 * Get basic authentication from GitHub Actions inputs
 */
export declare function getBasicAuth(username: string, password: string, serviceUrl: string | undefined, platform: IPlatformAdapter): Promise<AuthCredentials>;
//# sourceMappingURL=basic-auth.d.ts.map