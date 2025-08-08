import type { APIRoute } from 'astro';

/**
 * Health check API endpoint.
 *
 * Returns system health status.
 * Simple health check without database dependencies.
 *
 * @returns JSON response with health status and timing information
 */
export const GET: APIRoute = async () => {
  const startTime = Date.now();
  const status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const details: Record<string, unknown> = {};

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  // Prepare response data
  const healthData = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime,
    services: {
      api: 'healthy',
    },
    details,
  };

  // Return healthy status
  return new Response(JSON.stringify(healthData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
