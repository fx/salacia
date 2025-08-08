/**
 * Configuration module for Server-Sent Events (SSE) functionality.
 *
 * Provides centralized configuration for SSE endpoints, including
 * connection timeouts, heartbeat intervals, and retry strategies.
 *
 * @module sse/config
 */

/**
 * SSE configuration interface defining all configurable options.
 */
export interface SSEConfig {
  /** Maximum number of connections allowed per client IP */
  maxConnectionsPerIP: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Retry interval sent to clients in milliseconds */
  retryInterval: number;
  /** Maximum number of events to replay from ring buffer */
  maxReplayEvents: number;
  /** Enable debug logging */
  debugMode: boolean;
}

/**
 * Default SSE configuration values.
 * Can be overridden via environment variables.
 */
export const defaultSSEConfig: SSEConfig = {
  maxConnectionsPerIP: parseInt(process.env.SSE_MAX_CONNECTIONS_PER_IP ?? '5', 10),
  heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL ?? '30000', 10),
  connectionTimeout: parseInt(process.env.SSE_CONNECTION_TIMEOUT ?? '300000', 10), // 5 minutes
  retryInterval: parseInt(process.env.SSE_RETRY_INTERVAL ?? '5000', 10),
  maxReplayEvents: parseInt(process.env.SSE_MAX_REPLAY_EVENTS ?? '100', 10),
  debugMode: process.env.SSE_DEBUG === 'true',
};

/**
 * Validates SSE configuration values.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSSEConfig(config: SSEConfig): void {
  if (config.maxConnectionsPerIP < 1) {
    throw new Error('SSE_MAX_CONNECTIONS_PER_IP must be at least 1');
  }

  if (config.heartbeatInterval < 1000) {
    throw new Error('SSE_HEARTBEAT_INTERVAL must be at least 1000ms');
  }

  if (config.connectionTimeout < config.heartbeatInterval) {
    throw new Error('SSE_CONNECTION_TIMEOUT must be greater than heartbeat interval');
  }

  if (config.retryInterval < 1000) {
    throw new Error('SSE_RETRY_INTERVAL must be at least 1000ms');
  }

  if (config.maxReplayEvents < 0 || config.maxReplayEvents > 256) {
    throw new Error('SSE_MAX_REPLAY_EVENTS must be between 0 and 256');
  }
}

/**
 * Gets the current SSE configuration.
 * Validates configuration on first access.
 *
 * @returns Validated SSE configuration
 */
let validatedConfig: SSEConfig | null = null;

export function getSSEConfig(): SSEConfig {
  if (!validatedConfig) {
    validatedConfig = { ...defaultSSEConfig };
    validateSSEConfig(validatedConfig);
  }
  return validatedConfig;
}

/**
 * Formats an SSE message with proper line endings.
 *
 * @param data - Data to send
 * @param event - Optional event type
 * @param id - Optional event ID
 * @param retry - Optional retry interval
 * @returns Formatted SSE message
 */
export function formatSSEMessage(
  data: string | object,
  event?: string,
  id?: string,
  retry?: number
): string {
  let message = '';

  if (id) {
    message += `id: ${id}\n`;
  }

  if (event) {
    message += `event: ${event}\n`;
  }

  if (retry !== undefined) {
    message += `retry: ${retry}\n`;
  }

  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  message += `data: ${dataStr}\n\n`;

  return message;
}

/**
 * Creates a heartbeat message for SSE connections.
 *
 * @returns Formatted heartbeat message
 */
export function createHeartbeatMessage(): string {
  return formatSSEMessage({ type: 'heartbeat', timestamp: new Date().toISOString() }, 'heartbeat');
}
