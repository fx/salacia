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
 *
 * @warning DEVELOPMENT ONLY: This in-memory storage is not suitable for production.
 * In production, this should use Redis or database-backed session store with:
 * - Persistence across server restarts
 * - Scalability across multiple server instances
 * - Automatic session cleanup and expiration
 * - Enhanced security with encrypted session data
 *
 * @todo Replace with Redis or database storage before production deployment
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
