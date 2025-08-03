/**
 * Anthropic API Compatible Messages Endpoint
 * 
 * Provides an Anthropic-compatible API endpoint that can proxy requests
 * to various AI providers while maintaining compatibility with the Claude API format.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { streamText, generateText } from 'ai';
import { ProviderService } from '@/lib/ai/provider-service';
import { createLanguageModel, PROVIDER_TYPES, getDefaultModel } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import { apiRequests, apiInteractions } from '@/lib/db/schema';

/**
 * Anthropic API message schema validation
 */
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.enum(['text', 'image']),
      text: z.string().optional(),
      source: z.object({
        type: z.literal('base64'),
        media_type: z.string(),
        data: z.string(),
      }).optional(),
    })),
  ]),
});

const AnthropicRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().min(1).max(100000),
  messages: z.array(MessageSchema),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop_sequences: z.array(z.string()).optional(),
  stream: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional(),
});

type AnthropicRequest = z.infer<typeof AnthropicRequestSchema>;

/**
 * Extract API key from request headers
 */
function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // Support both "Bearer <key>" and "x-api-key: <key>" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const apiKeyHeader = request.headers.get('x-api-key');
  return apiKeyHeader || null;
}

/**
 * Convert Anthropic format messages to AI SDK format
 */
function convertMessages(messages: AnthropicRequest['messages']) {
  return messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : 
      msg.content.map(part => part.type === 'text' ? part.text! : '[Image content]').join('\n')
  }));
}

/**
 * Create streaming response in Anthropic format
 */
async function createStreamingResponse(
  requestData: AnthropicRequest,
  languageModel: any,
  requestId: string,
  providerId: string
) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamText({
          model: languageModel,
          messages: convertMessages(requestData.messages),
          system: requestData.system,
          temperature: requestData.temperature,
          topP: requestData.top_p,
          maxTokens: requestData.max_tokens,
        });

        // Send initial event
        controller.enqueue(new TextEncoder().encode('event: message_start\n'));
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'message_start',
          message: {
            id: `msg_${requestId}`,
            type: 'message',
            role: 'assistant',
            content: [],
            model: requestData.model,
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 0, output_tokens: 0 }
          }
        })}\n\n`));

        let fullContent = '';
        for await (const textPart of result.textStream) {
          fullContent += textPart;
          
          controller.enqueue(new TextEncoder().encode('event: content_block_delta\n'));
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: textPart }
          })}\n\n`));
        }

        // Send final event
        controller.enqueue(new TextEncoder().encode('event: message_delta\n'));
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: result.usage?.totalTokens || 0 }
        })}\n\n`));

        controller.close();

        // Log interaction to database
        await db.insert(apiInteractions).values({
          requestId,
          providerId,
          model: requestData.model,
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
          requestData: requestData,
          responseData: { content: fullContent },
          processingTime: Date.now() - parseInt(requestId.split('_')[1]),
          success: true,
        });

      } catch (error) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'error',
          error: {
            type: 'api_error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Create non-streaming response in Anthropic format
 */
async function createNonStreamingResponse(
  requestData: AnthropicRequest,
  languageModel: any,
  requestId: string,
  providerId: string
) {
  const startTime = Date.now();
  
  try {
    const result = await generateText({
      model: languageModel,
      messages: convertMessages(requestData.messages),
      system: requestData.system,
      temperature: requestData.temperature,
      topP: requestData.top_p,
      maxTokens: requestData.max_tokens,
    });

    const response = {
      id: `msg_${requestId}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: result.text,
        },
      ],
      model: requestData.model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: result.usage?.promptTokens || 0,
        output_tokens: result.usage?.completionTokens || 0,
      },
    };

    // Log interaction to database
    await db.insert(apiInteractions).values({
      requestId,
      providerId,
      model: requestData.model,
      inputTokens: result.usage?.promptTokens || 0,
      outputTokens: result.usage?.completionTokens || 0,
      totalTokens: result.usage?.totalTokens || 0,
      requestData: requestData,
      responseData: response,
      processingTime: Date.now() - startTime,
      success: true,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    // Log failed interaction
    await db.insert(apiInteractions).values({
      requestId,
      providerId,
      model: requestData.model,
      requestData: requestData,
      processingTime: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * POST handler for Anthropic-compatible messages endpoint
 */
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Extract API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return new Response(JSON.stringify({
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Missing API key. Provide it in the Authorization header or x-api-key header.',
        },
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const requestData = AnthropicRequestSchema.parse(body);

    // Log API request
    const [apiRequestRecord] = await db.insert(apiRequests).values({
      method: 'POST',
      path: '/api/v1/messages',
      headers: Object.fromEntries(request.headers.entries()),
      body: requestData,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    }).returning();

    // Get provider service
    const providerService = new ProviderService();
    
    // For now, use the first available Anthropic provider or fallback to any provider
    let provider = await providerService.getDefaultProviderForType(PROVIDER_TYPES.ANTHROPIC);
    
    if (!provider) {
      // Fallback to any active provider
      const providers = await providerService.getActiveProviders();
      provider = providers[0] || null;
    }

    if (!provider) {
      return new Response(JSON.stringify({
        type: 'error',
        error: {
          type: 'api_error',
          message: 'No active AI providers configured.',
        },
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create language model
    const languageModel = createLanguageModel({
      name: provider.name,
      type: provider.type as any,
      baseUrl: provider.baseUrl || undefined,
      apiKey: provider.apiKey,
      isActive: provider.isActive,
      configuration: provider.configuration,
    }, requestData.model);

    // Handle streaming vs non-streaming
    if (requestData.stream) {
      return await createStreamingResponse(requestData, languageModel, requestId, provider.id);
    } else {
      return await createNonStreamingResponse(requestData, languageModel, requestId, provider.id);
    }

  } catch (error) {
    console.error('Error in messages endpoint:', error);

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'Invalid request format',
          details: error.errors,
        },
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      type: 'error',
      error: {
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * OPTIONS handler for CORS preflight requests
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
};