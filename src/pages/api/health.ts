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

  // List of required environment variables for basic health
  const requiredEnvVars = ['NODE_ENV']; // Add more as needed, e.g., 'API_KEY'
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const details: Record<string, unknown> = {};

  if (missingEnvVars.length > 0) {
    status = 'degraded';
    details.missingEnvVars = missingEnvVars;
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
