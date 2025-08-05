import type { APIRoute } from 'astro';

/**
 * Server-Sent Events endpoint for real-time message updates.
 * This endpoint streams new messages as they are created in the system.
 */
export const GET: APIRoute = async ({ request }) => {
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': Connected to message stream\n\n'));

      // Simulate real-time updates for demo purposes
      // In production, this would connect to your message queue or database change stream
      const interval = setInterval(() => {
        const mockMessage = {
          id: `msg-${Date.now()}`,
          createdAt: new Date().toISOString(),
          model: ['gpt-4', 'claude-3', 'llama-2'][Math.floor(Math.random() * 3)],
          provider: ['openai', 'anthropic', 'replicate'][Math.floor(Math.random() * 3)],
          totalTokens: Math.floor(Math.random() * 5000) + 100,
          responseTime: Math.floor(Math.random() * 3000) + 200,
          isSuccess: Math.random() > 0.1,
          error: null,
        };

        const data = `data: ${JSON.stringify(mockMessage)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }, 15000); // Send a new message every 15 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};