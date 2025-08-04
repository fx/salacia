/**
 * Test server utilities for integration testing
 *
 * This module provides utilities for starting a real HTTP server that serves
 * our API endpoints with MSW mocks for testing Claude Code integration.
 */

import { createServer, Server } from 'http';
import { setupServer } from 'msw/node';
import { defaultHandlers } from '../mocks/handlers';
import type { RequestHandler } from 'msw';

/**
 * Configuration for the test server
 */
export interface TestServerConfig {
  /** Port to listen on (default: 0 for random port) */
  port?: number;
  /** Host to bind to (default: localhost) */
  host?: string;
  /** MSW handlers to use */
  handlers?: RequestHandler[];
  /** Timeout for server operations in milliseconds */
  timeout?: number;
}

/**
 * Test server instance with MSW integration
 */
export class TestServer {
  private httpServer: Server | null = null;
  private mswServer: ReturnType<typeof setupServer> | null = null;
  private _port: number | null = null;
  private _host: string = 'localhost';

  constructor(private config: TestServerConfig = {}) {
    this._host = config.host || 'localhost';
  }

  /**
   * Start the test server
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Set up MSW server
        this.mswServer = setupServer(...(this.config.handlers || defaultHandlers));
        this.mswServer.listen({ onUnhandledRequest: 'bypass' });

        // Create HTTP server that forwards requests to MSW
        this.httpServer = createServer((req, res) => {
          // Enable CORS for all requests
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');

          // Handle preflight requests
          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          // Transform the request to match our API structure
          const originalUrl = req.url || '';
          
          // Map our local API paths to Anthropic API paths for MSW
          let targetUrl = originalUrl;
          if (originalUrl.startsWith('/api/v1/messages')) {
            targetUrl = originalUrl.replace('/api/v1/messages', '/v1/messages');
          }

          // Create a mock fetch request for MSW to handle
          const protocol = req.connection.encrypted ? 'https:' : 'http:';
          const host = req.headers.host || `${this._host}:${this._port}`;
          const fullUrl = `https://api.anthropic.com${targetUrl}`;

          // Collect request body
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              // Create a Request object for MSW
              const request = new Request(fullUrl, {
                method: req.method,
                headers: Object.fromEntries(
                  Object.entries(req.headers).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join(', ') : value || ''
                  ])
                ),
                body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
              });

              // Use node-fetch-like behavior to handle the request
              const response = await fetch(request);
              
              // Forward response status and headers
              res.statusCode = response.status;
              
              // Copy headers from MSW response
              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });

              // Handle streaming responses
              if (response.body) {
                const reader = response.body.getReader();
                
                const pump = async (): Promise<void> => {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    res.end();
                    return;
                  }
                  
                  res.write(Buffer.from(value));
                  return pump();
                };
                
                await pump();
              } else {
                res.end();
              }
            } catch (error) {
              console.error('Error handling request:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                type: 'error',
                error: {
                  type: 'api_error',
                  message: 'Internal server error'
                }
              }));
            }
          });

          req.on('error', (error) => {
            console.error('Request error:', error);
            res.statusCode = 400;
            res.end();
          });
        });

        // Start listening
        this.httpServer.listen(this.config.port || 0, this._host, () => {
          const address = this.httpServer?.address();
          if (address && typeof address === 'object') {
            this._port = address.port;
          }
          resolve();
        });

        this.httpServer.on('error', reject);

        // Set timeout if specified
        if (this.config.timeout) {
          this.httpServer.timeout = this.config.timeout;
        }

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the test server
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close MSW server
      if (this.mswServer) {
        this.mswServer.close();
        this.mswServer = null;
      }

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server port
   */
  get port(): number | null {
    return this._port;
  }

  /**
   * Get the server host
   */
  get host(): string {
    return this._host;
  }

  /**
   * Get the server URL
   */
  get url(): string | null {
    if (this._port === null) {
      return null;
    }
    return `http://${this._host}:${this._port}`;
  }

  /**
   * Get the API base URL for Claude Code
   */
  get apiBaseUrl(): string | null {
    if (this._port === null) {
      return null;
    }
    return `http://${this._host}:${this._port}/api`;
  }

  /**
   * Check if the server is running
   */
  get isRunning(): boolean {
    return this.httpServer !== null && this.httpServer.listening;
  }

  /**
   * Update MSW handlers
   * @param handlers - New handlers to use
   */
  updateHandlers(handlers: RequestHandler[]): void {
    if (this.mswServer) {
      this.mswServer.use(...handlers);
    }
  }

  /**
   * Reset MSW handlers to default
   */
  resetHandlers(): void {
    if (this.mswServer) {
      this.mswServer.resetHandlers();
    }
  }
}

/**
 * Test server registry for managing multiple test servers
 */
export class TestServerRegistry {
  private servers: Set<TestServer> = new Set();

  /**
   * Register a test server for cleanup
   * @param server - Server to register
   */
  register(server: TestServer): void {
    this.servers.add(server);
  }

  /**
   * Unregister a test server
   * @param server - Server to unregister
   */
  unregister(server: TestServer): void {
    this.servers.delete(server);
  }

  /**
   * Stop all registered servers
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.servers).map(server => server.stop());
    await Promise.all(promises);
    this.servers.clear();
  }

  /**
   * Get count of active servers
   */
  get activeCount(): number {
    return Array.from(this.servers).filter(server => server.isRunning).length;
  }
}

/**
 * Global test server registry
 */
export const globalTestServerRegistry = new TestServerRegistry();

/**
 * Utility function to create and start a test server
 * @param config - Server configuration
 * @returns Promise that resolves to the started test server
 */
export async function createTestServer(config: TestServerConfig = {}): Promise<TestServer> {
  const server = new TestServer(config);
  globalTestServerRegistry.register(server);
  await server.start();
  return server;
}