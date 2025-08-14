import type { PKCEParams } from './oauth-service';

/**
 * OAuth session data
 */
export interface OAuthSession {
  providerId: string;
  pkceParams: PKCEParams;
  clientId?: string;
  redirectUri?: string;
  createdAt: Date;
}

/**
 * Shared OAuth session storage
 * In production, this should use Redis or database with proper cleanup
 */
export const oauthSessions = new Map<string, OAuthSession>();

/**
 * Clean up expired sessions every 10 minutes
 */
setInterval(
  () => {
    const now = new Date();
    const expiredCutoff = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

    for (const [sessionId, session] of oauthSessions.entries()) {
      if (session.createdAt < expiredCutoff) {
        oauthSessions.delete(sessionId);
      }
    }
  },
  10 * 60 * 1000
);
