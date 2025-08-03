/**
 * Database module entry point.
 * Exports all database utilities, schema definitions, and connection management.
 */

export { db, closeConnection, testConnection } from './connection';
export * from './schema';
export type { Env } from '../env';
