/**
 * Utility functions for authentication and token management
 */

/**
 * Gets the Claude Code token from the global scope
 * @returns The Claude Code token if available, undefined otherwise
 */
export function getClaudeCodeToken(): string | undefined {
  return (globalThis as unknown as { __claudeCodeToken?: string }).__claudeCodeToken;
}

/**
 * Gets the appropriate token to use for OAuth providers
 * Prioritizes Claude Code token over provider OAuth token
 * @param oauthAccessToken - The provider's OAuth access token
 * @returns The token to use for authentication
 */
export function getAuthToken(oauthAccessToken?: string | null): string | undefined {
  const claudeCodeToken = getClaudeCodeToken();
  return claudeCodeToken || oauthAccessToken || undefined;
}
