import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  // Sample data for development
  const sampleMessages = Array.from({ length: 100 }, (_, i) => ({
    id: `msg-${i + 1}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    model: ['gpt-4', 'claude-3', 'llama-2'][i % 3],
    provider: ['openai', 'anthropic', 'replicate'][i % 3],
    totalTokens: Math.floor(Math.random() * 5000) + 100,
    responseTime: Math.floor(Math.random() * 3000) + 200,
    status: Math.random() > 0.1 ? 'success' : 'error',
    prompt: `Sample prompt ${i + 1}`,
    response: `Sample response ${i + 1}...`,
  }));
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedMessages = sampleMessages.slice(start, end);
  
  return new Response(JSON.stringify({
    messages: paginatedMessages,
    total: sampleMessages.length,
    page,
    limit,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};