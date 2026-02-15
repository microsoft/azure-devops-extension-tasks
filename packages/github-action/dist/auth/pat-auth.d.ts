import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
/**
 * Get PAT authentication from GitHub Actions input
 */
export declare function getPatAuth(token: string, serviceUrl: string | undefined, platform: IPlatformAdapter): Promise<AuthCredentials>;
//# sourceMappingURL=pat-auth.d.ts.map