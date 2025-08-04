/**
 * Main library entry point for the Salacia application.
 * 
 * This module exports all public APIs, types, and utilities used throughout
 * the application, providing a centralized entry point for internal modules.
 */

// Database types and utilities
export * from './db/index.js';

// Type definitions
export * from './types/index.js';

// AI-related functionality
export * from './ai/types.js';

// Utility functions
export * from './utils/logger.js';

// Environment configuration
export * from './env.js';