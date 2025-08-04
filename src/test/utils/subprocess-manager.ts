/**
 * Subprocess management utilities for testing
 *
 * This module provides utilities for spawning, managing, and cleaning up
 * child processes during tests, with proper timeout handling and cleanup.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Configuration for subprocess spawning
 */
export interface SubprocessConfig {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to capture stdout */
  captureStdout?: boolean;
  /** Whether to capture stderr */
  captureStderr?: boolean;
}

/**
 * Result of subprocess execution
 */
export interface SubprocessResult {
  /** Exit code */
  exitCode: number | null;
  /** Signal that terminated the process */
  signal: string | null;
  /** Captured stdout */
  stdout: string;
  /** Captured stderr */
  stderr: string;
  /** Whether the process timed out */
  timedOut: boolean;
}

/**
 * Managed subprocess with cleanup capabilities
 */
export class ManagedSubprocess extends EventEmitter {
  private process: ChildProcess | null = null;
  private stdoutChunks: Buffer[] = [];
  private stderrChunks: Buffer[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private killed = false;
  private resolved = false;

  constructor(private config: SubprocessConfig) {
    super();
  }

  /**
   * Start the subprocess
   * @returns Promise that resolves when the process exits or times out
   */
  async start(): Promise<SubprocessResult> {
    return new Promise((resolve, reject) => {
      try {
        // Merge environment variables
        const env = {
          ...process.env,
          ...this.config.env,
        };

        // Spawn the process
        this.process = spawn(this.config.command, this.config.args || [], {
          env,
          cwd: this.config.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Handle process events
        this.process.on('error', (error) => {
          if (!this.resolved) {
            this.resolved = true;
            this.cleanup();
            reject(error);
          }
        });

        this.process.on('exit', (code, signal) => {
          if (!this.resolved) {
            this.resolved = true;
            this.cleanup();
            resolve({
              exitCode: code,
              signal,
              stdout: this.config.captureStdout !== false ? Buffer.concat(this.stdoutChunks).toString() : '',
              stderr: this.config.captureStderr !== false ? Buffer.concat(this.stderrChunks).toString() : '',
              timedOut: this.killed,
            });
          }
        });

        // Capture stdout if requested
        if (this.config.captureStdout !== false && this.process.stdout) {
          this.process.stdout.on('data', (chunk: Buffer) => {
            this.stdoutChunks.push(chunk);
            this.emit('stdout', chunk.toString());
          });
        }

        // Capture stderr if requested
        if (this.config.captureStderr !== false && this.process.stderr) {
          this.process.stderr.on('data', (chunk: Buffer) => {
            this.stderrChunks.push(chunk);
            this.emit('stderr', chunk.toString());
          });
        }

        // Set up timeout if specified
        if (this.config.timeout && this.config.timeout > 0) {
          this.timeoutId = setTimeout(() => {
            if (!this.resolved) {
              this.killed = true;
              this.kill();
            }
          }, this.config.timeout);
        }

      } catch (error) {
        if (!this.resolved) {
          this.resolved = true;
          this.cleanup();
          reject(error);
        }
      }
    });
  }

  /**
   * Send input to the subprocess stdin
   * @param input - Input to send
   */
  write(input: string): void {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(input);
    }
  }

  /**
   * End the stdin stream
   */
  endInput(): void {
    if (this.process && this.process.stdin) {
      this.process.stdin.end();
    }
  }

  /**
   * Kill the subprocess
   * @param signal - Signal to send (default: SIGTERM)
   */
  kill(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.process && !this.process.killed) {
      this.process.kill(signal);
    }
  }

  /**
   * Get the process ID
   */
  get pid(): number | undefined {
    return this.process?.pid;
  }

  /**
   * Check if the process is running
   */
  get isRunning(): boolean {
    return this.process !== null && !this.process.killed && this.process.exitCode === null;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Process registry for tracking and cleaning up processes
 */
export class ProcessRegistry {
  private processes: Set<ManagedSubprocess> = new Set();

  /**
   * Register a process for cleanup
   * @param process - Process to register
   */
  register(process: ManagedSubprocess): void {
    this.processes.add(process);

    // Automatically unregister when process exits
    process.once('exit', () => {
      this.processes.delete(process);
    });
  }

  /**
   * Kill all registered processes
   * @param signal - Signal to send
   */
  killAll(signal: NodeJS.Signals = 'SIGTERM'): void {
    for (const process of this.processes) {
      if (process.isRunning) {
        process.kill(signal);
      }
    }
  }

  /**
   * Wait for all processes to exit
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForAll(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (this.processes.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force kill any remaining processes
    if (this.processes.size > 0) {
      this.killAll('SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Get count of active processes
   */
  get activeCount(): number {
    return Array.from(this.processes).filter(p => p.isRunning).length;
  }
}

/**
 * Global process registry for test cleanup
 */
export const globalProcessRegistry = new ProcessRegistry();

/**
 * Utility function to spawn a subprocess with automatic cleanup
 * @param config - Subprocess configuration
 * @returns Managed subprocess instance
 */
export function spawnManaged(config: SubprocessConfig): ManagedSubprocess {
  const process = new ManagedSubprocess(config);
  globalProcessRegistry.register(process);
  return process;
}

/**
 * Utility function to run a subprocess and wait for completion
 * @param config - Subprocess configuration
 * @returns Promise that resolves to the subprocess result
 */
export async function runSubprocess(config: SubprocessConfig): Promise<SubprocessResult> {
  const process = spawnManaged(config);
  return await process.start();
}