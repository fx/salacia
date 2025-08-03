import type { APIRoute } from 'astro';
import { db, testConnection } from '@/lib/db';
import { healthChecks } from '@/lib/db/schema';

/**
 * Health check API endpoint.
 *
 * Returns system health status including database connectivity.
 * Records health check results in the database for monitoring.
 *
 * @returns JSON response with health status and timing information
 */
export const GET: APIRoute = async () => {
  const startTime = Date.now();
  let databaseStatus = false;
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
  const details: Record<string, unknown> = {};

  try {
    // Test database connection
    const dbTestStart = Date.now();
    databaseStatus = await testConnection();
    const dbTestEnd = Date.now();

    details.database = {
      connected: databaseStatus,
      responseTime: dbTestEnd - dbTestStart,
    };

    // Determine overall status
    if (databaseStatus) {
      status = 'healthy';
    } else {
      status = 'unhealthy';
      details.errors = ['Database connection failed'];
    }
  } catch (error) {
    status = 'unhealthy';
    details.errors = [error instanceof Error ? error.message : 'Unknown error'];
    details.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  // Prepare response data
  const healthData = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime,
    services: {
      database: databaseStatus ? 'healthy' : 'unhealthy',
    },
    details,
  };

  // Record health check in database if database is available
  try {
    if (databaseStatus) {
      await db.insert(healthChecks).values({
        status,
        databaseStatus,
        responseTime,
        details,
      });
    }
  } catch (error) {
    // Don't fail the health check if we can't log it
    console.error('Failed to log health check:', error);
  }

  // Return appropriate HTTP status code
  const httpStatus = status === 'healthy' ? 200 : 503;

  return new Response(JSON.stringify(healthData, null, 2), {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
