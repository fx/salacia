import { createLogger } from '../../../utils/logger';

const logger = createLogger('OllamaStreaming');

export interface OllamaStreamingOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Create a streaming response directly from Ollama OpenAI-compatible API
 * This bypasses the AI SDK to avoid streaming consumption issues
 */
export async function createOllamaStream(options: OllamaStreamingOptions): Promise<ReadableStream> {
  const { baseUrl, apiKey, model, messages, maxTokens, temperature, topP } = options;
  
  // Normalize base URL to include /v1
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const apiUrl = normalizedBaseUrl.endsWith('/v1') 
    ? `${normalizedBaseUrl}/chat/completions`
    : `${normalizedBaseUrl}/v1/chat/completions`;

  logger.debug('Creating Ollama stream', { apiUrl, model, messageCount: messages.length });

  const requestBody = {
    model,
    messages,
    stream: true,
    ...(maxTokens && { max_tokens: maxTokens }),
    ...(temperature !== undefined && { temperature }),
    ...(topP !== undefined && { top_p: topP }),
  };

  logger.debug('Making Ollama API request', { apiUrl, method: 'POST' });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  logger.debug('Ollama API response received', { 
    status: response.status, 
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    hasBody: !!response.body
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Ollama API error response', { status: response.status, statusText: response.statusText, body: errorText });
    throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from Ollama API');
  }

  logger.debug('Creating stream reader for Ollama response');

  return new ReadableStream({
    start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let chunkCount = 0;
      let bytesReceived = 0;
      
      const pump = async () => {
        try {
          logger.debug('Starting Ollama stream pump');
          while (true) {
            const { done, value } = await reader.read();
            chunkCount++;
            
            if (done) {
              logger.debug('Ollama stream completed', { chunkCount, bytesReceived });
              controller.close();
              break;
            }

            if (value) {
              bytesReceived += value.length;
              logger.debug(`Received chunk ${chunkCount}`, { 
                chunkSize: value.length, 
                totalBytes: bytesReceived,
                bufferLength: buffer.length
              });
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line

            logger.debug(`Processing ${lines.length} lines from chunk ${chunkCount}`);

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataContent = trimmed.slice(6); // Remove 'data: '
                
                if (dataContent === '[DONE]') {
                  logger.debug('Received [DONE] marker');
                  const finishChunk = {
                    type: 'finish',
                    usage: {
                      outputTokens: 0, // Ollama doesn't provide token counts
                    },
                  };
                  controller.enqueue(finishChunk);
                  controller.close();
                  return;
                }

                try {
                  const chunk = JSON.parse(dataContent);
                  logger.debug('Parsed Ollama chunk', { choices: chunk.choices?.length });
                  
                  // Extract text content from OpenAI format
                  if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    const delta = chunk.choices[0].delta;
                    if (delta.content) {
                      // Emit as text-delta chunk for our stream processing
                      const textChunk = {
                        type: 'text-delta',
                        text: delta.content,
                      };
                      logger.debug('Emitting text chunk', { text: delta.content });
                      controller.enqueue(textChunk);
                    }
                    
                    // Check for finish reason
                    if (chunk.choices[0].finish_reason) {
                      logger.debug('Received finish reason', { reason: chunk.choices[0].finish_reason });
                      const finishChunk = {
                        type: 'finish',
                        usage: {
                          outputTokens: 0, // Ollama doesn't provide token counts
                        },
                      };
                      controller.enqueue(finishChunk);
                      controller.close();
                      return;
                    }
                  }
                } catch (error) {
                  logger.warn('Failed to parse Ollama chunk:', { dataContent, error: error instanceof Error ? error.message : error });
                }
              } else if (trimmed && !trimmed.startsWith('event:')) {
                logger.debug('Unexpected line format', { line: trimmed });
              }
            }
          }
        } catch (error) {
          logger.error('Ollama stream error:', error);
          const errorChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream processing error',
          };
          controller.enqueue(errorChunk);
          controller.close();
        }
      };

      pump();
    },
  });
}